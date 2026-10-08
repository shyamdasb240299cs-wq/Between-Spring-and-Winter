"""Original music/chime and a private review mix; no sound is wired into the site.
Field recordings are downloaded locally from Mixkit, never committed as stock files.
"""
from pathlib import Path
import json, subprocess, wave
import numpy as np

root = Path(__file__).resolve().parents[2]
out = root / '.audio-review'
out.mkdir(exist_ok=True)
sr = 32000
length = 60
rng = np.random.default_rng(431)
music = np.zeros((sr*length, 2), dtype=np.float64)

def add(target, signal, start, gain=1, pan=0):
    offset = int(start*sr)
    count = min(len(signal), len(target)-offset)
    if count <= 0: return
    if signal.ndim == 1:
        signal = signal[:,None] * np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
    target[offset:offset+count] += signal[:count]*gain

def pluck(midi):
    t = np.arange(sr*7)/sr
    f = 440*2**((midi-69)/12)
    signal = np.zeros(len(t))
    for harmonic in range(1,11):
        # Slight inharmonicity and a bright attack over a warm string body.
        signal += np.sin(2*np.pi*f*harmonic*(1+.00012*harmonic**2)*t + .07*harmonic) * np.exp(-t*(.75+harmonic*.3))/harmonic**1.35
    signal *= (1-np.exp(-t*700))
    signal += rng.normal(0,.07,len(t))*np.exp(-t*120)
    return signal

# A slow, spacious yo-scale phrase; no vocals, percussion, or sharp loop reset.
phrase = [(1.8,64,.15),(5.2,71,.12),(8.7,74,.1),(12.4,69,.12),(17,67,.11),(21.8,64,.13),(25.3,71,.09),(28.1,76,.09),(32.8,74,.1),(36.6,71,.11),(41.2,69,.11),(45.9,67,.1),(50.7,64,.12),(54.3,59,.1)]
for i,(start,note,gain) in enumerate(phrase): add(music,pluck(note),start,gain,(-.2,.18,-.1)[i%3])
t = np.arange(sr*length)/sr
envelope = np.minimum(1,t/5)*np.minimum(1,(length-t)/7)
for i,note in enumerate([40,47,55,62]):
    f=440*2**((note-69)/12)
    pad=(np.sin(2*np.pi*f*t+.002*np.sin(t*.7))+.24*np.sin(2*np.pi*f*2*t))
    pad*=envelope*(.75+.25*np.sin(t*.13+i))*.014
    add(music,pad,0,1,(-.35,.35,-.15,.15)[i])
# Diffuse stereo echoes, kept below the dry instrument.
dry=music.copy()
for delay,gain in [(0.173,.16),(.347,.12),(.613,.09),(1.07,.06)]:
    n=int(delay*sr); music[n:]+=dry[:-n,::-1]*gain
music*=envelope[:,None]

chime=np.zeros((sr*length,2))
for start,freq,pan in [(3.4,1770,-.08),(14.8,1802,.1),(29.5,1758,-.1),(46.2,1785,.06)]:
    ct=np.arange(sr*7)/sr; signal=np.zeros(len(ct))
    for ratio,gain,decay in [(1,1,1.3),(2.32,.22,1.8),(2.86,.09,2.5),(4.21,.035,3.3)]:
        signal+=np.sin(2*np.pi*freq*ratio*ct)*gain*np.exp(-decay*ct)
    signal*=1-np.exp(-ct*1000)
    add(chime,signal,start,.07,pan)

def wav(name,data):
    with wave.open(str(out/(name+'.wav')),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr)
        f.writeframes((np.clip(data,-.98,.98)*32767).astype('<i2').tobytes())

def encode(name):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(out/(name+'.wav')),'-codec:a','libmp3lame','-b:a','128k',str(out/(name+'.mp3'))],check=True)

wav('opening-music',music);encode('opening-music')
wav('furin-glass',chime);encode('furin-glass')
sources=json.loads((out/'field-sources.json').read_text())
tracks={}
for name in sources:
    raw=out/(name+'-source.wav')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-stream_loop','-1','-i',str(raw),'-t','60','-af','highpass=f=85,lowpass=f=11000,loudnorm=I=-24:TP=-5:LRA=8,afade=t=in:d=2,afade=t=out:st=57:d=3','-ar',str(sr),'-ac','2',str(out/(name+'.wav'))],check=True)
    encode(name)
    with wave.open(str(out/(name+'.wav')),'rb') as f: tracks[name]=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2)/32768

def fade(a,b): return np.clip((t-a)/(b-a),0,1)**2*(3-2*np.clip((t-a)/(b-a),0,1))
mix=music*(1-.7*fade(17,32))[:,None]
mix+=tracks['birds']*(.65-.42*fade(15,35))[:,None]
mix+=tracks['waterfall']*(.6*fade(17,29))[:,None]
mix+=tracks['breeze']*(.33*fade(21,31))[:,None]
mix+=chime*fade(19,28)[:,None]
mix+=tracks['fire']*(.55*fade(39,49))[:,None]
mix*=np.minimum(1,t/3)[:,None]*np.minimum(1,(60-t)/4)[:,None]
wav('journey-preview',mix);encode('journey-preview')
(out/'sources.json').write_text(json.dumps({'music':'Original procedural koto-style plucks and ambient pads, no vocals','chime':'Original glass modal synthesis','field_recordings':sources,'approval':'Pending; review files are excluded from Git and production'},indent=2))
print('Private previews ready:',out,'peak mix',round(float(np.max(np.abs(mix))),3))
