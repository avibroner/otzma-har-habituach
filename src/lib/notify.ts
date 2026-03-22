import type { InsuranceRow } from "./types";

interface UnmappedRecord {
  rowNumber: number;
  secondaryBranch: string;
  mainBranch: string;
  productType: string;
  insuranceCompany: string;
  policyNumber: string;
  premium: string;
  periodText: string;
}

// Send email alert via Make.com webhook when unmapped branches are found
export async function notifyUnmappedBranches(
  unmappedRecords: UnmappedRecord[],
  idNumber: string,
  personType: "insured" | "lead",
  totalRows: number,
  createdCount: number
): Promise<void> {
  const webhookUrl = process.env.MAKE_ALERT_WEBHOOK_URL;
  if (!webhookUrl || unmappedRecords.length === 0) return;

  const branchNames = [...new Set(unmappedRecords.map((r) => r.secondaryBranch))];

  const recordDetails = unmappedRecords
    .map(
      (r) =>
        `שורה ${r.rowNumber}: ענף "${r.secondaryBranch}" | ענף ראשי: ${r.mainBranch} | מוצר: ${r.productType} | חברה: ${r.insuranceCompany} | פוליסה: ${r.policyNumber} | פרמיה: ${r.premium} | תקופה: ${r.periodText}`
    )
    .join("\n");

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "unmapped_branch",
        idNumber,
        personType,
        personTypeHeb: personType === "insured" ? "מבוטח" : "ליד",
        unmappedBranches: branchNames,
        unmappedCount: unmappedRecords.length,
        records: unmappedRecords,
        totalRows,
        createdCount,
        timestamp: new Date().toISOString(),
        subject: `התראה: ${unmappedRecords.length} רשומות ללא מיפוי חוצץ — ת.ז. ${idNumber}`,
        message: `בטעינת הר הביטוח עבור ת.ז. ${idNumber} (${personType === "insured" ? "מבוטח" : "ליד"}) נוצרו ${unmappedRecords.length} רשומות ללא מיפוי חוצץ:\n\n${recordDetails}\n\nסה"כ נטענו ${createdCount} מתוך ${totalRows} שורות.\n\nהרשומות נוצרו עם שדות ענף משני וחוצץ ריקים — יש לעדכן את המיפוי בדף ההגדרות ולתקן את הרשומות בפיירברי.`,
      }),
    });
  } catch {
    // Alert is best-effort — don't block the process
  }
}

export function buildUnmappedRecord(
  row: InsuranceRow,
  rowNumber: number
): UnmappedRecord {
  return {
    rowNumber,
    secondaryBranch: row.secondaryBranch,
    mainBranch: row.mainBranch,
    productType: row.productType,
    insuranceCompany: row.insuranceCompany,
    policyNumber: row.policyNumber,
    premium: row.premium,
    periodText: row.periodText,
  };
}
