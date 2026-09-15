export type InputMode = 'paste' | 'listen' | 'camera';
export type MessageRole = 'customer' | 'agent' | 'system' | 'unknown';
export interface Message { id:string; role:MessageRole; text:string; timestamp?:string; source?:string; }
export interface CriterionResult { id:string; name:string; score:number; maxScore:number; finding:string; evidence:string[]; policyReference?:string; confidence:'high'|'medium'|'low'; overridden?:boolean; overrideReason?:string; }
export interface Evaluation { id:string; inputMode:InputMode; ticketId?:string; agentName?:string; messages:Message[]; issue:string; outcome:string; overallScore:number; criteria:CriterionResult[]; criticalErrors:string[]; coaching:string[]; createdAt:string; }
