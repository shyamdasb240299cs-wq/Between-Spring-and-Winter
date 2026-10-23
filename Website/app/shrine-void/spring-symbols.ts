/** Shared 80 × 80 vector artwork for the paper puzzle and physical cabinet. */
export type SpringClueSymbol='sun'|'leaf'|'ripple';
export const SPRING_CLUE_STROKES:Record<SpringClueSymbol,string[][]>={
  sun:[['M40 26a14 14 0 0 0-12.124 21','M40 10v8','M18.787 18.787l5.657 5.657','M10 40h8'],['M27.876 47a14 14 0 0 0 24.248 0','M40 62v8','M18.787 61.213l5.657-5.657'],['M52.124 47A14 14 0 0 0 40 26','M62 40h8','M55.556 24.444l5.657-5.657','M55.556 55.556l5.657 5.657']],
  leaf:[['M19 60Q9 19 62 15','M19 60l16-16'],['M62 15Q69 61 19 60','M35 44l18-20'],['M31 48l-3-14','M41 38l14 1']],
  ripple:[['M9 26q8-8 16 0t16 0','M41 40q8-8 16 0t16 0'],['M41 26q8-8 16 0t16 0','M9 54q8-8 16 0t16 0'],['M9 40q8-8 16 0t16 0','M41 54q8-8 16 0t16 0']],
};
