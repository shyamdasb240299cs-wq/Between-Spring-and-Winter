import {getAudioEnabled} from '../audio-setting';
import {landscapeBlocked} from '../landscape-guard';

/** Original stereo rainfall synthesis, shared with the visual weather envelope. */
export function createSpringRainAudio(){
  let context:AudioContext|null=null,master:GainNode|null=null,lowpass:BiquadFilterNode|null=null;
  let source:AudioBufferSourceNode|null=null,disposed=false,focused=true,nextDrip=0;
  let strength=0,sheltered=false,paused=true,unavailable=false;
  const nodes=new Set<AudioNode>(),transients=new Set<OscillatorNode>();
  const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
  function allowed(){return getAudioEnabled()&&!paused&&!document.hidden&&focused&&!landscapeBlocked();}
  const silence=()=>{if(context&&master)master.gain.setTargetAtTime(0,context.currentTime,.08);};
  function resume(){if(context?.state==='suspended')void context.resume().catch(()=>{});}
  function unlock(event:Event){
    // `journey-audio-change` is a custom event; only accept it while the browser
    // confirms the original sound button's user activation is still active.
    const gesture=event.isTrusted||navigator.userActivation?.isActive===true;
    if(!gesture||disposed||unavailable||!getAudioEnabled())return;
    try{
      if(!context){
        context=new AudioContext({latencyHint:'playback'});master=context.createGain();master.gain.value=0;master.connect(context.destination);nodes.add(master);
        lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=6200;lowpass.Q.value=.45;lowpass.connect(master);nodes.add(lowpass);
        const highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=230;highpass.Q.value=.35;highpass.connect(lowpass);nodes.add(highpass);
        const body=context.createBiquadFilter();body.type='peaking';body.frequency.value=1100;body.Q.value=.55;body.gain.value=-4.5;body.connect(highpass);nodes.add(body);
        const noise=context.createBuffer(2,context.sampleRate*7,context.sampleRate);
        // Independent channels, with gentle band variation rather than a
        // full-volume white-noise hiss or a short recognisable rain sample.
        for(let channel=0;channel<2;channel++){
          const data=noise.getChannelData(channel);let slow=0,seed=19331+channel*39857;
          for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;slow=.965*slow+.035*white;data[i]=white*.45+slow*1.9;}
        }
        source=context.createBufferSource();source.buffer=noise;source.loop=true;source.connect(body);nodes.add(source);source.start();
      }
      resume();
    }catch{unavailable=true;silence();}
  }
  function setting(event:Event){if(!getAudioEnabled()){silence();if(context?.state==='running')void context.suspend().catch(()=>{});}else unlock(event);}
  function blur(){focused=false;silence();}
  function focus(){focused=true;if(allowed())resume();}
  function visibility(){if(document.hidden||landscapeBlocked())silence();else if(allowed())resume();}
  window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);window.addEventListener('journey-audio-change',setting);
  window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('journey-orientation-change',visibility);document.addEventListener('visibilitychange',visibility);
  return {
    update(intensity:number,insideTrain:boolean,isPaused:boolean){
      strength=clamp(intensity);sheltered=insideTrain;paused=isPaused;
      if(!context||!master||!lowpass||disposed)return;
      const now=context.currentTime,on=allowed();
      master.gain.setTargetAtTime(on?Math.sqrt(strength)*(sheltered?.055:.115):0,now,.45);
      lowpass.frequency.setTargetAtTime(sheltered?1100:6200,now,.4);
      if(!on||strength<.08||sheltered||context.state!=='running'||now<nextDrip)return;
      nextDrip=now+.32+Math.random()*.85;
      const oscillator=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner();transients.add(oscillator);
      oscillator.type='sine';oscillator.frequency.setValueAtTime(900+Math.random()*750,now);oscillator.frequency.exponentialRampToValueAtTime(430+Math.random()*170,now+.055);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.018+Math.random()*.018,now+.002);gain.gain.exponentialRampToValueAtTime(.0001,now+.07);
      pan.pan.value=Math.random()*1.5-.75;oscillator.connect(gain);gain.connect(pan);pan.connect(master);oscillator.start(now);oscillator.stop(now+.08);
      oscillator.onended=()=>{transients.delete(oscillator);oscillator.disconnect();gain.disconnect();pan.disconnect();};
    },
    dispose(){
      if(disposed)return;disposed=true;
      window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);window.removeEventListener('journey-audio-change',setting);
      window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('journey-orientation-change',visibility);document.removeEventListener('visibilitychange',visibility);
      for(const transient of transients){try{transient.stop();}catch{/* Already ended. */}transient.disconnect();}transients.clear();
      try{source?.stop();}catch{/* An unavailable context may never have started. */}
      nodes.forEach(node=>node.disconnect());nodes.clear();if(context)void context.close().catch(()=>{});context=null;master=null;lowpass=null;source=null;
    },
  };
}
