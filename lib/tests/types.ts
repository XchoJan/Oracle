import type { SurveyQuestion } from "@/lib/questions";

export type TestId =
  | "free_health"
  | "free_money"
  | "free_relationships"
  | "paid_map24"
  | "paid_stress"
  | "paid_career"
  | "paid_relations";

export type TestTier = "free" | "paid";

export type SurveyBlock = {
  title: string;
  from: number;
  to: number;
};

export type ReportSpec = {
  minSections: number;
  maxSections: number;
  recsPerSection: number;
  jsonInstruction: string;
};

export type TestDefinition = {
  id: TestId;
  tier: TestTier;
  title: string;
  tagline: string;
  durationHint: string;
  priceStars: number;
  introLine: string;
  resultTitle: string;
  questions: SurveyQuestion[];
  blocks: SurveyBlock[];
  report: ReportSpec;
  invoiceTitle: string;
  invoiceDescription: string;
};
