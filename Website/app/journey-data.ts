import { chapters } from "./manga-data";

export const READ_START = 6.65;
export const PAGE_STEP = .82;
export const TURN_START = .56;
export const SCROLL_SCALE = .72;
export type PrintedPage = {src:string;label:string;number:number};
const blank:PrintedPage={src:"/manga/blank.webp",label:"Blank endpaper",number:0};
const title:PrintedPage={src:"/manga/title-letter.svg",label:"A dedication from Shyamu to Aami",number:0};
const divider:PrintedPage={src:chapters[0].cover,label:"Part One · Spring",number:0};
const pages=chapters[0].pages.map(page=>({...page,label:`Page ${page.number}`}));
export const bookSheets=[
  {front:title,back:blank},
  {front:divider,back:blank},
  ...Array.from({length:11},(_,i)=>({front:pages[i*2],back:pages[i*2+1]})),
];
export const journeySpreads=Array.from({length:bookSheets.length+1},(_,i)=>({
  left:i===0?blank:bookSheets[i-1].back,
  right:i===bookSheets.length?blank:bookSheets[i].front,
}));
export const CLOSE_START = READ_START + journeySpreads.length * PAGE_STEP;
export const JOURNEY_LENGTH = CLOSE_START + 4.6;
export const journeyProgressKey = "between-seasons-physical-v5";
export const clamp = (n:number,lo=0,hi=1) => Math.min(hi,Math.max(lo,n));
export const smooth = (n:number,from:number,to:number) => {const t=clamp((n-from)/(to-from));return t*t*(3-2*t);};
export const focusedSide=(index:number,fraction:number,mobile:boolean):"left"|"right"=>{
  if(index===bookSheets.length)return "left";
  return mobile&&index>2&&fraction<.4?"left":"right";
};
