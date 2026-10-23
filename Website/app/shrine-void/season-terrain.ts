import * as THREE from 'three';
import {createLeafTexture} from './season-leaf';
import type {GroundMotion} from './season-ground-motion';
import type {SeasonId} from './seasons';
import {springPathDistance,springClearance} from './spring-treasure-layout';
import {groundHeight,random,smooth,autumnPathDistance,autumnLakeDistance,AUTUMN_LAKE_LEVEL,lakeShapeGLSL,type SeasonLayout} from './season-layout';
import {SUMMER_GROUND_GLSL,summerTerrainSegments} from './summer-layout';

export interface GroundMaps {color:THREE.Texture;normal:THREE.Texture;roughness:THREE.Texture;sizeMetres:number;}
function mapleLeaf(c:CanvasRenderingContext2D,x:number,y:number,size:number,angle:number,colour:string){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
  const points=[[0,.62],[-.06,.22],[-.42,.28],[-.32,.08],[-.62,-.05],[-.42,-.13],[-.5,-.39],[-.24,-.3],[-.23,-.58],[-.09,-.47],[0,-.83],[.12,-.48],[.29,-.59],[.27,-.31],[.52,-.4],[.43,-.13],[.63,-.04],[.34,.09],[.43,.29],[.07,.22]];
  c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.fillStyle=colour;c.fill();
  c.strokeStyle='#50280b70';c.lineWidth=.014;c.stroke();c.beginPath();c.moveTo(0,.65);c.lineTo(0,-.72);
  for(const [px,py]of [[-.43,-.3],[-.46,-.06],[.45,-.3],[.45,-.06],[-.28,.15],[.28,.15]]){c.moveTo(0,.18);c.lineTo(px,py);}c.stroke();c.restore();
}
function leafCarpet(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;c.fillStyle='#60462a';c.fillRect(0,0,512,512);
  const colours=['#dda623','#e9bb2f','#ad3b20','#d36c20','#ebc653','#9b3819','#c78516'];
  for(let n=0;n<1150;n++){
    const x=random(n+181)*512,y=random(n+933)*512,size=12+random(n+290)*18,a=random(n)*6.28;c.shadowBlur=2;c.shadowColor='#24130670';c.shadowOffsetY=.8;
    for(const ox of [-512,0,512])for(const oy of [-512,0,512])if(x+ox>-35&&x+ox<547&&y+oy>-35&&y+oy<547)mapleLeaf(c,x+ox,y+oy,size,a,colours[n%colours.length]);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return texture;
}

export function createTerrain(id:SeasonId,base:GroundMaps,path:GroundMaps,mobile:boolean,forest?:GroundMaps,reef?:GroundMaps){
  const group=new THREE.Group(),chunks:{mesh:THREE.Mesh;centre:THREE.Vector3;geometries:THREE.BufferGeometry[]}[]=[];
  group.name='Sculpted seasonal terrain';
  const material=new THREE.MeshStandardMaterial({map:base.color,roughness:.94,color:id==='winter'?0xf3f5ff:0xffffff});
  const litter=id==='autumn'?leafCarpet():base.color;
  let trail:THREE.CanvasTexture|undefined;
  if(id==='spring'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=384;const context=canvas.getContext('2d')!,pixels=context.createImageData(384,384);
    for(let row=0;row<384;row++)for(let col=0;col<384;col++){
      const x=col/383*76-38,z=(1-row/383)*76-41,route=1-smooth(.65,1.35,springPathDistance(x,z)),wet=smooth(.63,.95,Math.sin(x*.63+z*.21)*Math.sin(z*.58-x*.13));
      const i=(row*384+col)*4;pixels.data[i]=Math.round(route*255);pixels.data[i+1]=Math.round(wet*255);pixels.data[i+2]=0;pixels.data[i+3]=255;
    }
    context.putImageData(pixels,0,0);trail=new THREE.CanvasTexture(canvas);trail.flipY=true;trail.colorSpace=THREE.NoColorSpace;trail.generateMipmaps=false;
  }
  // A fixed ring of sole stamps avoids allocating meshes or rebuilding the snow.
  const snowSteps=Array.from({length:24},()=>new THREE.Vector4()),snowCount={value:0},terrainTime={value:0};let snowHead=0;
  material.customProgramCacheKey=()=>`season-ground-${id}-snow-lake-v2`;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{
      leafLitter:{value:litter},groundMap:{value:base.color},pathMap:{value:path.color},groundNormal:{value:base.normal},pathNormal:{value:path.normal},groundRoughness:{value:base.roughness},pathRoughness:{value:path.roughness},
      groundScale:{value:base.sizeMetres},pathScale:{value:path.sizeMetres},seasonIndex:{value:['spring','summer','autumn','winter'].indexOf(id)},
      snowSteps:{value:snowSteps},snowCount,terrainTime,
      reefTime:terrainTime,reefMap:{value:reef?.color??base.color},reefNormal:{value:reef?.normal??base.normal},
      springTrail:{value:trail??base.color},
      forestMap:{value:forest?.color??base.color},forestNormal:{value:forest?.normal??base.normal},forestRoughness:{value:forest?.roughness??base.roughness},
    });
    shader.vertexShader='varying vec3 vGroundWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`varying vec3 vGroundWorld;
      uniform sampler2D reefMap,reefNormal,groundMap,pathMap,groundNormal,pathNormal,groundRoughness,pathRoughness,leafLitter,springTrail,forestMap,forestNormal,forestRoughness;uniform float groundScale,pathScale,reefTime;uniform int seasonIndex;
      ${lakeShapeGLSL}
      ${SUMMER_GROUND_GLSL}
      float pathBlend(){
        if(seasonIndex==0)return texture2D(springTrail,(vGroundWorld.xz+vec2(38.,41.))/76.).r*.62;if(seasonIndex==1)return (1.-smoothstep(.85,1.8,summerPathAt(vGroundWorld.xz)))*(1.-smoothstep(.65,.84,summerIslandAt(vGroundWorld.xz)));float z=vGroundWorld.z;float centre=sin(z*.075)*.8+sin(z*.17)*.22;float d=abs(vGroundWorld.x-centre);
        float edge=sin(z*2.3+vGroundWorld.x*2.)*.10+sin(z*.73)*.12;float route=1.-smoothstep(1.05,1.9,d+edge);
        if(seasonIndex==2){route=(1.-smoothstep(1.05,1.9,autumnPathAt(vGroundWorld.xz)+edge))*smoothstep(1.01,1.10,autumnLakeAt(vGroundWorld.xz));}return route;
      }
      ${id==='winter'?`uniform vec4 snowSteps[24];uniform int snowCount;uniform float terrainTime;
      vec3 snowTrack(vec2 p){float compression=0.;vec2 grade=vec2(0.);for(int i=0;i<24;i++){if(i>=snowCount)break;
          vec4 step=snowSteps[i];vec2 offset=p-step.xy;if(dot(offset,offset)>.13)continue;float a=step.z,c=cos(a),s=sin(a);vec2 q=mat2(c,-s,s,c)*offset;
          float width=mix(.078,.105,1.-smoothstep(-.12,.02,q.y));float sole=length(q/vec2(width,.255));
          float fade=1.-smoothstep(75.,150.,max(0.,terrainTime-step.w));float t=clamp((sole-.55)/.49,0.,1.),dent=(1.-t*t*(3.-2.*t))*fade;
          if(dent>compression){compression=dent;vec2 localGrade=q/(vec2(width*width,.065025)*max(sole,.001))*(-6.*t*(1.-t)/.49)*fade;grade=mat2(c,s,-s,c)*localGrade;}
        }return vec3(compression,grade);
      }`:''}
      \n`+shader.fragmentShader
      .replace('#include <map_fragment>',`float route=pathBlend();vec2 guv=vGroundWorld.xz/max(.5,groundScale),puv=vGroundWorld.xz/max(.5,pathScale);
        vec3 grass=texture2D(groundMap,guv).rgb,soil=texture2D(pathMap,puv).rgb;
        float macro=.94+.06*sin(vGroundWorld.x*.63+sin(vGroundWorld.z*.33))+.035*sin(vGroundWorld.z*1.7+vGroundWorld.x*.5);
        if(seasonIndex==0){float greenValue=dot(grass,vec3(.25,.6,.15));grass=mix(grass,vec3(greenValue*.24,greenValue*.79,greenValue*.12),.80);soil*=vec3(.72,.76,.66);}
        if(seasonIndex==2)grass=mix(grass,texture2D(leafLitter,vGroundWorld.xz/2.8).rgb,.12);
        vec3 groundColour=mix(grass,soil,route)*macro;
        float forestBlend=0.;float pondBank=0.;
        if(seasonIndex==1){forestBlend=(1.-smoothstep(.65,.84,summerIslandAt(vGroundWorld.xz)+sin(vGroundWorld.x*1.2)*sin(vGroundWorld.z*.7)*.009))*smoothstep(.1,.7,vGroundWorld.y);pondBank=1.-smoothstep(1.02,1.42,summerPondAt(vGroundWorld.xz));
          vec3 meadow=texture2D(forestMap,guv).rgb*vec3(.72,.88,.57),mud=soil*vec3(.53,.56,.43);
          float litter=.16+.15*smoothstep(-.3,.7,sin(vGroundWorld.x*.53+vGroundWorld.z*.18)*sin(vGroundWorld.z*.67));
          vec3 interior=mix(meadow,mud,max(route*.85,max(litter,pondBank*.83)))*macro;
          groundColour=mix(grass*macro,interior,forestBlend);
          float shellGrain=.985+.015*sin(vGroundWorld.x*51.+sin(vGroundWorld.z*21.))*sin(vGroundWorld.z*47.);groundColour*=shellGrain;
          float wet=1.-smoothstep(-.035,.35,vGroundWorld.y);groundColour*=mix(vec3(1.04,1.035,1.02),vec3(.53,.59,.62),wet);
          if(vGroundWorld.y<-.2){vec2 p=vGroundWorld.xz;vec3 seabedSand=texture2D(groundMap,p/max(.5,groundScale)).rgb;float sediment=smoothstep(-.25,.55,sin(p.x*.19+sin(p.y*.12)*2.)*sin(p.y*.23-p.x*.07));vec3 rubble=texture2D(reefMap,p/2.4).rgb;seabedSand=mix(seabedSand,rubble,sediment*.78);vec2 flow=p*.65+vec2(sin(p.y*.8+reefTime*.38),cos(p.x*.7-reefTime*.31))*.32;float caustic=pow(1.-abs(sin(flow.x+flow.y)*sin(flow.x-flow.y)),18.);float softLight=1.+caustic*.16*exp(vGroundWorld.y*.055);groundColour=mix(groundColour,seabedSand*vec3(1.08,1.04,.91),.76)*softLight;groundColour*=vec3(exp(vGroundWorld.y*.007),1.,1.015);}}
        if(seasonIndex==2){float bank=1.-smoothstep(1.05,1.26,autumnLakeAt(vGroundWorld.xz));groundColour=mix(groundColour,soil*vec3(.56,.60,.51),bank*.74);}
        if(seasonIndex==3){groundColour=mix(grass,grass*.87,route)*macro;groundColour*=vec3(.94,.97,1.04);}
        ${id==='winter'?'vec3 snowPrint=snowTrack(vGroundWorld.xz);float footprint=snowPrint.x;groundColour*=mix(vec3(1.),vec3(.61,.69,.80),footprint*.72);':''}
        diffuseColor.rgb*=groundColour;`)
      .replace('#include <roughnessmap_fragment>',`float surfaceRoughness=mix(texture2D(groundRoughness,guv).g,texture2D(pathRoughness,puv).g,route);float roughnessFactor=roughness*mix(.84,1.,surfaceRoughness);
        if(seasonIndex==1){roughnessFactor=mix(.32,.89+surfaceRoughness*.1,smoothstep(.0,.35,vGroundWorld.y));roughnessFactor=mix(roughnessFactor,mix(.84,.49,max(route*.45,pondBank)),forestBlend);if(vGroundWorld.y<-.2)roughnessFactor=.96;}
        if(seasonIndex==2)roughnessFactor=mix(.65,.96,smoothstep(1.06,1.26,autumnLakeAt(vGroundWorld.xz)));
        if(seasonIndex==0){float wet=texture2D(springTrail,(vGroundWorld.xz+vec2(38.,41.))/76.).g;roughnessFactor=mix(roughnessFactor,.49,wet*.5);}
        ${id==='winter'?'roughnessFactor=mix(roughnessFactor,.75,footprint);':''}`)
      .replace('#include <normal_fragment_maps>',`vec3 gn=texture2D(groundNormal,guv).xyz*2.-1.;vec3 pn=texture2D(pathNormal,puv).xyz*2.-1.;
        vec2 surfaceBump=mix(gn.xy,pn.xy,route);
        if(seasonIndex==1){vec2 fn=texture2D(forestNormal,guv).xy*2.-1.;surfaceBump=mix(surfaceBump,mix(fn,pn.xy,max(route,pondBank))*.7,forestBlend);float dry=smoothstep(.02,.35,vGroundWorld.y);float ripple=sin(vGroundWorld.z*29.+sin(vGroundWorld.x*1.9)*.6);surfaceBump.y+=ripple*.11*dry*(1.-forestBlend);surfaceBump*=mix(.2,.8,dry);if(vGroundWorld.y<-.2){vec2 p=vGroundWorld.xz;float sediment=smoothstep(-.25,.55,sin(p.x*.19+sin(p.y*.12)*2.)*sin(p.y*.23-p.x*.07));surfaceBump=mix(gn.xy,(texture2D(reefNormal,p/2.4).xy*2.-1.),sediment*.78)*.65;surfaceBump.y+=sin(p.y*19.+sin(p.x*.58)*1.7)*.20*(1.-sediment);}}
        normal=normalize(normal+mat3(viewMatrix)*vec3(surfaceBump.x,0.,surfaceBump.y)*.3);
        ${id==='winter'?'normal=normalize(normal+mat3(viewMatrix)*vec3(snowPrint.y,0.,snowPrint.z)*.014);':''}`);
  };
  const extent=id==='summer'?96:112;
  for(let z=-extent;z<extent;z+=16)for(let x=id==='summer'?-80:-extent;x<(id==='summer'?240:extent);x+=16){
    const distance=Math.hypot(x+8,z+11),segments=id==='summer'?summerTerrainSegments(x,z,mobile):distance<32?(mobile?24:40):distance<65?12:6;
    const geometries=[segments].map(segments=>{
      const geometry=new THREE.PlaneGeometry(16,16,segments,segments);geometry.rotateX(-Math.PI/2);
      const positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const wx=x+8+positions.getX(i),wz=z+8+positions.getZ(i);positions.setXYZ(i,wx,groundHeight(id,wx,wz),wz);
      }
      const normals=geometry.attributes.normal,n=new THREE.Vector3();
      for(let i=0;i<positions.count;i++){const wx=positions.getX(i),wz=positions.getZ(i),e=.05;
        n.set(groundHeight(id,wx-e,wz)-groundHeight(id,wx+e,wz),2*e,groundHeight(id,wx,wz-e)-groundHeight(id,wx,wz+e)).normalize();normals.setXYZ(i,n.x,n.y,n.z);}
      geometry.computeBoundingSphere();return geometry;
    });
    const mesh=new THREE.Mesh(geometries[0],material);mesh.receiveShadow=true;mesh.name=`Ground ${x},${z}`;group.add(mesh);
    chunks.push({mesh,geometries,centre:new THREE.Vector3(x+8,0,z+8)});
  }
  return {
    group,
    stepSnow(x:number,z:number,yaw:number,time:number){if(id!=='winter')return;snowSteps[snowHead].set(x,z,yaw,time);snowHead=(snowHead+1)%snowSteps.length;snowCount.value=Math.min(snowCount.value+1,snowSteps.length);terrainTime.value=time;},
    update(camera:THREE.Camera,time=0){terrainTime.value=time;if(id==='summer')for(const c of chunks)c.mesh.visible=Math.hypot(c.centre.x-camera.position.x,c.centre.z-camera.position.z)<(camera.position.y<-.2?75:185);},
    dispose(){for(const c of chunks)c.geometries.forEach(g=>g.dispose());material.dispose();trail?.dispose();if(id==='autumn')litter.dispose();},
  };
}

/** The photographed meadow mesh keeps its authored 3D shape and atlas UVs. */
export function createGroundCover(id:SeasonId,layout:SeasonLayout,mobile:boolean,grassSource?:THREE.Object3D,motion?:GroundMotion){
  const group=new THREE.Group();group.name='Photographed meadow and fallen leaves';
  const grass=id==='spring',leaves=id==='autumn',clock={value:0};
  let geometry:THREE.BufferGeometry|undefined,material:THREE.MeshStandardMaterial|undefined,ownedMap:THREE.Texture|undefined;
  if(grass&&grassSource){
    grassSource.updateMatrixWorld(true);
    grassSource.traverse(o=>{if(!geometry&&o instanceof THREE.Mesh&&!Array.isArray(o.material)&&o.material instanceof THREE.MeshStandardMaterial){
      const authored=o.geometry.clone().applyMatrix4(o.matrixWorld) as THREE.BufferGeometry;authored.computeBoundingBox();const bounds=authored.boundingBox!,height=Math.max(.001,bounds.max.y-bounds.min.y);
      authored.translate(-(bounds.max.x+bounds.min.x)*.5,-bounds.min.y,-(bounds.max.z+bounds.min.z)*.5);authored.scale(1/height,1/height,1/height);geometry=authored;
      material=o.material.clone();material.side=THREE.DoubleSide;material.transparent=false;material.alphaTest=.38;material.roughness=1;material.metalness=0;
      material.color.set(0xd5e1c0);material.emissive.set(0);material.emissiveIntensity=0;material.normalScale.set(.4,.4);material.envMapIntensity=.65;
    }});
  }
  if(leaves){
    ownedMap=createLeafTexture();
    geometry=new THREE.PlaneGeometry(1,1,3,3);geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,Math.abs(p.getX(i))*.28+Math.sin(p.getZ(i)*5)*.10);geometry.computeVertexNormals();
    material=new THREE.MeshStandardMaterial({map:ownedMap,alphaTest:.38,side:THREE.DoubleSide,roughness:.94});
  }
  const tiles:{mesh:THREE.InstancedMesh;centre:THREE.Vector3;full:number}[]=[],transform=new THREE.Object3D(),colour=new THREE.Color();
  if(geometry&&material){
    material.customProgramCacheKey=()=>grass?'authored-meadow-daylight-v2':'curled-autumn-leaves';
    material.onBeforeCompile=shader=>{
      shader.uniforms.meadowTime=clock;
      if(grass){
        shader.vertexShader='uniform float meadowTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat phase=instanceMatrix[3].x*.8+instanceMatrix[3].z*.6;transformed.x+=sin(meadowTime*1.15+phase+position.y*1.8)*position.y*position.y*.055;`);
        // Retain the scanned blades, while removing their baked brown cast.
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nfloat green=clamp(dot(diffuseColor.rgb,vec3(.25,.6,.15))*4.5,0.,1.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(green*.16,green*.26,green*.065),.38);`);
      }
    };
    motion?.apply(material,grass?'grass':'leaf');
    for(let tz=grass?-40:-32;tz<(grass?40:32);tz+=8)for(let tx=grass?-40:-32;tx<(grass?40:32);tx+=8){
      if(Math.hypot(tx+4,tz+7)>(grass?39:33))continue;
      const radius=Math.hypot(tx+4,tz+7),count=grass?(mobile?(radius<17?115:35):(radius<17?320:75)):(mobile?900:2500),positions:{x:number;z:number;seed:number}[]=[];
      for(let n=0;n<count*4&&positions.length<count;n++){
        const seed=(tz+48)*137+(tx+48)*79+n*7+10000,x=tx+random(seed+2)*8,z=tz+random(seed)*8,r=Math.hypot(x,z+3);
        if(r>(grass?36:30))continue;
        if(grass&&springClearance(x,z))continue;
        if(grass&&Math.abs(x-layout.prop.x)<1.83&&Math.abs(z-layout.prop.z)<1.48)continue;
        if(leaves&&(autumnLakeDistance(x,z)<1.08||groundHeight(id,x,z)<=AUTUMN_LAKE_LEVEL+.05))continue;
        const road=leaves?autumnPathDistance(x,z):0;
        if(leaves&&road<1.25&&random(seed+3)<.66)continue;
        if(layout.obstacles.some(o=>(x-o.x)**2+(z-o.z)**2<o.radius**2))continue;
        positions.push({x,z,seed});
      }
      if(!positions.length)continue;
      const mesh=new THREE.InstancedMesh(geometry,material,positions.length);mesh.receiveShadow=true;mesh.name=grass?'Scanned short meadow tufts':'Yellow and red maple litter';
      positions.forEach((p,i)=>{
        const size=grass?.065+random(p.seed+8)*.075:.15+random(p.seed+8)*.15;
        transform.position.set(p.x,groundHeight(id,p.x,p.z)+(grass?-.008:.025+random(p.seed+61)*.035),p.z);transform.rotation.set(leaves?(random(p.seed+6)-.5)*.26:0,random(p.seed+7)*Math.PI*2,0);
        transform.scale.set(size*(grass?1.5:.8),size,size*(grass?1.5:1));transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
        if(grass)colour.setHSL(.20+random(p.seed+4)*.035,.15+random(p.seed+9)*.14,.72+random(p.seed)*.17);
        else colour.setHSL(random(p.seed+4)<.27?.025+random(p.seed)*.018:.09+random(p.seed)*.045,.52,.37+random(p.seed+5)*.18);
        mesh.setColorAt(i,colour);
      });
      mesh.computeBoundingSphere();group.add(mesh);tiles.push({mesh,centre:new THREE.Vector3(tx+4,0,tz+4),full:positions.length});
    }
  }
  return {group,update(time:number,camera:THREE.Camera,density:number){
    clock.value=time;
    for(const tile of tiles){const distance=Math.hypot(camera.position.x-tile.centre.x,camera.position.z-tile.centre.z),falloff=grass?1-smooth(19,35,distance)*.72:1-smooth(23,40,distance)*.55;tile.mesh.count=Math.floor(tile.full*density*falloff);}
  },dispose(){tiles.forEach(t=>t.mesh.dispose());geometry?.dispose();material?.dispose();ownedMap?.dispose();}};
}
