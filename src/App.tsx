import {useEffect,useRef,useState} from 'react';
import {ClipboardPaste,Mic,Camera,ShieldCheck,StopCircle,RotateCcw,LoaderCircle,Pause,Play} from 'lucide-react';
import {frameToDataUrl,startCamera,stopMedia,startAudioRecorder,isNearDuplicate} from './lib/capture';
import {demoEvaluation} from './lib/mockEvaluation';
import {supabase} from './lib/supabase';
import type {Evaluation,InputMode,Message} from './types/qa';
import {ResultPanel} from './components/ResultPanel';
import './index.css';

const modes:[InputMode,string,string,typeof ClipboardPaste][]= [
 ['paste','Paste','Paste a conversation or ticket transcript.',ClipboardPaste],
 ['listen','Listen','Record the full voice call with no artificial time limit.',Mic],
 ['camera','Camera','Capture the interaction screen as you scroll.',Camera]
];

function parseText(text:string):Message[]{
 return text.split(/\n+/).map((line,i)=>{
   const m=line.match(/^\s*(customer|agent|system)\s*:\s*(.*)$/i);
   return {id:String(i),role:(m?.[1]?.toLowerCase() as Message['role'])||'unknown',text:m?.[2]||line.trim()};
 }).filter(m=>m.text);
}

async function aiAnalyse(messages:Message[],images:string[]=[],mode:InputMode='paste'){
 if(!supabase)return null;
 const {data,error}=await supabase.functions.invoke('analyze',{body:{messages,images,policy:'',inputMode:mode}});
 if(error)throw error;
 return {...data,id:crypto.randomUUID(),inputMode:mode,messages,createdAt:new Date().toISOString()} as Evaluation;
}

async function persistEvaluation(evaluation:Evaluation){
 if(!supabase)return;
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return;
 const {error}=await supabase.from('qa_evaluations').upsert({
   id:evaluation.id,user_id:user.id,input_mode:evaluation.inputMode,ticket_id:evaluation.ticketId||null,
   agent_name:evaluation.agentName||null,issue:evaluation.issue,outcome:evaluation.outcome,
   overall_ai_score:evaluation.aiScore??evaluation.overallScore,overall_final_score:evaluation.finalScore??null,
   status:'draft',ai_status:evaluation.status,applicable_score:(evaluation as any).applicableScore??null,
   applicable_max_score:(evaluation as any).applicableMaxScore??null,positive_feedback:evaluation.positiveFeedback||[],
   impact:evaluation.impact||[],recommendation:evaluation.coaching||[],infractions:evaluation.infractions||[],
   feedback:evaluation.feedback||null,scorecard_version:(evaluation as any).scorecardVersion||'2026-09'
 });
 if(error)throw error;
 await supabase.from('qa_criteria_results').delete().eq('evaluation_id',evaluation.id);
 const {error:criteriaError}=await supabase.from('qa_criteria_results').insert(evaluation.criteria.map(c=>({
   evaluation_id:evaluation.id,criterion_key:c.id,criterion_name:c.name,ai_score:c.score,final_score:c.finalScore??null,
   max_score:c.maxScore,finding:c.finding,evidence:c.evidence,policy_reference:c.policyReference||null,
   confidence:c.confidence,answer:c.answer,critical:c.critical,infractions:c.infractions||[],
   overridden:c.overridden||false,override_reason:c.overrideReason||null
 })));
 if(criteriaError)throw criteriaError;
}

async function transcribe(blob:Blob){
 if(!supabase)return null;
 const form=new FormData(); form.append('file',blob,'qa-call.webm');
 const {data,error}=await supabase.functions.invoke('transcribe',{body:form});
 if(error)throw error;
 return data as {text:string};
}

function formatElapsed(ms:number){
 const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
 return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function App(){
 const [mode,setMode]=useState<InputMode>('paste');
 const [text,setText]=useState('');
 const [evaluation,setEvaluation]=useState<Evaluation>();
 const [busy,setBusy]=useState(false);
 const [frames,setFrames]=useState<string[]>([]);
 const video=useRef<HTMLVideoElement>(null);
 const stream=useRef<MediaStream|null>(null);
 const audio=useRef<Awaited<ReturnType<typeof startAudioRecorder>>|null>(null);
 const [cameraOn,setCameraOn]=useState(false);
 const [recording,setRecording]=useState(false);
 const [paused,setPaused]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [userReady,setUserReady]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{
   let alive=true;
   (async()=>{
     if(!supabase){if(alive)setUserReady(true);return;}
     const {data}=await supabase.auth.getSession();
     if(!data.session)await supabase.auth.signInAnonymously();
     if(alive)setUserReady(true);
   })();
   return()=>{alive=false;stopMedia(stream.current)};
 },[]);

 useEffect(()=>{
   if(!recording)return;
   const timer=window.setInterval(()=>{if(audio.current&&!paused)setElapsed(audio.current.getElapsedMs())},500);
   return()=>window.clearInterval(timer);
 },[recording,paused]);

 async function beginCamera(){
   try{setError('');if(!video.current)return;stream.current=await startCamera(video.current);setCameraOn(true)}
   catch(e){setError(e instanceof Error?e.message:'Camera permission failed.')}
 }
 function stopCamera(){stopMedia(stream.current);stream.current=null;setCameraOn(false)}
 function capture(){
   if(!video.current)return;
   const frame=frameToDataUrl(video.current);
   setFrames(f=>f.length&&isNearDuplicate(f[f.length-1],frame)?f:[...f,frame]);
 }

 async function analyse(){
   setBusy(true);setError('');
   try{
     let messages=parseText(text);
     if(mode==='camera'){
       messages=frames.map((_,i)=>({id:String(i+1),role:'unknown' as const,text:`Screen capture segment ${i+1}`,source:'camera'}));
       stopCamera();
     }
     const result=await aiAnalyse(messages,mode==='camera'?frames:[],mode);
     const evaluationResult=result||demoEvaluation(mode,messages); setEvaluation(evaluationResult); try{await persistEvaluation(evaluationResult)}catch{setError('Evaluation completed, but saving the review history failed. The result is still available on screen.');}
   }catch(e){setError(e instanceof Error?e.message:'Review failed');setEvaluation(undefined)}
   finally{setBusy(false)}
 }

 async function stopListening(){
   if(!audio.current)return;
   setRecording(false);setPaused(false);
   try{
     const recorder=audio.current; audio.current=null;
     const blob=await recorder.stop();
     setElapsed(recorder.getElapsedMs());
     setBusy(true);setError('');
     const t=await transcribe(blob);
     const transcript=t?.text||'';
     setText(transcript);
     const messages=parseText(transcript);
     const result=await aiAnalyse(messages,[],mode);
     const evaluationResult=result||demoEvaluation(mode,messages); setEvaluation(evaluationResult); try{await persistEvaluation(evaluationResult)}catch{setError('Evaluation completed, but saving the review history failed. The result is still available on screen.');}
   }catch(e){setError(e instanceof Error?e.message:'Audio review failed');setEvaluation(undefined)}
   finally{setBusy(false)}
 }

 async function startListening(){
   try{setError('');setEvaluation(undefined);setElapsed(0);audio.current=await startAudioRecorder();setRecording(true);setPaused(false)}
   catch(e){setError(e instanceof Error?e.message:'Microphone permission failed.')}
 }

 function togglePause(){
   if(!audio.current)return;
   if(paused){audio.current.resume();setPaused(false)}else{audio.current.pause();setPaused(true)}
 }

 return <div className="app"><div className="shell">
  <header className="topbar"><div className="brand"><div className="brandmark">Q</div><div><h1>QA Copilot</h1><p>Personal QA intelligence</p></div></div><div className="privacy"><ShieldCheck size={14} style={{verticalAlign:'-2px',marginRight:5}}/> {supabase&&userReady?'Secure session':'Demo mode'}</div></header>
  <main>
   <section className="hero"><span className="eyebrow">Customer support QA</span><h2>Review conversations without touching the company system.</h2><p>Use Listen or Camera as your primary workflow. Paste remains available when a transcript is permitted.</p></section>
   <section className="modes">{modes.map(([id,title,desc,Icon])=><button className="mode" key={id} onClick={()=>{setMode(id);setEvaluation(undefined)}} style={{textAlign:'left',outline:mode===id?'2px solid #687cff':'none'}}><div className="icon"><Icon size={22}/></div><h3>{title}</h3><p>{desc}</p></button>)}</section>
   <section className="workspace">
    <div className="workspace-head"><div><span className="eyebrow">{mode} mode</span><h3>{mode==='paste'?'Paste conversation':mode==='listen'?'Listen to a call':'Capture the screen'}</h3></div>{evaluation&&<button className="secondary" onClick={()=>{setEvaluation(undefined);setFrames([]);setText('');setElapsed(0)}}><RotateCcw size={15}/> New review</button>}</div>
    {mode==='paste'&&<><textarea className="textarea" value={text} onChange={e=>setText(e.target.value)} placeholder={'Customer: I have been waiting for my transfer...\nAgent: I’m sorry about the delay. Let me check this for you...'} /><div className="actions"><button className="primary" disabled={!text.trim()||busy} onClick={analyse}>{busy?<><LoaderCircle size={15}/> Analysing…</>:'Analyse conversation'}</button></div></>}
    {mode==='camera'&&<div className="camera"><video ref={video} muted playsInline/><div className="actions">{!cameraOn?<button className="primary" onClick={beginCamera}><Camera size={16}/> Start camera</button>:<><button className="secondary" onClick={capture}><Camera size={16}/> Capture frame</button><button className="secondary" onClick={stopCamera}><StopCircle size={16}/> Stop</button></>}<button className="primary" disabled={frames.length===0||busy||cameraOn} onClick={analyse}>{busy?'Processing…':'Done — review'}</button></div><div className="preview-strip">{frames.map((f,i)=><img className="thumb" src={f} key={i} alt={`Captured segment ${i+1}`}/>)}</div><p className="muted">Capture each new screen position. Near-duplicate frames are ignored so the same screen is not repeatedly sent for analysis.</p></div>}
    {mode==='listen'&&<div><div className="card"><strong>Full-call audio review</strong><p className="muted">Start listening, play the permitted call aloud near the phone, pause if needed, and stop when the call ends. There is no fixed recording duration in the interface.</p><div className="timer">{formatElapsed(elapsed)}</div></div><div className="actions">{!recording&&!busy&&<button className="primary" onClick={startListening}><Mic size={16}/> Start listening</button>}{recording&&<><button className="secondary" onClick={togglePause}>{paused?<><Play size={16}/> Resume</>:<><Pause size={16}/> Pause</>}</button><button className="primary" onClick={stopListening}><StopCircle size={16}/> Stop & analyse</button></>}{busy&&<button className="primary" disabled><LoaderCircle size={15}/> Transcribing and analysing…</button>}</div></div>}
    {error&&<div className="card warning" style={{marginTop:14}}><strong>Could not complete review</strong><div className="evidence">{error}</div></div>}
    {evaluation&&<ResultPanel evaluation={evaluation}/>}
   </section>
  </main>
  <footer className="footer">Final scoring remains under human QA control. Capture audio, screens, and SOP pages only where your organisation permits it.</footer>
 </div></div>
}