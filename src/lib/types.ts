export interface InsuranceRow {
  mainBranch: string;
  secondaryBranch: string;
  productType: string;
  insuranceCompany: string;
  periodText: string;
  periodStart: string | null;
  periodEnd: string | null;
  premium: string;
  premiumType: string;
  policyNumber: string;
  planClassification: string;
  sector: number;
  idNumber: string;
}

export interface ParsedExcel {
  idNumber: string;
  rows: InsuranceRow[];
}

export interface PersonIds {
  insuredId: string;
  clientId: string;
  leadId: string;
  personType: "insured" | "lead";
}

export interface ProgressUpdate {
  step: "parsing" | "searching" | "loading_options" | "creating" | "webhook" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
}

export interface ProcessResult {
  success: boolean;
  idNumber: string;
  personType: "insured" | "lead" | "not_found";
  totalRows: number;
  createdCount: number;
  errors: string[];
  warnings: string[];
}

export interface FieldOptions {
  branchMap: Record<string, string>; // secondary branch name → Fireberry value ID
  bufferMap: Record<string, string>; // buffer name → Fireberry value ID
}

export interface UploadLogEntry {
  uploaderName: string;
  uploaderEmail: string;
  fileName: string;
  timestamp: string;
  idNumber: string;
  personType: "insured" | "lead" | "not_found";
  totalRows: number;
  createdCount: number;
  errorsCount: number;
  warningsCount: number;
  unmappedBranches: string[];
}

