import * as XLSX from "xlsx";
import type { InsuranceRow, ParsedExcel } from "./types";

const SECTOR_MAP: Record<string, number> = {
  "תחום - כללי": 1,
  "תחום - בריאות ותאונות אישיות": 2,
  "תחום - חיים ואבדן כושר עבודה": 3,
};

function extractIdFromFilename(filename: string): string | null {
  const match = filename.match(/data-(\d+)/);
  return match ? match[1] : null;
}

function parsePeriod(periodText: string): { start: string | null; end: string | null } {
  if (!periodText || !periodText.includes("-")) {
    return { start: null, end: null };
  }

  const parts = periodText.split(" - ");
  if (parts.length !== 2) return { start: null, end: null };

  try {
    const startParts = parts[0].trim().split("/");
    const endParts = parts[1].trim().split("/");

    if (startParts.length !== 3 || endParts.length !== 3) {
      return { start: null, end: null };
    }

    const startDate = new Date(
      parseInt(startParts[2]),
      parseInt(startParts[1]) - 1,
      parseInt(startParts[0])
    );
    const endDate = new Date(
      parseInt(endParts[2]),
      parseInt(endParts[1]) - 1,
      parseInt(endParts[0])
    );

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}T12:00:00.000Z`;
    };

    return { start: formatDate(startDate), end: formatDate(endDate) };
  } catch {
    return { start: null, end: null };
  }
}

export function parseExcel(buffer: ArrayBuffer, filename: string): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // Extract ID from column A of first data row, or from filename
  let idNumber: string | null = null;
  let currentSector = 1;
  const rows: InsuranceRow[] = [];

  // Data starts from row 3 (index 3)
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const colA = String(row[0] || "").trim(); // תעודת זהות
    const colB = String(row[1] || "").trim(); // ענף ראשי
    const colJ = String(row[9] || "").trim(); // מספר פוליסה

    // Sector header row: col A empty, col B has "תחום -", col J empty
    if (!colA && colB.startsWith("תחום -") && !colJ) {
      const sectorValue = SECTOR_MAP[colB];
      if (sectorValue) {
        currentSector = sectorValue;
      }
      continue;
    }

    // Insurance data row: col J (policy number) not empty
    if (colJ) {
      // Extract ID from first data row
      if (!idNumber && colA) {
        idNumber = colA;
      }

      const periodText = String(row[5] || "");
      const { start, end } = parsePeriod(periodText);

      rows.push({
        mainBranch: colB,
        secondaryBranch: String(row[2] || "").trim(),
        productType: String(row[3] || "").trim(),
        insuranceCompany: String(row[4] || "").trim(),
        periodText: periodText,
        periodStart: start,
        periodEnd: end,
        premium: String(row[7] || "").trim(),
        premiumType: String(row[8] || "").trim(),
        policyNumber: colJ,
        planClassification: String(row[10] || "").trim(),
        sector: currentSector,
      });
    }
  }

  // Fallback: extract ID from filename
  if (!idNumber) {
    idNumber = extractIdFromFilename(filename) || "";
  }

  if (!idNumber) {
    throw new Error("לא נמצאה תעודת זהות בקובץ");
  }

  return { idNumber, rows };
}
