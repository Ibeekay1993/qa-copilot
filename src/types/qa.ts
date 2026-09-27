export type InputMode = 'paste' | 'listen' | 'camera';
export type MessageRole = 'customer' | 'agent' | 'system' | 'unknown';
export type CriticalAnswer = 'yes' | 'no' | 'na';
export type ScoreAnswer = '1' | '3' | '5' | '10' | '15' | '20' | 'na';
export type EvaluationStatus = 'pass' | 'ko' | 'needs_review';

export const OFFICIAL_INFRACTIONS = [
  'Lack of Empathy',
  'Lack of Ownership',
  "Poor Attention to Detail (Missing Key Information from Customer's Complaint, Inquiry, or Request)",
  'Inadequate Information Provided to the Customer',
  'Grammatical Errors (Spelling, Capitalization, Punctuation, Proofreading, and Spacing)',
  'Poor Customer Service Etiquette',
  'Delayed First Response Time (FRT) / First Contact Resolution (FCR)',
  'Unwillingness to Assist the Customer',
  'Knowledge Gap (wrong information or no information provided)',
  'Non-Adherence to Process (Moniedesk Documentation, Escalation Failures, Incorrect or Missing Contact Reason)',
  'Breach of Confidentiality',
  'Miscategorization',
  'Non-Adherence to Communication Standards (Opening Script, Closing Script, and Personalization Requirements)'
] as const;

export interface Message {
  id:string;
  role:MessageRole;
  text:string;
  timestamp?:string;
  source?:string;
}

export interface CriterionResult {
  id:string;
  name:string;
  score:number;
  maxScore:number;
  answer:CriticalAnswer | ScoreAnswer;
  critical:boolean;
  finding:string;
  evidence:string[];
  policyReference?:string;
  confidence:'high'|'medium'|'low';
  infractions?:string[];
  finalScore?:number;\n  overridden?:boolean;
  overrideReason?:string;
}

export interface Evaluation {
  id:string;
  inputMode:InputMode;
  ticketId?:string;
  agentName?:string;
  messages:Message[];
  issue:string;
  outcome:string;
  overallScore:number;
  aiScore?:number;
  finalScore?:number;
  status:EvaluationStatus;
  criteria:CriterionResult[];
  criticalErrors:string[];
  coaching:string[];
  positiveFeedback?:string[];
  impact?:string[];
  feedback?:string;
  infractions?:string[];
  createdAt:string;
}
