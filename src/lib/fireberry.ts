import type { InsuranceRow, PersonIds } from "./types";
import { getSecondaryBranch } from "./branch-mapping";

const API_BASE = "https://api.powerlink.co.il/api";

function getToken(): string {
  const token = process.env.FIREBERRY_TOKEN;
  if (!token) throw new Error("FIREBERRY_TOKEN is not set");
  return token;
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
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

export async function deleteInsuranceMountain(
  person: PersonIds
): Promise<number> {
  let queryStr: string;

  if (person.personType === "insured") {
    queryStr = `(pcfsystemfield139 = ${person.insuredId})`;
  } else {
    queryStr = `(pcfsystemfield223 = ${person.leadId})`;
  }

  const records = await query("1005", queryStr);
  const ids: string[] = records.map((r: Record<string, string>) => r.customobject1005id);

  for (const id of ids) {
    await apiRequest(`/record/1005/${id}`, { method: "DELETE" });
  }

  return ids.length;
}

export async function createInsuranceRecord(
  row: InsuranceRow,
  person: PersonIds
): Promise<void> {
  const branch = getSecondaryBranch(row.secondaryBranch);

  const payload: Record<string, string | number> = {
    pcfsystemfield139: person.insuredId, // מבוטח
    pcfsystemfield164: person.clientId, // לקוח אב
    pcfsystemfield223: person.leadId, // ליד
    pcfsystemfield142: row.mainBranch, // ענף ראשי
    pcfsystemfield229: branch?.bufferId || "", // חוצץ
    pcfsystemfield228: branch?.branchId || "", // ענף משני
    pcfsystemfield148: row.productType, // סוג מוצר
    pcfsystemfield146: row.insuranceCompany, // חברת ביטוח
    pcfsystemfield156: row.premium, // פרמיה
    pcfsystemfield154: row.premiumType, // סוג פרמיה
    pcfsystemfield160: row.policyNumber, // מספר פוליסה
    pcfsystemfield158: row.planClassification, // סיווג תוכנית
    pcfsystemfield162: "", // הערות (לא קיים בקובץ Excel)
    pcfsystemfield227: row.sector, // תחום ביטוח
    pcfsystemfield281: row.periodText, // תקופה טקסט
  };

  if (row.periodStart) {
    payload.pcfsystemfield267 = row.periodStart; // תחילת תקופה
  }
  if (row.periodEnd) {
    payload.pcfsystemfield269 = row.periodEnd; // סוף תקופה
  }

  const res = await apiRequest("/record/1005", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create record: ${res.status} ${text}`);
  }
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
