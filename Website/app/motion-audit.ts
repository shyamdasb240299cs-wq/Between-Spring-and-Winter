/** Optional local profiling. No observer or sampling runs for ordinary visitors. */
export function motionAudit(host:HTMLElement){
  if(!new URLSearchParams(location.search).has('motion-audit'))return null;
  let previous=0,frames=0,total=0,slow=0,work=0,maxWork=0;
  return {start(now:number){
    const interval=now-previous;previous=now;
    if(interval>0&&interval<200){frames++;total+=interval;if(interval>25)slow++;}
    return performance.now();
  },end(start:number){
    const ms=performance.now()-start;work+=ms;maxWork=Math.max(maxWork,ms);
    if(frames>=120){host.dataset.auditFps=(1000*frames/total).toFixed(1);host.dataset.auditSlow=String(slow);host.dataset.auditFrames=String(frames);host.dataset.auditWork=(work/frames).toFixed(2);host.dataset.auditMaxWork=maxWork.toFixed(2);frames=total=slow=work=maxWork=0;}
  }};
}
