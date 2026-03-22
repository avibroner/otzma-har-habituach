import type { InsuranceRow, PersonIds, FieldOptions } from "./types";
import { readMapping } from "./mapping-store";

const API_BASE = "https://api.fireberry.com";
const API_BASE_OLD = "https://api.powerlink.co.il/api";

function getToken(): string {
  const token = process.env.FIREBERRY_TOKEN;
  if (!token) throw new Error("FIREBERRY_TOKEN is not set");
  return token;
}

async function apiRequest(path: string, options: RequestInit = {}, base = API_BASE_OLD): Promise<Response> {
  const token = getToken();
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      tokenid: token,
      ...options.headers,
    },
  });
}

async function query(objecttype: string, queryStr: string, pageSize = 500) {
  const res = await apiRequest("/query", {
    method: "POST",
    body: JSON.stringify({
      query: queryStr,
      fields: "*",
      objecttype,
      page_size: pageSize,
    }),
  });
  const json = await res.json();
  return json?.data?.Data || [];
}

// Fetch field option values from Fireberry metadata API
async function fetchFieldValues(fieldId: string): Promise<{ name: string; value: string }[]> {
  const res = await apiRequest(
    `/metadata/records/1005/fields/${fieldId}/values`,
    { method: "GET" },
    API_BASE
  );
  const json = await res.json();
  return json?.data?.values || [];
}

// Fetch secondary branch + buffer options from Fireberry
export async function fetchFieldOptions(): Promise<FieldOptions> {
  const [branchValues, bufferValues] = await Promise.all([
    fetchFieldValues("pcfsystemfield228"), // ענף משני
    fetchFieldValues("pcfsystemfield229"), // חוצץ
  ]);

  // name → value lookup
  const branchMap: Record<string, string> = {};
  for (const item of branchValues) {
    branchMap[item.name] = item.value;
  }

  const bufferMap: Record<string, string> = {};
  for (const item of bufferValues) {
    bufferMap[item.name] = item.value;
  }

  return { branchMap, bufferMap };
}

export async function searchPerson(idNumber: string): Promise<PersonIds | null> {
  // Try with and without leading zeros
  const idVariants = [idNumber];
  const stripped = idNumber.replace(/^0+/, "");
  if (stripped !== idNumber) idVariants.push(stripped);
  const padded = idNumber.padStart(9, "0");
  if (padded !== idNumber) idVariants.push(padded);

  // Search as insured (contacts - objecttype 2)
  let insuredResults: Record<string, string>[] = [];
  for (const id of idVariants) {
    insuredResults = await query("2", `(pcfsystemfield127 = ${id})`);
    if (insuredResults.length > 0) break;
  }

  if (insuredResults.length > 0) {
    return {
      insuredId: insuredResults[0].contactid,
      clientId: insuredResults[0].accountid,
      leadId: insuredResults[0].pcfsystemfield219 || "",
      personType: "insured",
    };
  }

  // Search as lead (objecttype 1003)
  let leadResults: Record<string, string>[] = [];
  for (const id of idVariants) {
    leadResults = await query("1003", `(pcfsystemfield101 = ${id})`);
    if (leadResults.length > 0) break;
  }

  if (leadResults.length > 0) {
    return {
      insuredId: leadResults[0].contactid || "",
      clientId: leadResults[0].accountid || "",
      leadId: leadResults[0].customobject1003id,
      personType: "lead",
    };
  }

  return null;
}

export async function createInsuranceRecord(
  row: InsuranceRow,
  person: PersonIds,
  fieldOptions: FieldOptions,
  bufferMapping: Record<string, string>
): Promise<{ warning?: string }> {
  // Look up secondary branch ID from Fireberry options
  const branchId = fieldOptions.branchMap[row.secondaryBranch] || "";
  // Look up buffer from admin-managed mapping
  const bufferId = bufferMapping[row.secondaryBranch] || "";

  let warning: string | undefined;
  if (row.secondaryBranch && !branchId) {
    warning = `ענף משני "${row.secondaryBranch}" לא נמצא בפיירברי`;
  } else if (row.secondaryBranch && !bufferId) {
    warning = `ענף משני "${row.secondaryBranch}" לא ממופה לחוצץ`;
  }

  const payload: Record<string, string | number> = {
    pcfsystemfield139: person.insuredId, // מבוטח
    pcfsystemfield164: person.clientId, // לקוח אב
    pcfsystemfield223: person.leadId, // ליד
    pcfsystemfield142: row.mainBranch, // ענף ראשי
    pcfsystemfield229: bufferId, // חוצץ
    pcfsystemfield228: branchId, // ענף משני
    pcfsystemfield148: row.productType, // סוג מוצר
    pcfsystemfield146: row.insuranceCompany, // חברת ביטוח
    pcfsystemfield156: row.premium, // פרמיה
    pcfsystemfield154: row.premiumType, // סוג פרמיה
    pcfsystemfield160: row.policyNumber, // מספר פוליסה
    pcfsystemfield158: row.planClassification, // סיווג תוכנית
    pcfsystemfield162: "", // הערות
    pcfsystemfield227: row.sector, // תחום ביטוח
    pcfsystemfield281: row.periodText, // תקופה טקסט
  };

  if (row.periodStart) {
    payload.pcfsystemfield267 = row.periodStart;
  }
  if (row.periodEnd) {
    payload.pcfsystemfield269 = row.periodEnd;
  }

  const res = await apiRequest("/record/1005", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create record: ${res.status} ${text}`);
  }

  return { warning };
}

export async function sendWebhook(
  personType: "insured" | "lead",
  personId: string
): Promise<void> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const tape = personType === "insured" ? "Insured" : "lead";
  const url = `${webhookUrl}?tape=${tape}&id=${personId}`;

  await fetch(url, { method: "POST" });
}

