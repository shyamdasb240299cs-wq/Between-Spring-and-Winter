import { chapters } from "./manga-data";

export const READ_START = 6.65;
// The next small scroll after the letter triggers the complete timed sequence.
export const INTRO_HOLD = .16;
export const FLIP_START = READ_START + INTRO_HOLD;
export const TURN_START = .04;
export const SCROLL_SCALE = .72;
export type PrintedPage = {src:string;label:string;number:number};
const blank:PrintedPage={src:"/manga/blank.webp",label:"Blank endpaper",number:0};
const title:PrintedPage={src:"/manga/intro-letter.svg",label:"A letter from Shyamu to Aami",number:0};
const divider:PrintedPage={src:chapters[0].cover,label:"Part One · Spring",number:0};
const pages=chapters[0].pages.map(page=>({...page,label:`Page ${page.number}`}));
export const bookSheets=[
  {front:title,back:blank},
  {front:divider,back:blank},
  ...Array.from({length:11},(_,i)=>({front:pages[i*2],back:pages[i*2+1]})),
];
export const CLOSE_START = FLIP_START + .08;
export const CLOSED_REST = CLOSE_START + 1.45;
export const JOURNEY_LENGTH = CLOSE_START + 4.5;
export const clamp = (n:number,lo=0,hi=1) => Math.min(hi,Math.max(lo,n));
export const smooth = (n:number,from:number,to:number) => {const t=clamp((n-from)/(to-from));return t*t*(3-2*t);};
/** Lightweight, fully resident prints for the automatic cinematic. */
export const flipPrint = (src:string) => `/manga/flip/${src.split('/').pop()!.replace('.svg','.webp')}`;
