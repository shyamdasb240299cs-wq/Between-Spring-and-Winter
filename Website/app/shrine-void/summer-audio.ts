import {getAudioEnabled} from '../audio-setting';
/** Quiet original synthesis; no recordings, music or mandatory audio clues. */
export function createSummerAudio(){
  let context:AudioContext|null=null,master:GainNode|null=null,breath:GainNode|null=null,motor:GainNode|null=null,filter:BiquadFilterNode|null=null;
  let source:AudioBufferSourceNode|null=null,engine:OscillatorNode|null=null,disposed=false,lastCue=0;
  const unlock=()=>{
    if(disposed||!getAudioEnabled())return;
    try{
      if(!context){context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;filter.connect(master);
        const noise=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=noise.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.025)/1.025;data[i]=previous*3;}
        source=context.createBufferSource();source.buffer=noise;source.loop=true;breath=context.createGain();breath.gain.value=0;source.connect(breath);breath.connect(filter);source.start();
        engine=context.createOscillator();engine.type='sawtooth';engine.frequency.value=38;motor=context.createGain();motor.gain.value=0;engine.connect(motor);motor.connect(filter);engine.start();
      }
      void context.resume();
    }catch{/* Audio never blocks exploration. */}
  };
  window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);window.addEventListener('journey-audio-change',unlock);
  const quiet=()=>{if(context&&master)master.gain.setTargetAtTime(0,context.currentTime,.08);};
  document.addEventListener('visibilitychange',quiet);window.addEventListener('blur',quiet);
  return {update(time:number,underwater:boolean,running:boolean,speed:number,paused:boolean,enabled=true){
    if(!context||!master||!breath||!motor||!filter||!engine)return;
    const now=context.currentTime,on=getAudioEnabled()&&enabled&&!paused&&!document.hidden;
    master.gain.setTargetAtTime(on?.16:0,now,.25);filter.frequency.setTargetAtTime(underwater?620:1800,now,.4);
    breath.gain.setTargetAtTime(underwater?.12+Math.max(0,Math.sin(time*1.7))*.45:.045,now,.2);
    motor.gain.setTargetAtTime(running&&!underwater?.055+Math.min(speed,4)*.012:0,now,.3);engine.frequency.setTargetAtTime(38+Math.min(speed,4)*9,now,.3);
  },cue(){if(!context||!master||!getAudioEnabled()||context.currentTime-lastCue<.12)return;lastCue=context.currentTime;const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.setValueAtTime(360,lastCue);osc.frequency.exponentialRampToValueAtTime(150,lastCue+.13);gain.gain.setValueAtTime(.12,lastCue);gain.gain.exponentialRampToValueAtTime(.001,lastCue+.18);osc.connect(gain);gain.connect(master);osc.start();osc.stop(lastCue+.2);osc.onended=()=>{osc.disconnect();gain.disconnect();};},dispose(){disposed=true;window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);window.removeEventListener('journey-audio-change',unlock);window.removeEventListener('blur',quiet);document.removeEventListener('visibilitychange',quiet);source?.stop();engine?.stop();void context?.close();}};
}
