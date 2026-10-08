"""Revision 3 local site assets. No raw stock files are published or committed."""
from pathlib import Path
import subprocess, json
import numpy as np
root=Path(__file__).resolve().parents[2]
out=root/'.audio-review'
sr=32000

def decode(path,filters='anull'):
    result=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(path),'-af',filters,'-ar',str(sr),'-ac','2','-f','f32le','pipe:1'],stdout=subprocess.PIPE,check=True)
    return np.frombuffer(result.stdout,dtype='<f4').reshape(-1,2).copy()

def encode(name,data):
    assert np.max(np.abs(data))<.95,name+' would clip'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','f32le','-ar',str(sr),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','160k',str(out/(name+'.mp3'))],input=data.astype('<f4').tobytes(),check=True)
    print(name,'seconds',round(len(data)/sr,2),'peak',round(float(np.max(np.abs(data))),3))

def fade(data,seconds=.12):
    n=min(len(data)//2,int(seconds*sr))
    ramp=np.linspace(0,1,n)**2
    data[:n]*=ramp[:,None];data[-n:]*=ramp[::-1,None]
    return data

# A composed flowing koto-and-harp theme replaces the rejected MIDI arrangement.
music=decode(out/'romantic-koto-source.mp3','highpass=f=100,lowpass=f=7000,loudnorm=I=-29:TP=-9:LRA=7')
music=.14*np.tanh(music/.14)
encode('music-v3',fade(music.copy(),3))
reading=decode(out/'music-v3.mp3','lowpass=f=4200,volume=0.85')
encode('reading-music-v3',reading)

# Two individual forest calls; no shoreline or sea-wave recording.
sources=json.loads((out/'field-sources.json').read_text())
bird=decode(out/'opening-bird-source.wav','highpass=f=600,lowpass=f=6200,loudnorm=I=-35:TP=-9:LRA=7')
bird=.045*np.tanh(bird/.045)
encode('opening-bird-v3',fade(bird,.18))
breeze=decode(out/'breeze-v2.mp3','highpass=f=700,lowpass=f=3200,volume=0.38')
encode('breeze-v3',breeze)

# A real Japanese wind chime, softened without changing the characteristic ring.
furin=decode(out/'furin-recorded-source.mp3','highpass=f=1100,lowpass=f=8200,loudnorm=I=-35:TP=-9:LRA=7')
furin=.04*np.tanh(furin/.04)
encode('furin-v3',fade(furin,.025))

# Locate the first audible contact and preserve its decay for physics-triggered playback.
energy=np.max(np.abs(furin),axis=1)
start=max(0,int(np.flatnonzero(energy>.004)[0])-int(.02*sr))
encode('furin-contact-v3',fade(furin[start:min(len(furin),start+int(1.6*sr))].copy(),.018))

(out/'sources-v3.json').write_text(json.dumps({
 'revision':3,'music':{'title':'Onsen(Hot Spring)-style music 24','artist':'MOMIZizm MUSiC / もみじば','source':'https://music.storyinvention.com/en/onsen-ryokan-24-en/','credit_link':'https://music.storyinvention.com/en/','terms':'https://music.storyinvention.com/en/terms-of-service/'},
 'furin':{'source':'https://soundeffect-lab.info/sound/sub-category/summer.html','terms':'https://soundeffect-lab.info/agreement/'},
 'opening_bird':{'source':'https://mixkit.co/free-sound-effects/bird/','item':23},
 'approval':{'forest_birds':'approved','waterfall':'approved','campfire':'approved','music':'pending','opening_bird':'pending','gentler_breeze':'pending','recorded_furin':'pending'},
 'preview':'Local loopback site preview only; publishing awaits review'
},indent=2))
