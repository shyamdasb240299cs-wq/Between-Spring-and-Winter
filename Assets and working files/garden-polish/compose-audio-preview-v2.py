"""Private revision 2: original sampled Japanese-style score and quieter ambience.
Creates review MP3s only; nothing is imported by the website. Uses numpy,
tinysoundfont 0.3.7, ffmpeg and a local GeneralUser GS sample library.
"""
from pathlib import Path
import json, subprocess, sys
import numpy as np

root=Path(__file__).resolve().parents[2]
out=root/'.audio-review'
sys.path.insert(0,str(out/'python-packages'))
from tinysoundfont import Synth
sr=32000
duration=80
t=np.arange(sr*duration)/sr
rng=np.random.default_rng(9127)

def wav(name,data):
    peak=float(np.max(np.abs(data)))
    if peak>=.98: raise ValueError(f'{name} would clip: {peak}')
    pcm=(data*32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','s16le','-ar',str(sr),'-ac','2','-i','pipe:0','-codec:a','libmp3lame','-b:a','160k',str(out/(name+'.mp3'))],input=pcm,check=True)
    print(name,'peak',round(peak,4))

def smooth(time,a,b):
    v=np.clip((time-a)/(b-a),0,1)
    return v*v*(3-2*v)

def render_score(reading=False):
    synth=Synth(gain=-10,samplerate=sr)
    sf=synth.sfload(str(out/'GeneralUser-GS.sf2'))
    for channel,preset in enumerate([107,77,89]): synth.program_select(channel,sf,0,preset)
    events=[]
    def note(channel,pitch,start,length,velocity):
        events.extend([(int(start*sr),'on',channel,pitch,velocity),(int((start+length)*sr),'off',channel,pitch,0)])
    # Original pentatonic theme, 4-bar call and response at 60 BPM.
    phrases=[[(0,69,1.7),(2,72,1),(3.3,74,2.2),(6,76,1.4),(8,74,1.6),(10,72,1.2),(12,69,3)],
             [(0,67,1.6),(2,69,1.5),(4,72,2.5),(7,74,1.5),(9,72,1.8),(12,67,3)],
             [(0,69,2),(3,72,1),(4.4,76,2.5),(8,79,1.2),(10,76,2),(13,74,2)],
             [(0,72,2),(3,69,2),(6,67,2),(9,64,1.5),(12,69,3.5)]]
    for phrase_index,phrase in enumerate(phrases):
        offset=2+phrase_index*18
        for step,(beat,pitch,hold) in enumerate(phrase):
            start=offset+beat+rng.uniform(-.035,.035)
            note(0,pitch,start,hold+1,42 if reading else 51+(step%3)*3)
            if reading or step in (2,4): note(1,pitch-12,start+.08,hold*1.15,41 if reading else 31)
        chord=[45,52,57] if phrase_index%2==0 else [43,50,55]
        for bar in range(4):
            for i,pitch in enumerate(chord): note(0,pitch,offset+bar*4+i*.5,2.5,29 if reading else 34)
        for pitch in chord: note(2,pitch,offset,15.5,27 if reading else 21)
    events.sort(key=lambda e:e[0])
    result=np.zeros((len(t),2))
    cursor=0
    for sample,kind,channel,pitch,velocity in events+[(len(t),'end',0,0,0)]:
        sample=min(len(t),sample)
        if sample>cursor:
            block=np.frombuffer(synth.generate(sample-cursor),dtype=np.float32).reshape(-1,2)
            result[cursor:sample]=block
            cursor=sample
        if kind=='on': synth.noteon(channel,pitch,velocity)
        elif kind=='off': synth.noteoff(channel,pitch)
    synth.sfunload(sf)
    dry=result.copy()
    wet=(dry+np.roll(dry,1,axis=0)+np.roll(dry,2,axis=0))/3
    for delay,gain in [(.089,.15),(.171,.12),(.283,.1),(.431,.085),(.683,.055),(.997,.035)]:
        shift=int(delay*sr);result[shift:]+=wet[:-shift,::-1]*gain
    result*=smooth(t,0,4)[:,None]*(1-smooth(t,74,80))[:,None]
    rms=np.sqrt(np.mean(result**2));result*=.038/max(rms,.001)
    return .16*np.tanh(result/.16)

opening=render_score(False)
reading=render_score(True)
wav('opening-music-v2',opening)
wav('reading-music-v2',reading)

# Original light glass bowl: irregular paired/triple contacts and delicate decay.
bell=np.zeros((len(t),2))
bursts=[(3.2,[0,.28,.79]),(13.7,[0,.41]),(25.6,[0,.32,.97]),(39.2,[0,.51]),(51.8,[0,.23,.72]),(65.4,[0,.36])]
for burst,offsets in bursts:
    for i,offset in enumerate(offsets):
        bt=np.arange(sr*4)/sr
        f=2350+rng.uniform(-25,25)
        signal=np.zeros(len(bt))
        for ratio,gain,decay in [(1,1,1.65),(1.006,.25,2),(1.47,.13,2.5),(2.09,.06,3.8),(2.72,.022,5)]:
            signal+=np.sin(2*np.pi*f*ratio*bt)*gain*np.exp(-decay*bt)
        signal*=smooth(bt,0,.002)*(1-smooth(bt,3.2,4))
        start=int((burst+offset)*sr);n=min(len(signal),len(t)-start)
        bell[start:start+n]+=signal[:n,None]*np.array([.72,.81])*.033*(1-.19*i)
        shift=int(.117*sr)
        if start+shift+n<len(t):bell[start+shift:start+shift+n]+=signal[:n,None]*np.array([.81,.72])*.005
wav('furin-glass-v2',bell)

sources=json.loads((out/'field-sources.json').read_text())
filters={
    'birds':'highpass=f=500,lowpass=f=6500,loudnorm=I=-32:TP=-9:LRA=7',
    'waterfall':'highpass=f=220,lowpass=f=5200,loudnorm=I=-34:TP=-9:LRA=5',
    'breeze':'highpass=f=500,lowpass=f=4000,loudnorm=I=-40:TP=-9:LRA=4',
    'fire':'highpass=f=250,lowpass=f=5200,loudnorm=I=-36:TP=-9:LRA=6',
    'coastal':'highpass=f=850,lowpass=f=4300,loudnorm=I=-32:TP=-9:LRA=6',
}
tracks={}
for name in sources:
    decoded=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-stream_loop','-1','-i',str(out/(name+'-source.wav')),'-t',str(duration),'-af',filters[name],'-ar',str(sr),'-ac','2','-f','s16le','pipe:1'],stdout=subprocess.PIPE,check=True).stdout
    data=np.frombuffer(decoded,dtype='<i2').reshape(-1,2).astype(float)/32768
    if name=='coastal':
        window=np.zeros(len(t))
        for a,b in [(4,8),(17,21),(30,34)]:window+=smooth(t,a,a+1)*(1-smooth(t,b-1,b))
        data*=window[:,None]
    if name=='breeze': data*=(.3+.7*np.sin(t*.19)**4)[:,None]
    # Tame close bird cries and individual fire pops without raising the bed.
    ceiling={'birds':.08,'coastal':.055,'fire':.07,'breeze':.03,'waterfall':.065}[name]
    data=ceiling*np.tanh(data/ceiling)
    data*=smooth(t,0,2)[:,None]*(1-smooth(t,77,80))[:,None]
    tracks[name]=data
    wav(name+'-v2',data)

# Time-compressed listening proposal. Production will follow scroll, not a timer.
enter_garden=smooth(t,22,34)
enter_reading=smooth(t,55,64)
leave_ambience=1-smooth(t,54,63)
mix=opening*(1-enter_reading)[:,None]+reading*enter_reading[:,None]
mix+=tracks['coastal']*(1-smooth(t,15,23))[:,None]*.55
mix+=tracks['birds']*(smooth(t,31,42)*leave_ambience)[:,None]*.8
mix+=tracks['waterfall']*(enter_garden*leave_ambience)[:,None]*.75
mix+=tracks['breeze']*(enter_garden*leave_ambience)[:,None]*.65
mix+=bell*(enter_garden*leave_ambience)[:,None]*.85
mix+=tracks['fire']*(smooth(t,34,43)*leave_ambience)[:,None]*.75
wav('journey-preview-v2',mix)
(out/'sources-v2.json').write_text(json.dumps({'revision':2,'music':'Original melody rendered with GeneralUser GS sampled koto, shakuhachi and warm pad','instrument_library':'https://github.com/mrbumpy409/GeneralUser-GS','chime':'Original delicate glass contacts in irregular paired/triple bursts','field_recordings':sources,'approval':'Pending revision 2 review; no audio integrated or published'},indent=2))
print('Revision 2 private previews ready:',out)
