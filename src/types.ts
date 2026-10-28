export type CheckCategory = "A" | "B" | "C";
export type CheckStatus = "pass" | "warn" | "fail" | "info" | "N/A";

export interface CheckItem {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  weight: number;
  found: string;
  why: string;
  fix: string;
  price?: number;
}

export interface CategorySummary {
  name: string;
  score: number;
}

export interface QuoteData {
  setup_fee: number;
  subtotal: number;
  quoted_items: string[];
  total_fixed: number;
}

export interface ScanResult {
  scanner_version: string;
  scanned_at: string;
  input_url: string;
  final_url: string;
  is_local_business: boolean;
  overall: {
    score: number;
    label: string;
    capped: boolean;
    disclaimer: string;
  };
  categories: {
    A: CategorySummary;
    B: CategorySummary;
    C: CategorySummary;
  };
  checks: CheckItem[];
  info: { id: string; name: string; present: boolean; note: string }[];
  quote: QuoteData;
}
