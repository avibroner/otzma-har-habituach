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

// Fix sheets where the declared dimension is smaller than the actual data.
// הר הביטוח files declare dimension="A2:K5" but have data rows beyond that.
function fixSheetRange(sheet: XLSX.WorkSheet): void {
  let maxRow = 0;
  let maxCol = 0;
  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!")) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r > maxRow) maxRow = cell.r;
    if (cell.c > maxCol) maxCol = cell.c;
  }
  sheet["!ref"] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: maxRow, c: maxCol }
  );
}

export function parseExcel(buffer: ArrayBuffer, filename: string): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Fix wrong dimension declaration in הר הביטוח files
  fixSheetRange(sheet);

  const data: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  let idNumber: string | null = null;
  let currentSector = 1;
  const rows: InsuranceRow[] = [];

  // Find header row dynamically (row containing "תעודת זהות")
  let dataStartIndex = 4; // default
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const firstCell = String(data[i]?.[0] || "").trim();
    if (firstCell === "תעודת זהות") {
      dataStartIndex = i + 1;
      break;
    }
  }

  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const colA = String(row[0] || "").trim(); // תעודת זהות
    const colB = String(row[1] || "").trim(); // ענף ראשי
    const colJ = String(row[9] || "").trim(); // מספר פוליסה

    // Extract ID from any row that has column A with digits
    if (!idNumber && colA && /^\d+$/.test(colA)) {
      idNumber = colA;
    }

    // Sector header row: col B has "תחום -", col J empty
    if (colB.startsWith("תחום -") && !colJ) {
      const sectorValue = SECTOR_MAP[colB];
      if (sectorValue) {
        currentSector = sectorValue;
      }
      continue;
    }

    // Insurance data row: col J (policy number) not empty
    if (colJ) {
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

  if (!idNumber) {
    throw new Error("לא נמצאה תעודת זהות בקובץ. וודא שעמודה A מכילה מספר ת.ז.");
  }

  return { idNumber, rows };
}
