import type {SeasonId} from './seasons';

export const SEASON_CRYSTAL_MOUNT={y:.96,z:.065,height:.48,front:.30} as const;

export const SEASON_CRYSTALS={
  spring:{colour:0xff78ba,css:'#ff78ba',name:'pink'},
  summer:{colour:0xffd35c,css:'#ffd35c',name:'yellow'},
  autumn:{colour:0xf34542,css:'#f34542',name:'red'},
  winter:{colour:0x91d9ff,css:'#91d9ff',name:'pale blue'},
} as const;
const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};

/** A deliberate, proximity-gated pickup. The world stays live until the final dissolve. */
export function createSeasonCrystalJourney(reduced=false){
  const state={season:null as SeasonId|null,index:-1,age:0,active:false};
  let candidate:{season:SeasonId;index:number}|null=null;
  const duration=reduced?1.25:3.6;
  return {
    state,
    contact(distance:number,x:number,yaw:number,first:number,entries:readonly {season?:SeasonId}[],awake:boolean){
      candidate=null;if(state.active||!awake)return;
      const index=Math.max(0,Math.round((distance-first)/18)),entry=entries[index%entries.length];
      const dz=first+index*18-distance-SEASON_CRYSTAL_MOUNT.front,d=Math.hypot(x,dz),facing=(x*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(.01,d);
      if(entry?.season&&dz>.5&&d<2.65&&facing>.65)candidate={season:entry.season,index};
    },
    get candidate(){return candidate;},
    take(){if(state.active||!candidate)return null;state.season=candidate.season;state.index=candidate.index;state.age=0;state.active=true;candidate=null;return state.season;},
    advance(dt:number){if(state.active)state.age=Math.min(duration,state.age+Math.max(0,Math.min(dt,.1)));},
    reset(){state.active=false;state.season=null;state.index=-1;state.age=0;candidate=null;},
    pose(){const t=reduced?state.age/duration*3.6:state.age;
      return {active:state.active,season:state.season,index:state.index,age:state.age,ready:state.active&&state.age>=duration,
        release:state.active?smooth(0,.7,t):0,flight:state.active?smooth(.55,1.8,t):0,
        glow:state.active?smooth(.25,2.9,t):0,envelop:state.active?smooth(1.9,3.55,t):0,
        stage:!state.active?'docked':t<.7?'releasing':t<1.8?'floating':t<2.9?'radiating':'crossing',reduced};
    },
  };
}
