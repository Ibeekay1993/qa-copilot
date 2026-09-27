import type {Evaluation,InputMode,Message} from '../types/qa';

const criteria=[
 ['complete_correct_information','Complete / Correct Information & Solution',5,true,'yes',5],
 ['customer_service_etiquette','Customer Service Etiquette',5,true,'yes',5],
 ['resolution','Resolution',5,true,'yes',5],
 ['interaction_documentation','Interaction Documentation',5,true,'yes',5],
 ['customer_verification','Customer Verification',10,true,'na',0],
 ['opening_greeting','Opening Greeting',5,false,'5',5],
 ['closing_greeting','Closing Greeting',5,false,'5',5],
 ['professionalism','Professionalism',10,false,'10',10],
 ['query_understanding_investigation','Query Understanding & Investigation',20,false,'20',20],
 ['value_addition','Value Addition',10,false,'na',0],
 ['relationship_building','Relationship Building',20,false,'15',15]
] as const;

export function demoEvaluation(mode:InputMode,messages:Message[]):Evaluation{
 const mapped=criteria.map(([id,name,max,critical,answer,score])=>({
   id,name,maxScore:max,critical,answer,score,
   finding:'Demo result only. Connect the QA Copilot Supabase project to run the official scorecard.',
   evidence:messages.slice(0,2).map(m=>m.text),
   confidence:'low' as const,
   infractions:[]
 }));
 const applicable=mapped.filter(c=>c.answer!=='na');
 const raw=applicable.reduce((n,c)=>n+c.score,0);
 const max=applicable.reduce((n,c)=>n+c.maxScore,0);
 return {
   id:crypto.randomUUID(),inputMode:mode,messages,ticketId:'DEMO-001',
   issue:'Demo evaluation — not a production QA result.',
   outcome:'Connect the configured analysis function for a real evidence-based evaluation.',
   overallScore:max?Math.round(raw/max*100):0,status:'needs_review',aiScore:max?Math.round(raw/max*100):0,
   criticalErrors:[],coaching:['Connect the QA Copilot analysis service before using this result for QA decisions.'],
   positiveFeedback:[],impact:[],feedback:'Demo result only.',infractions:[],criteria:mapped,
   createdAt:new Date().toISOString()
 };
}
