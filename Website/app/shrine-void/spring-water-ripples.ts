/** Metre-space rain contacts shared by river normals and visible splash droplets. */
export const SPRING_WATER_IMPACT_SPACING=1.65;
export const SPRING_WATER_IMPACT_PERIOD=1.15;
export function springWaterImpactHash(x:number,z:number){const n=((x*73+z*157)%1021+1021)%1021;return ((n*n+n*31)%4093)/4093;}
export function springWaterImpact(x:number,z:number,time:number){
  const seed=springWaterImpactHash(x,z);
  return {x:(x+.15+seed*.7)*SPRING_WATER_IMPACT_SPACING,z:(z+.15+springWaterImpactHash(x+19,z+7)*.7)*SPRING_WATER_IMPACT_SPACING,age:((time/SPRING_WATER_IMPACT_PERIOD+seed)%1+1)%1,seed};
}
export const SPRING_WATER_IMPACT_GLSL=`
  float springImpactHash(vec2 p){float n=mod(dot(p,vec2(73.,157.)),1021.);return mod(n*n+n*31.,4093.)/4093.;}
  vec2 springRainRippleGrade(vec2 p,float time,float rain){
    if(rain<.001)return vec2(0.);
    vec2 cell=floor(p/1.65),grade=vec2(0.);
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
      vec2 id=cell+vec2(float(x),float(y));float seed=springImpactHash(id);
      if(seed>rain)continue;
      vec2 hit=(id+vec2(.15)+vec2(seed,springImpactHash(id+vec2(19.,7.)))*.7)*1.65;
      float age=fract(time/1.15+seed),radius=.025+age*.34,width=.018+age*.012;
      vec2 delta=p-hit;
      // Reject empty space before evaluating the river shape and exponentials.
      // Four Gaussian widths retain every visible part of the original ring.
      if(dot(delta,delta)>.25)continue;
      float distance=length(delta),front=distance-radius;
      if(abs(front)>width*4.)continue;
      if(springPondAt(hit)>=1.||abs(hit.y+12.)<.95&&abs(hit.x-22.)<7.1)continue;
      float envelope=smoothstep(0.,.045,age)*exp(-age*3.8);
      float slope=-2.*front/(width*width)*exp(-front*front/(width*width))*.0018*envelope;
      grade+=delta/max(.001,distance)*slope;
    }
    return grade;
  }
`;
