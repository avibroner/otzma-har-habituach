import type { InsuranceRow } from "./types";

interface UnmappedRecord {
  rowNumber: number;
  secondaryBranch: string;
  mainBranch: string;
  productType: string;
  insuranceCompany: string;
  policyNumber: string;
  premium: string;
  premiumType: string;
  periodText: string;
  planClassification: string;
}

function buildHtmlEmail(
  unmappedRecords: UnmappedRecord[],
  idNumber: string,
  personType: "insured" | "lead",
  totalRows: number,
  createdCount: number
): string {
  const personTypeHeb = personType === "insured" ? "מבוטח" : "ליד";
  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  const tableRows = unmappedRecords
    .map(
      (r) => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.rowNumber}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:#dc2626">${r.secondaryBranch}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.mainBranch}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.productType}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.insuranceCompany}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.policyNumber}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.premium}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.premiumType}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.planClassification}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.periodText}</td>
      </tr>`
    )
    .join("");

  const branchNames = [...new Set(unmappedRecords.map((r) => r.secondaryBranch))];

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;direction:rtl">
  <div style="max-width:900px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#dc2626;padding:20px 30px">
      <h1 style="margin:0;color:#ffffff;font-size:20px">התראה: רשומות ללא מיפוי חוצץ</h1>
    </div>

    <!-- Summary -->
    <div style="padding:24px 30px;border-bottom:1px solid #e5e7eb">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 0"><strong>ת.ז.:</strong> ${idNumber}</td>
          <td style="padding:4px 0"><strong>סוג:</strong> ${personTypeHeb}</td>
        </tr>
        <tr>
          <td style="padding:4px 0"><strong>סה"כ שורות בקובץ:</strong> ${totalRows}</td>
          <td style="padding:4px 0"><strong>רשומות שנוצרו:</strong> ${createdCount}</td>
        </tr>
        <tr>
          <td style="padding:4px 0"><strong>רשומות ללא מיפוי:</strong> <span style="color:#dc2626;font-weight:bold">${unmappedRecords.length}</span></td>
          <td style="padding:4px 0"><strong>תאריך:</strong> ${now}</td>
        </tr>
      </table>

      <div style="margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
        <strong style="color:#dc2626">ענפים לא ממופים:</strong>
        <span style="color:#991b1b"> ${branchNames.join(" | ")}</span>
      </div>
    </div>

    <!-- Records table -->
    <div style="padding:24px 30px">
      <h3 style="margin:0 0 12px;color:#374151">פרטי הרשומות שנוצרו ללא מיפוי:</h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">שורה</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">ענף משני</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">ענף ראשי</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">סוג מוצר</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">חברה</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">מס׳ פוליסה</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">פרמיה</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">סוג פרמיה</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">סיווג</th>
              <th style="padding:10px 8px;border:1px solid #e5e7eb;text-align:right;white-space:nowrap">תקופה</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        יש לעדכן את המיפוי בדף ההגדרות של מערכת הר הביטוח ולתקן את הרשומות בפיירברי.
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

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
  const htmlBody = buildHtmlEmail(unmappedRecords, idNumber, personType, totalRows, createdCount);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "Bnayaz@otzma-ins.co.il",
        subject: `התראה: ${unmappedRecords.length} רשומות ללא מיפוי חוצץ — ת.ז. ${idNumber}`,
        htmlBody,
        idNumber,
        personType,
        unmappedBranches: branchNames,
        unmappedCount: unmappedRecords.length,
        records: unmappedRecords,
        totalRows,
        createdCount,
      }),
    });
  } catch {
    // Alert is best-effort
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
    premiumType: row.premiumType,
    periodText: row.periodText,
    planClassification: row.planClassification,
  };
}
