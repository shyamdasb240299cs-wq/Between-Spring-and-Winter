/** Stable chapter identifiers; scenes are assembled from reusable components. */
export const SEASONS = {
  spring: {title:'Spring',subtitle:'Where everything begins again',sky:0xcbdbe8,fog:0xc5d3ba,sun:0xfff0dc,sunPower:2.8,exposure:1.05,ambient:0xd0e3ed,ground:0x577d37,tree:'cherry',sunDirection:[-.45,.55,-.8]},
  summer: {title:'Summer',subtitle:'A little closer to the sea',sky:0xe4b29c,fog:0xd2b5a0,sun:0xffbe79,sunPower:3.5,exposure:1.0,ambient:0xaac7de,ground:0x9d8265,tree:'palm',sunDirection:[-.42,.16,-1]},
  autumn: {title:'Autumn',subtitle:'The warmth of letting go',sky:0xe1c7a7,fog:0xd7b78e,sun:0xffd298,sunPower:3.4,exposure:1.07,ambient:0xc2d1d7,ground:0x806845,tree:'maple',sunDirection:[-.5,.38,-1]},
  winter: {title:'Winter',subtitle:'There is light in the quiet',sky:0x8f9dbb,fog:0xa5afcb,sun:0xffbd88,sunPower:2.2,exposure:1.03,ambient:0x9eb6df,ground:0x687d9f,tree:'fir',sunDirection:[-.42,.14,-1]},
} as const;
export type SeasonId=keyof typeof SEASONS;
export const isSeasonId=(id:unknown):id is SeasonId=>typeof id==='string'&&Object.hasOwn(SEASONS,id);
/** Metres, Y-up. Null cells are obstacles, deep water, or route boundaries. */
export interface SeasonNavigation {
  origin:[number,number];cell:number;width:number;depth:number;heights:(number|null)[];
  spawn:{x:number;z:number;yaw:number};
  waterLevel?:number;
  wadingDepth?:number;
}
export type SurfaceKind='grass'|'sand'|'water'|'leaves'|'snow';
export interface SeasonManifest {
  version:2;id:SeasonId;revision:string;model:string;bytes:number;triangles:number;
  navigation:SeasonNavigation;bounds:{min:[number,number,number];max:[number,number,number]};assets:string[];
}
export interface KitModel {
  name:string;source:string;author:string;license:string;notes?:string[];
  variants:{id:string;height:number;bounds:{min:number[];max:number[]};lods:Record<'near'|'mid'|'far',{url:string;triangles:number;bytes:number}>}[];
}
export interface SeasonKit {
  version:number;coordinateSystem:string;models:Record<string,KitModel>;
  textures:Record<string,{color:string;normal:string;roughness:string;sizeMetres:number;source:string;license:string}>;
  skies:Record<SeasonId,{url:string;source:string;license:string}>;
}
