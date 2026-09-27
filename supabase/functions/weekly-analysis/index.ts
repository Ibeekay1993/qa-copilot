import {cors,json} from '../_shared/cors.ts';

const MODEL=Deno.env.get('OPENAI_QA_MODEL')||'gpt-5.6-luna';
const INFRACTIONS=[
  'Lack of Empathy','Lack of Ownership',"Poor Attention to Detail (Missing Key Information from Customer's Complaint, Inquiry, or Request)",
  'Inadequate Information Provided to the Customer','Grammatical Errors (Spelling, Capitalization, Punctuation, Proofreading, and Spacing)',
  'Poor Customer Service Etiquette','Delayed First Response Time (FRT) / First Contact Resolution (FCR)',
  'Unwillingness to Assist the Customer','Knowledge Gap (wrong information or no information provided)',
  'Non-Adherence to Process (Moniedesk Documentation, Escalation Failures, Incorrect or Missing Contact Reason)',
  'Breach of Confidentiality','Miscategorization',
  'Non-Adherence to Communication Standards (Opening Script, Closing Script, and Personalization Requirements)'
];

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
   const auth=req.headers.get('Authorization');
   if(!auth)return json({error:'Authorization required'},401);
   const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   const supabaseUrl=Deno.env.get('SUPABASE_URL');
   const openaiKey=Deno.env.get('OPENAI_API_KEY');
   if(!serviceKey||!supabaseUrl||!openaiKey)return json({error:'Required server configuration is missing'},500);

   const token=auth.replace(/^Bearer\s+/i,'');
   const me=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:serviceKey}});
   if(!me.ok)return json({error:'Invalid session'},401);
   const user=await me.json();

   const start=new Date(Date.now()-7*24*60*60*1000).toISOString();
   const rows=await fetch(`${supabaseUrl}/rest/v1/qa_evaluations?user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(start)}&select=id,created_at,overall_ai_score,ai_status,positive_feedback,impact,recommendation,infractions,feedback`,{
     headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}
   });
   if(!rows.ok)return json({error:'Could not load weekly evaluations'},500);
   const evaluations=await rows.json();

   const counts=new Map<string,number>();
   for(const e of evaluations){
     for(const inf of (Array.isArray(e.infractions)?e.infractions:[])){
       if(INFRACTIONS.includes(inf))counts.set(inf,(counts.get(inf)||0)+1);
     }
   }
   const trendingInfractions=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
   if(evaluations.length===0)return json({periodStart:start,totalEvaluations:0,trendingInfractions, trendingIssues:[],teamRecommendations:[]});

   const compact=evaluations.map((e:{created_at:string,overall_ai_score:number,ai_status:string,positive_feedback:string[],impact:string[],recommendation:string[],infractions:string[],feedback:string})=>({
     date:e.created_at,score:e.overall_ai_score,status:e.ai_status,positiveFeedback:e.positive_feedback,
     impact:e.impact,recommendation:e.recommendation,infractions:e.infractions,feedback:e.feedback
   }));
   const r=await fetch('https://api.openai.com/v1/responses',{
     method:'POST',headers:{Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'},
     body:JSON.stringify({
       model:MODEL,
       instructions:'You are a QA weekly trend analyst. Use only the supplied evaluation records. Do not invent infractions or scores. Identify recurring performance themes and give actionable team coaching recommendations. Do not rank individual agents.',
       input:[{role:'user',content:[{type:'input_text',text:`Weekly evaluation records from the last 7 days:\n${JSON.stringify(compact)}\n\nOfficial infractions:\n${JSON.stringify(INFRACTIONS)}`}]}],
       text:{format:{type:'json_schema',name:'weekly_qa_analysis',strict:true,schema:{
         type:'object',additionalProperties:false,
         properties:{
           trendingIssues:{type:'array',items:{type:'object',additionalProperties:false,properties:{issue:{type:'string'},frequency:{type:'number'},evidence:{type:'array',items:{type:'string'}}},required:['issue','frequency','evidence']}},
           teamRecommendations:{type:'array',items:{type:'string'}}
         },
         required:['trendingIssues','teamRecommendations']
       }}}
     })
   });
   const raw=await r.text();
   if(!r.ok)return json({error:'AI provider error',detail:raw.slice(0,1000)},502);
   const parsed=JSON.parse(raw);
   const result=JSON.parse(parsed.output_text);
   return json({periodStart:start,totalEvaluations:evaluations.length,trendingInfractions,trendingIssues:result.trendingIssues,teamRecommendations:result.teamRecommendations});
 }catch(e){return json({error:e instanceof Error?e.message:'Unknown error'},500)}
});
