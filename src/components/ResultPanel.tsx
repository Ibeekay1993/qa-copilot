import type {Evaluation} from '../types/qa';
export function ResultPanel({evaluation}:{evaluation:Evaluation}){
 const ko=evaluation.status==='ko';
 return <section className="result">
  <div className="workspace-head"><div><span className="eyebrow">{ko?'Critical Error Knockout':'Evaluation ready'}</span><h3>{evaluation.ticketId||'Conversation review'}</h3></div><div className={ko?'score ko':'score'}>{evaluation.overallScore}<small>/100</small></div></div>
  {ko&&<div className="card warning"><strong>Final score: 0 — Critical Error Knockout</strong>{evaluation.criticalErrors.map(e=><div className="evidence" key={e}>{e}</div>)}</div>}
  <p className="muted">{evaluation.issue}</p>
  {evaluation.positiveFeedback&&<article className="card"><strong>Positive Feedback</strong>{evaluation.positiveFeedback.map(x=><div className="evidence" key={x}>• {x}</div>)}</article>}
  <div className="grid">{evaluation.criteria.map(c=><article className="card" key={c.id}>
   <strong>{c.name}<span style={{float:'right'}}>{c.answer.toUpperCase()==='NA'?'N/A':`${c.score}/${c.maxScore}`}</span></strong>
   <div className="bar"><i style={{width:`${c.maxScore?c.score/c.maxScore*100:0}%`}}/></div>
   <div className="evidence">{c.finding}</div>
   {c.evidence.length>0&&<div className="evidence"><b>Evidence:</b> {c.evidence.join(' | ')}</div>}
   {c.infractions?.length>0&&<div className="evidence"><b>Infractions:</b> {c.infractions.join(' · ')}</div>}
  </article>)}</div>
  {evaluation.impact&&<article className="card" style={{marginTop:12}}><strong>Impact</strong>{evaluation.impact.map(x=><div className="evidence" key={x}>• {x}</div>)}</article>}
  {(evaluation.feedback||evaluation.coaching.length>0)&&<article className="card" style={{marginTop:12}}><strong>Recommendation / Feedback</strong><div className="evidence">{evaluation.feedback||evaluation.coaching.join(' ')}</div></article>}
  {evaluation.infractions&&evaluation.infractions.length>0&&<article className="card" style={{marginTop:12}}><strong>Infractions Identified</strong>{evaluation.infractions.map(x=><div className="evidence" key={x}>• {x}</div>)}</article>}
 </section>
}