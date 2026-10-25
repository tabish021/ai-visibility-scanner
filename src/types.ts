export type CheckCategory = 'SEO' | 'GEO' | 'AEO';
export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckItem {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  detail: string;
  fixTip?: string;
  fixCode?: string;
}

export interface CategorySummary {
  checks: CheckItem[];
  score: number;
  maxScore: number;
}

export interface ScanResult {
  url: string;
  domain: string;
  scannedAt: string;
  score: number;
  grade: string;
  gradeDescription: string;
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
  };
  categories: {
    seo: CategorySummary;
    geo: CategorySummary;
    aeo: CategorySummary;
  };
  checks: CheckItem[];
  metadata: {
    title: string;
    description: string;
    wordCount: number;
    headingsCount: { h1: number; h2: number };
    imagesCount: { total: number; withAlt: number };
    linksCount: { total: number; tested: number; broken: number };
    hasSchema: boolean;
    hasRobots: boolean;
    hasLlmsTxt: boolean;
  };
}
