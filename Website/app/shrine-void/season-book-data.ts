import {chapters} from '../manga-data';
import {SEASONS,type SeasonId} from './seasons';

export interface SeasonBookPage{number:number;src:string;blank?:boolean;}
export interface SeasonBook{season:SeasonId;part:number;title:string;cover:string;pages:readonly SeasonBookPage[];}
const order:SeasonId[]=['spring','summer','autumn','winter'];
/** Add finished artwork to manga-data.ts; the scene and reader pick it up automatically. */
export function seasonBook(id:SeasonId):SeasonBook{
  const part=order.indexOf(id)+1;
  const chapter=(chapters as readonly {id:number;cover:string;pages:readonly SeasonBookPage[]}[]).find(c=>c.id===part);
  const pages:readonly SeasonBookPage[]=chapter?.pages.length?chapter.pages:Array.from({length:25},(_,i)=>({number:i+1,src:'/manga/blank.webp',blank:true}));
  return {season:id,part,title:`Part ${['One','Two','Three','Four'][part-1]} · ${SEASONS[id].title}`,cover:chapter?.cover??`/manga/part-${part}.webp`,pages};
}
export const bookProgressKey=(id:SeasonId)=>`between-seasons-reader-${id}-v1`;
export function clampBookPage(page:number,count:number){return Number.isFinite(page)?Math.max(0,Math.min(Math.max(0,count-1),Math.floor(page))):0;}
export function savedBookPage(id:SeasonId,count:number){try{return clampBookPage(Number(localStorage.getItem(bookProgressKey(id))),count);}catch{return 0;}}
