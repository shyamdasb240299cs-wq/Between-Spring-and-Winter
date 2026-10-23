/** Persisted, physical discoveries in Spring. Reading a clue is never a hidden gate. */
export type SpringTarget = 'note'|'plant'|'pouch'|'phone'|'ticket'|'tin'|'bench'|'pocket'|'lightbox'|'cabinet'|'map'|'spade'|'dig'|'box';

export interface SpringSave {
  version:1; noteRead:boolean; plantFound:boolean; pouchTaken:boolean; phoneRead:boolean;
  ticketFound:boolean; ticketSolved:boolean; paperPlaced:boolean; paperClipped:boolean;
  rubbingDone:boolean; benchVisited:boolean; pocketFound:boolean; cabinetOpen:boolean;
  keepsakeRead:boolean; mapLines:[boolean,boolean]; spadeTaken:boolean; digStage:number;
  boxOpen:boolean; bookFound:boolean;
}

export const SPRING_SAVE_KEY='between-spring-trail-v1';
const initial=():SpringSave=>({version:1,noteRead:false,plantFound:false,pouchTaken:false,phoneRead:false,ticketFound:false,ticketSolved:false,paperPlaced:false,paperClipped:false,rubbingDone:false,benchVisited:false,pocketFound:false,cabinetOpen:false,keepsakeRead:false,mapLines:[false,false],spadeTaken:false,digStage:0,boxOpen:false,bookFound:false});
type Storage={getItem(k:string):string|null;setItem(k:string,v:string):void};

/**
 * Actions: read-note, lift-saucer, take-pouch, read-phone, take-ticket,
 * align-tickets ({x:0,y:0,turn:0}), place-paper, clip-paper, rub-paper,
 * sit-bench, take-drawing, open-cabinet (['sun','leaf','ripple']),
 * read-keepsakes, map-line (['tree','marker'] | ['bridge','boulders']),
 * take-spade, dig (one of three stages), open-box, take-book, reset.
 * reset is only called by an explicit, confirmed player action.
 */
export function createSpringTreasureState(storage?:Storage){
  let state=initial();
  let hasTrailSave=false;
  const listeners=new Set<()=>void>();
  try{
    const raw=storage?.getItem(SPRING_SAVE_KEY);
    if(raw){
      const saved=JSON.parse(raw) as Partial<SpringSave>|null;
      if(saved?.version===1){
        hasTrailSave=true;
        for(const field of Object.keys(state) as (keyof SpringSave)[]){
          if(typeof state[field]==='boolean'&&typeof saved[field]==='boolean') (state as unknown as Record<string,unknown>)[field]=saved[field];
        }
        state.digStage=Math.min(3,Math.max(0,Math.floor(Number(saved.digStage)||0)));
        if(Array.isArray(saved.mapLines))state.mapLines=[saved.mapLines[0]===true,saved.mapLines[1]===true];
        // Complete discoveries survive refresh; incomplete physical operations recover safely.
        if(state.bookFound){state.boxOpen=true;state.cabinetOpen=true;state.digStage=3;}
        if(state.boxOpen){state.cabinetOpen=true;state.digStage=3;}
        if(state.rubbingDone){state.pouchTaken=true;state.paperPlaced=true;state.paperClipped=true;}
        if(state.ticketSolved){state.plantFound=true;state.ticketFound=true;}
      }
    }
  }catch{/* Private browsing, corrupt saves, and storage quotas do not block the trail. */}
  // Spring previously used the shared relic hunt. Keep its finished book available
  // after the trail upgrade; a newer trail save (including an explicit reset) wins.
  if(!hasTrailSave){
    try{
      const legacy=JSON.parse(storage?.getItem('between-seasons-relic-spring-v1')??'null');
      if(legacy?.version===1&&legacy.bookTaken===true){
        state.bookFound=true;state.boxOpen=true;state.cabinetOpen=true;state.digStage=3;
      }
    }catch{/* An unreadable older save must not block a fresh trail. */}
  }
  const persist=()=>{try{storage?.setItem(SPRING_SAVE_KEY,JSON.stringify(state));}catch{/* Keep this session playable. */}};
  const controller={
    get state(){return state;},
    snapshot:()=>state,
    subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
    act(action:string,value?:unknown){
      const next:SpringSave={...state,mapLines:[...state.mapLines]};
      switch(action){
        case 'read-note':next.noteRead=true;break;
        case 'lift-saucer':next.plantFound=true;break;
        case 'take-pouch':next.pouchTaken=true;break;
        case 'read-phone':next.phoneRead=true;break;
        case 'take-ticket':next.ticketFound=true;break;
        case 'align-tickets':{
          const p=value as {x?:number;y?:number;turn?:number}|undefined;
          if(!state.plantFound||!state.ticketFound||p?.x!==0||p?.y!==0||p?.turn!==0)return false;
          next.ticketSolved=true;break;
        }
        case 'place-paper':if(!state.pouchTaken)return false;next.paperPlaced=true;break;
        case 'clip-paper':if(!state.paperPlaced||!state.pouchTaken)return false;next.paperClipped=true;break;
        case 'rub-paper':if(!state.paperClipped||!state.pouchTaken)return false;next.rubbingDone=true;break;
        case 'sit-bench':next.benchVisited=true;break;
        case 'take-drawing':next.pocketFound=true;break;
        case 'open-cabinet':{
          if(!Array.isArray(value)||value.join('|')!=='sun|leaf|ripple')return false;
          next.cabinetOpen=true;break;
        }
        case 'read-keepsakes':if(!state.cabinetOpen)return false;next.keepsakeRead=true;break;
        case 'map-line':{
          if(!state.cabinetOpen||!Array.isArray(value)||value.length!==2)return false;
          const pair=[...value].sort().join('|');
          if(pair==='marker|tree')next.mapLines[0]=true;
          else if(pair==='boulders|bridge')next.mapLines[1]=true;
          else return false;
          break;
        }
        case 'take-spade':next.spadeTaken=true;break;
        case 'dig':if(!state.spadeTaken)return false;next.digStage=Math.min(3,state.digStage+1);break;
        case 'open-box':if(!state.cabinetOpen||state.digStage!==3)return false;next.boxOpen=true;break;
        case 'take-book':if(!state.boxOpen)return false;next.bookFound=true;break;
        case 'reset':Object.assign(next,initial());break;
        default:return false;
      }
      if(JSON.stringify(next)===JSON.stringify(state))return true;
      state=next;persist();for(const listener of listeners)listener();return true;
    },
  };
  return controller;
}

export type SpringTreasureController=ReturnType<typeof createSpringTreasureState>;
