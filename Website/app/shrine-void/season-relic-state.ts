import type {SeasonId} from './seasons';

export type RelicStage='resting'|'unlocking'|'taking'|'presenting'|'reading'|'closing';
export type RelicAction='key'|'unlock'|'book';
export interface RelicSave{version:1;keyFound:boolean;unlocked:boolean;bookTaken:boolean;}
export interface RelicStorage{getItem(key:string):string|null;setItem(key:string,value:string):void;}
export const relicSaveKey=(id:SeasonId)=>`between-seasons-relic-${id}-v1`;
export const relicSmooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};

/** Only completed milestones persist. Interrupted lid/book animations safely resume at a stable pose. */
export function createRelicState(id:SeasonId,reduced=false,storage?:RelicStorage){
  let saved:RelicSave={version:1,keyFound:false,unlocked:false,bookTaken:false};
  try{const raw=JSON.parse(storage?.getItem(relicSaveKey(id))??'null');if(raw?.version===1){const bookTaken=raw.bookTaken===true,unlocked=raw.unlocked===true||bookTaken;saved={version:1,keyFound:raw.keyFound===true||unlocked,unlocked,bookTaken};}}catch{}
  const state={...saved,stage:'resting' as RelicStage,age:0};
  let closingFrom={present:1,opening:1,zoom:1};
  const persist=()=>{try{storage?.setItem(relicSaveKey(id),JSON.stringify({version:1,keyFound:state.keyFound,unlocked:state.unlocked,bookTaken:state.bookTaken}));}catch{}};
  const duration=(stage:RelicStage)=>stage==='unlocking'?(reduced?.35:2.3):stage==='taking'?(reduced?.2:1):stage==='presenting'?(reduced?.8:3):stage==='closing'?(reduced?.2:.85):Infinity;
  return {state,
    reset(){Object.assign(state,{version:1,keyFound:false,unlocked:false,bookTaken:false,stage:'resting',age:0});closingFrom={present:1,opening:1,zoom:1};persist();},
    act(action:RelicAction){if(state.stage!=='resting')return false;
      if(action==='key'&&!state.keyFound){state.keyFound=true;persist();return true;}
      if(action==='unlock'&&state.keyFound&&!state.unlocked){state.stage='unlocking';state.age=0;return true;}
      if(action==='book'&&state.unlocked&&!state.bookTaken){state.stage='taking';state.age=0;return true;}return false;
    },
    read(){if(!state.bookTaken||state.stage!=='resting')return false;state.stage='presenting';state.age=0;return true;},
    close(){if(state.stage!=='presenting'&&state.stage!=='reading')return false;const t=state.age/duration(state.stage)*3;closingFrom=state.stage==='reading'?{present:1,opening:1,zoom:1}:{present:relicSmooth(0,.8,t),opening:relicSmooth(.8,1.9,t),zoom:relicSmooth(2,3,t)};state.stage='closing';state.age=0;return true;},
    update(dt:number){if(state.stage==='resting'||state.stage==='reading')return;state.age+=Math.max(0,Math.min(dt,.1));
      if(state.age+1e-8>=duration(state.stage)){
        if(state.stage==='unlocking')state.unlocked=true;
        if(state.stage==='taking')state.bookTaken=true;
        state.stage=state.stage==='presenting'?'reading':'resting';state.age=0;persist();
      }
    },
    pose(){const progress=state.age/duration(state.stage),t=state.stage==='unlocking'?progress*2.3:state.stage==='presenting'?progress*3:state.age;
      return {stage:state.stage,hasKey:state.keyFound&&!state.unlocked,hasBook:state.bookTaken,busy:state.stage!=='resting',readerReady:state.stage==='reading',
        keyInsert:state.stage==='unlocking'?relicSmooth(0,.65,t):0,keyTurn:state.stage==='unlocking'?relicSmooth(.6,1.1,t):0,
        lid:state.unlocked?1:state.stage==='unlocking'?relicSmooth(1.1,2.25,t):0,
        taking:state.stage==='taking'?relicSmooth(0,1,progress):state.bookTaken?1:0,
        present:state.stage==='presenting'?relicSmooth(0,.8,t):state.stage==='reading'?1:state.stage==='closing'?closingFrom.present*(1-relicSmooth(0,1,progress)):0,
        opening:state.stage==='presenting'?relicSmooth(.8,1.9,t):state.stage==='reading'?1:state.stage==='closing'?closingFrom.opening*(1-relicSmooth(0,.65,progress)):0,
        zoom:state.stage==='presenting'?relicSmooth(2,3,t):state.stage==='reading'?1:state.stage==='closing'?closingFrom.zoom*(1-relicSmooth(0,1,progress)):0,
      };
    },
  };
}
