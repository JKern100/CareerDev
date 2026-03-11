export type QuestionType =
  | "single_select"
  | "multi_select"
  | "likert_1_5"
  | "slider_0_10"
  | "numeric"
  | "text_short"
  | "text_long"
  | "date"
  | "file_upload";

export interface Question {
  id: string;
  module: string;
  moduleName: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  routeIf?: Record<string, string>;
  tags?: string[];
}

export interface Answer {
  questionId: string;
  value: string | string[] | number;
  confidence: number; // 0-100
  evidence?: string;
}

export interface Pathway {
  id: string;
  name: string;
  description: string;
  typicalRoles: string[];
  salaryBands: SalaryBand[];
  prerequisites: string[];
  recommendedCredentials: string[];
  skillSignals: string[];
  volatility: number; // 0-1 scale for risk fit
}

export interface SalaryBand {
  role: string;
  minAED: number;
  maxAED: number;
  source: string;
}

export interface PathwayScore {
  pathwayId: string;
  rawScore: number;
  adjustedScore: number;
  interestFit: number;
  skillFit: number;
  environmentFit: number;
  feasibility: number;
  compensationFit: number;
  riskFit: number;
  confidenceFactor: number;
  topSignals: string[];
  risks: string[];
  gateFlags: string[];
}

export interface UserProfile {
  answers: Record<string, Answer>;
  consentGiven: boolean;
  anonymizedDataConsent: boolean;
  language: string;
  communicationStyle: string;
}

export interface Report {
  id: string;
  generatedAt: string;
  topPathways: PathwayScore[];
  userProfile: UserProfile;
}
