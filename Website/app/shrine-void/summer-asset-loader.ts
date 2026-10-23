import type {Object3D} from 'three';

/** Local, licensed source models: no third-party fetches during gameplay. */
export const SUMMER_IMPORTED_ASSETS={
  'scanned-pier':'/seasons/kit/summer/realism/modular_wooden_pier.glb',
  'reef-limestone':'/seasons/kit/summer/realism/coast_land_rocks_04.glb',
  'summer-diver':'/seasons/kit/summer/imported/summer-wetsuit.glb',
  'summer-scuba-gear':'/seasons/kit/summer/imported/summer-scuba-equipment.glb',
  'coral-branch':'/seasons/kit/summer/coral-branch.glb',
  'coral-fan':'/seasons/kit/summer/coral-fan.glb',
  'coral-mound':'/seasons/kit/summer/coral-mound.glb',
  'coral-table':'/seasons/kit/summer/coral-table.glb',
  'fish-butterfly':'/seasons/kit/summer/fish-butterfly.glb',
  'fish-silver':'/seasons/kit/summer/fish-silver.glb',
  'fish-lagoon':'/seasons/kit/summer/fish-lagoon.glb',
} as const;

/** The scene supplies its existing loader so ownership/disposal stays centralized. */
export async function loadSummerImportedTemplates(load:(url:string)=>Promise<Object3D>):Promise<Record<string,Object3D>>{
  return Object.fromEntries(await Promise.all(Object.entries(SUMMER_IMPORTED_ASSETS).map(async([key,url])=>[key,await load(url)])));
}
