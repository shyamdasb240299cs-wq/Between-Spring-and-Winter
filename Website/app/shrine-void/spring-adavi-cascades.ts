import * as THREE from 'three';

const random=(n:number)=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);};
/** Narrow rock shelves produce drops rather than long, sloping water ramps. */
export const ADAVI_CASCADE_FALLS=[{start:.180,end:.202,height:.90},{start:.476,end:.496,height:.75},{start:.704,end:.726,height:.80}] as const;
type CascadeOptions={
  branch:THREE.CatmullRomCurve3;levelAt:(t:number)=>number;mobile:boolean;
  waterMaterial:THREE.ShaderMaterial;normal:THREE.Texture;
  keep:<T extends THREE.BufferGeometry>(geometry:T)=>T;
  material:<T extends THREE.Material>(material:T)=>T;
};

/** Rounded, flowing water and contact effects; all motion stays on the GPU. */
export function createAdaviCascades({branch,levelAt,mobile,waterMaterial,normal,keep,material}:CascadeOptions){
  const group=new THREE.Group();group.name='Thick cascade water, plunge foam and contact spray';
  const positions:number[]=[],uvs:number[]=[],directions:number[]=[],indices:number[]=[];
  const lengthSegments=mobile?32:52,crossSegments=mobile?20:32;
  // Sweep an actual closed cross-section along the three-dimensional descent.
  // Thickness is perpendicular to flow, so the lip and side shoulders remain
  // visible from the bank instead of collapsing to a vertical offset sheet.
  for(const [index,fall]of ADAVI_CASCADE_FALLS.entries()){
    const offset=positions.length/3;
    for(let row=0;row<=lengthSegments;row++){
      const progress=row/lengthSegments,t=THREE.MathUtils.lerp(fall.start-.024,fall.end+.035,progress),point=branch.getPoint(t),tangent=branch.getTangent(t);
      const before=branch.getPoint(t-.0005),after=branch.getPoint(t+.0005),flow=new THREE.Vector3(after.x-before.x,levelAt(t+.0005)-levelAt(t-.0005),after.z-before.z).normalize();
      const across=new THREE.Vector3(tangent.z,0,-tangent.x).normalize(),surfaceNormal=flow.clone().cross(across).normalize();
      const falling=Math.sin(Math.PI*THREE.MathUtils.smoothstep(progress,.06,.94)),width=(.98+Math.sin(t*2.1)*.42)*(.985+.012*Math.sin(t*91+index));
      const depth=.045+falling*.145,centre=new THREE.Vector3(point.x,levelAt(t),point.z).addScaledVector(surfaceNormal,-depth);
      for(let column=0;column<=crossSegments;column++){
        const angle=column/crossSegments*Math.PI*2,cross=Math.cos(angle),roundness=Math.sign(Math.sin(angle))*Math.pow(Math.abs(Math.sin(angle)),.48);
        const edgeRipple=Math.sin(progress*38+cross*12+index)*.008;
        const vertex=centre.clone().addScaledVector(across,cross*width).addScaledVector(surfaceNormal,roundness*depth+edgeRipple);
        positions.push(vertex.x,vertex.y,vertex.z);
        directions.push(flow.x,flow.y,flow.z);
        uvs.push(cross*.5+.5,t*24);
        if(row<lengthSegments&&column<crossSegments){const a=offset+row*(crossSegments+1)+column,b=a+crossSegments+1;indices.push(a,a+1,b,a+1,b+1,b);}
      }
    }
    // End caps close the swept water body under the adjoining creek surface.
    for(const row of [0,lengthSegments]){const base=offset+row*(crossSegments+1),centre=positions.length/3;let x=0,y=0,z=0;for(let n=0;n<crossSegments;n++){x+=positions[(base+n)*3];y+=positions[(base+n)*3+1];z+=positions[(base+n)*3+2];}positions.push(x/crossSegments,y/crossSegments,z/crossSegments);directions.push(directions[base*3],directions[base*3+1],directions[base*3+2]);uvs.push(.5,(row===0?fall.start-.024:fall.end+.035)*24);for(let n=0;n<crossSegments;n++)row===0?indices.push(centre,base+n+1,base+n):indices.push(centre,base+n,base+n+1);}
  }
  const volume=keep(new THREE.BufferGeometry());volume.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));volume.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));volume.setAttribute('flowDirection',new THREE.Float32BufferAttribute(directions,3));volume.setIndex(indices);volume.computeVertexNormals();
  // The UV seam deliberately duplicates its vertices. Average their normals so
  // the curved shoulders do not acquire a stationary, bright zipper in sunlight.
  const normals=volume.getAttribute('normal'),seamNormal=new THREE.Vector3();
  const verticesPerFall=(lengthSegments+1)*(crossSegments+1)+2;
  for(let fall=0;fall<ADAVI_CASCADE_FALLS.length;fall++)for(let row=0;row<=lengthSegments;row++){
    const first=fall*verticesPerFall+row*(crossSegments+1),last=first+crossSegments;
    seamNormal.fromBufferAttribute(normals,first).add(new THREE.Vector3().fromBufferAttribute(normals,last)).normalize();
    normals.setXYZ(first,seamNormal.x,seamNormal.y,seamNormal.z);normals.setXYZ(last,seamNormal.x,seamNormal.y,seamNormal.z);
  }
  volume.computeBoundingBox();volume.boundingBox!.expandByScalar(.045);volume.boundingSphere=volume.boundingBox!.getBoundingSphere(new THREE.Sphere());
  const fallingWater=new THREE.Mesh(volume,waterMaterial);fallingWater.name='Rounded water thickness over three rock shelves';fallingWater.renderOrder=2;group.add(fallingWater);

  const poolPositions:number[]=[],poolUVs:number[]=[],poolSeeds:number[]=[],poolIndices:number[]=[];
  const sprayPositions:number[]=[],velocities:number[]=[],seeds:number[]=[],sizes:number[]=[],kinds:number[]=[],lifetimes:number[]=[];
  ADAVI_CASCADE_FALLS.forEach((fall,index)=>{
    const t=fall.end+.009,point=branch.getPoint(t),tangent=branch.getTangent(t),across=new THREE.Vector3(tangent.z,0,-tangent.x),width=(.98+Math.sin(t*2.1)*.42)*.88;
    const derivative=branch.getPoint(t+.001).distanceTo(branch.getPoint(t-.001))/.002;
    const offset=poolPositions.length/3,segments=mobile?28:44,rings=8;
    // Follow the creek's actual downstream level at every pool vertex, rather than
    // floating horizontal foam above the sloping bed or emitting from the fall's lip.
    const poolVertex=(x:number,z:number)=>{
      // Keep the entire oval downstream. Clamping a centred oval at the foot
      // folded half of it onto the same cross-stream line, causing foam seams.
      const down=(z+1)*.64+.025;
      const surfaceT=THREE.MathUtils.clamp(t+down/derivative,fall.end+.002,1),centre=branch.getPoint(surfaceT),direction=branch.getTangent(surfaceT);
      poolPositions.push(centre.x+direction.z*x*width,levelAt(surfaceT)+.028,centre.z-direction.x*x*width);poolUVs.push(x,z);poolSeeds.push(index*.37);
    };
    poolVertex(0,0);
    for(let ring=1;ring<=rings;ring++)for(let segment=0;segment<=segments;segment++){
      const theta=segment/segments*Math.PI*2,r=ring/rings;poolVertex(Math.cos(theta)*r,Math.sin(theta)*r);
      if(segment<segments){const a=offset+1+(ring-1)*(segments+1)+segment;
        if(ring===1)poolIndices.push(offset,a,a+1);
        if(ring<rings){const b=a+segments+1;poolIndices.push(a,b,a+1,a+1,b,b+1);}
      }
    }
    for(let n=0;n<(mobile?34:76);n++){
      const key=n+index*121,seed=random(key+3200),mist=n%4===0,lateral=(random(key+3300)*2-1)*width*.72,forward=random(key+3400)*.22;
      sprayPositions.push(point.x+across.x*lateral+tangent.x*forward,levelAt(t)+.035,point.z+across.z*lateral+tangent.z*forward);
      const sideSpeed=(random(key+3500)*2-1)*(mist?.40:.65),downSpeed=(mist?.22:.35)+random(key+3600)*.65;
      velocities.push(across.x*sideSpeed+tangent.x*downSpeed,(mist?.60:1.05)+random(key+3700)*(mist?.55:1.18),across.z*sideSpeed+tangent.z*downSpeed);
      seeds.push(seed);sizes.push(mist?14+random(key+3800)*16:2.2+random(key+3800)*2.4);kinds.push(mist?1:0);
      // Rebound droplets die at their next water contact (2vy/g), rather than
      // spending half a looping lifetime invisibly travelling below the river.
      lifetimes.push(mist?1.05:velocities[velocities.length-2]/2.65);
    }
  });
  const poolGeometry=keep(new THREE.BufferGeometry());poolGeometry.setAttribute('position',new THREE.Float32BufferAttribute(poolPositions,3));poolGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(poolUVs,2));poolGeometry.setAttribute('poolSeed',new THREE.Float32BufferAttribute(poolSeeds,1));poolGeometry.setIndex(poolIndices);
  const contactUniforms={time:waterMaterial.uniforms.time,normalSampler:{value:normal}};
  const poolMaterial=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:contactUniforms,
    vertexShader:`attribute float poolSeed;varying vec2 vPool;varying float vSeed;varying vec3 vWorld;void main(){vPool=uv;vSeed=poolSeed;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform sampler2D normalSampler;uniform float time;varying vec2 vPool;varying float vSeed;varying vec3 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){float radius=length(vPool),edge=1.-smoothstep(.66,1.,radius);vec2 flow=vPool*vec2(1.,1.5)-vec2(0.,time*.40+vSeed);
        vec2 distortion=(texture2D(normalSampler,flow*.65).xy-.5)*.17;float cells=noise((flow+distortion)*18.);float fine=noise(flow*43.+time*.21);
        vec2 contact=vPool-vec2(0.,-.62);float impact=exp(-dot(contact*vec2(1.25,1.6),contact*vec2(1.25,1.6))*3.0);float lace=smoothstep(.43,.67,cells)*(.65+fine*.35);
        float churn=(impact*.72+lace*.68)*edge;
        // Distorted, broken rings become downstream wakes rather than a
        // perfectly circular, synchronized bullseye at every plunge pool.
        float contactRadius=length(contact);float ripplePhase=(contactRadius+distortion.x*.19)*36.-time*(4.7+vSeed*.8)-vSeed*6.;
        float ripple=pow(max(0.,sin(ripplePhase)),13.)*smoothstep(.20,.40,contactRadius)*edge*smoothstep(.25,.72,fine);
        float alpha=clamp(churn*.80+ripple*.34,0.,.87);if(alpha<.012)discard;vec3 colour=mix(vec3(.53,.72,.65),vec3(.95,.985,.94),clamp(impact*.7+lace*.62+ripple*.35,0.,1.));
        colour=mix(colour,vec3(.60,.66,.60),1.-exp(-length(cameraPosition-vWorld)*.012));gl_FragColor=vec4(colour,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}));
  const pools=new THREE.Mesh(poolGeometry,poolMaterial);pools.name='Aerated plunge pools and expanding contact ripples';pools.renderOrder=4;group.add(pools);

  const sprayGeometry=keep(new THREE.BufferGeometry());sprayGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sprayPositions,3));sprayGeometry.setAttribute('velocity',new THREE.Float32BufferAttribute(velocities,3));sprayGeometry.setAttribute('seed',new THREE.Float32BufferAttribute(seeds,1));sprayGeometry.setAttribute('particleSize',new THREE.Float32BufferAttribute(sizes,1));sprayGeometry.setAttribute('kind',new THREE.Float32BufferAttribute(kinds,1));sprayGeometry.setAttribute('lifetime',new THREE.Float32BufferAttribute(lifetimes,1));
  // Bounding volumes include the shader-driven ballistic spray, so it never pops
  // out when its static emission point moves just beyond the view's edge.
  sprayGeometry.computeBoundingBox();sprayGeometry.boundingBox!.expandByScalar(1.4);sprayGeometry.boundingSphere=sprayGeometry.boundingBox!.getBoundingSphere(new THREE.Sphere());
  const sprayMaterial=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:waterMaterial.uniforms.time},
    vertexShader:`uniform float time;attribute vec3 velocity;attribute float seed,particleSize,kind,lifetime;varying float vLife,vMist,vHeight,vDistanceFade,vSeed;
      void main(){vLife=fract(seed+time/lifetime);vMist=kind;vSeed=seed;float age=vLife*lifetime;vec3 p=position+velocity*age;p.y-=mix(2.65,.55,kind)*age*age;p.xz+=vec2(sin(age*3.+seed*31.),cos(age*2.+seed*21.))*kind*age*.10;vHeight=p.y-position.y;
        vec4 view=modelViewMatrix*vec4(p,1.);vDistanceFade=1.-smoothstep(25.,48.,-view.z);gl_Position=projectionMatrix*view;gl_PointSize=clamp(particleSize*(kind>.5?1.+vLife*1.8:1.)*18./max(1.,-view.z),1.,kind>.5?32.:5.5);}`,
    fragmentShader:`varying float vLife,vMist,vHeight,vDistanceFade,vSeed;void main(){vec2 p=gl_PointCoord-.5;float radius=length(p);float soft=1.-smoothstep(vMist>.5?.02:.22,.5,radius);
        float mistBreakup=.76+.24*sin(p.x*16.+vSeed*18.+vLife*2.)*sin(p.y*19.-vLife*3.);soft*=mix(1.,mistBreakup,vMist);
        float fade=sin(vLife*3.14159265)*smoothstep(-.055,.025,vHeight)*vDistanceFade;float alpha=soft*fade*mix(.75,.075,vMist);if(alpha<.003)discard;gl_FragColor=vec4(.91,.98,.94,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}));
  const spray=new THREE.Points(sprayGeometry,sprayMaterial);spray.name='Ballistic cascade droplets and drifting impact mist';spray.renderOrder=5;group.add(spray);
  return group;
}
