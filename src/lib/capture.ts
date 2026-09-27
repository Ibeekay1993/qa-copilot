export async function startCamera(video:HTMLVideoElement){
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  video.srcObject=stream;
  await video.play();
  return stream;
}
export function stopMedia(stream:MediaStream|null){stream?.getTracks().forEach(t=>t.stop());}
export function frameToDataUrl(video:HTMLVideoElement,quality=.82){
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1400/video.videoWidth);
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',quality);
}
export function isNearDuplicate(a:string,b:string){
  if(a===b)return true;
  const aBody=a.split(',')[1]||a;
  const bBody=b.split(',')[1]||b;
  if(Math.abs(aBody.length-bBody.length)>Math.max(4000,aBody.length*.08))return false;
  const step=Math.max(1,Math.floor(Math.min(aBody.length,bBody.length)/120));
  let same=0,total=0;
  for(let i=0;i<Math.min(aBody.length,bBody.length);i+=step){total++;if(aBody[i]===bBody[i])same++;}
  return total>0&&same/total>.94;
}

export interface AudioRecorderController{
  stop:()=>Promise<Blob>;
  pause:()=>void;
  resume:()=>void;
  getElapsedMs:()=>number;
}
export async function startAudioRecorder():Promise<AudioRecorderController>{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const rec=new MediaRecorder(stream);
  const chunks:Blob[]=[];
  const started=Date.now();
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  rec.start(1000);
  let resolveStop:(blob:Blob)=>void=()=>{};
  const done=new Promise<Blob>(resolve=>{resolveStop=resolve;});
  rec.onstop=()=>{
    resolveStop(new Blob(chunks,{type:rec.mimeType||'audio/webm'}));
    stream.getTracks().forEach(t=>t.stop());
  };
  return {
    stop:()=>new Promise<Blob>(resolve=>{
      if(rec.state==='inactive'){resolve(new Blob(chunks,{type:rec.mimeType||'audio/webm'}));return;}
      const previous=resolveStop;
      resolveStop=(blob)=>{previous(blob);resolve(blob);};
      rec.stop();
    }),
    pause:()=>{if(rec.state==='recording')rec.pause();},
    resume:()=>{if(rec.state==='paused')rec.resume();},
    getElapsedMs:()=>Date.now()-started
  };
}
export function downloadBlob(blob:Blob){return URL.createObjectURL(blob);}
