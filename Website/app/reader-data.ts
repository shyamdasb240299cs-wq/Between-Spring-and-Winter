import { chapters } from "./manga-data";
export type ReadingPage = { src: string; label: string; chapter: number; kind: "cover" | "divider" | "page" | "blank" };
const blank = (label:string):ReadingPage => ({src:"/manga/blank.webp",label,chapter:1,kind:"blank"});
export const readingPages: ReadingPage[] = [
  {src:"/manga/cover-front.webp",label:"Front cover",chapter:1,kind:"cover"},
  blank("Inside front cover"),
  {src:chapters[0].cover,label:"Part One · Spring",chapter:1,kind:"divider"},
  blank("Part One · reverse"),
  ...chapters[0].pages.map(p=>({src:p.src,label:"Page "+p.number,chapter:1,kind:"page" as const})),
  blank("Inside back cover"),
  {src:"/manga/cover-back.webp",label:"Part One complete",chapter:1,kind:"cover"}
];
export const chapterStart = (_id:number)=>2;
export const progressKey = "between-seasons-part-one-v2";
