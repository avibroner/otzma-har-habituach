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
  step: "parsing" | "searching" | "deleting" | "creating" | "webhook" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
}

export interface ProcessResult {
  success: boolean;
  idNumber: string;
  personType: "insured" | "lead" | "not_found";
  totalRows: number;
  deletedCount: number;
  createdCount: number;
  errors: string[];
}
