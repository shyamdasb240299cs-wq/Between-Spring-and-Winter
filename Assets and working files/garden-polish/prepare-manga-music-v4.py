"""Licensed piano/strings romance cue, local review only until approved."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parents[2]/'.audio-review'
def run(source,target,filters):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(root/source),'-af',filters,'-ar','32000','-ac','2','-c:a','libmp3lame','-b:a','160k',str(root/target)],check=True)
run('manga-romance-source.mp3','music-v4.mp3','highpass=f=75,lowpass=f=5800,loudnorm=I=-30:TP=-9:LRA=6,afade=t=in:d=3,afade=t=out:st=128.95:d=4')
run('music-v4.mp3','reading-music-v4.mp3','lowpass=f=4000,volume=0.8667')
(root/'sources-v4.json').write_text(json.dumps({
 'music':{'title':'First Love / 初恋','composer':'Amacha / 甘茶','source':'https://amachamusic.chagasi.com/music_hatsukoi.html','download':'https://amachamusic.chagasi.com/mp3/hatsukoi.mp3','terms':'https://amachamusic.chagasi.com/terms.html'},
 'approval':{'music':'pending','nature':'approved by user: everything smooth except music'},
 'mix':'One continuous stream; reading gain and tone soften without a restart; reduced fire bed for spent charcoal',
 'preview':'Local actual-site music preview only. Do not publish new music until reviewed.'
},indent=2))
print('Prepared music-v4.mp3 and the matching reading preview.')
