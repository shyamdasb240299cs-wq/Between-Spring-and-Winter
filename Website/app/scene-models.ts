import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Static architecture is batched by material: real depth without hundreds of draw calls.
export function architecture(cedar:T.Texture, roofMap:T.Texture, shrine=false){
  const root=new T.Group();
  const wood=new T.MeshStandardMaterial({map:cedar,color:0xa8977e,roughness:.93});
  const roof=new T.MeshStandardMaterial({map:roofMap,color:0x8b9b94,roughness:.87,side:T.DoubleSide});
  const stone=new T.MeshStandardMaterial({color:0x777a69,roughness:1});
  const paper=new T.MeshStandardMaterial({color:0xdccaa1,roughness:1,emissive:0x745026,emissiveIntensity:.18});
  const red=new T.MeshStandardMaterial({color:0x813c29,roughness:.86});
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  const part=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1)));
    const a=batches.get(m)||[];a.push(g);batches.set(m,a);
  };
  const box=(m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>part(new T.BoxGeometry(w,h,d),m,x,y,z);
  const canopy=(width:number,depth:number,y:number)=>{
    const g=new T.PlaneGeometry(width,depth,24,16),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i),u=Math.abs(z)/(depth/2);p.setXYZ(i,x,y+.72*(1-u)+.16*u**5+.07*(x/(width/2))**4,z);}
    g.computeVertexNormals();part(g,roof,0,0,0);
    box(wood,0,y-.025,depth/2,width,.10,.11);box(wood,0,y-.025,-depth/2,width,.10,.11);
    for(let x=-width/2;x<width/2;x+=.19)part(new T.CylinderGeometry(.055,.055,.2,8),roof,x,y+.75,0,0,0,Math.PI/2);
  };
  if(shrine){
    for(let i=0;i<3;i++)box(stone,0,.07+i*.12,.24-i*.22,2.1-i*.18,.14,1.8-i*.22);
    box(wood,0,.47,-.1,1.55,.16,1.3);box(wood,0,1.15,-.29,1.3,1.35,.8);
    for(const x of [-.63,.63])box(red,x,1.22,.2,.13,1.4,.13);
    box(paper,0,1.23,.125,.99,1.1,.025);
    for(let x=-.5;x<=.5;x+=.125)box(wood,x,1.23,.15,.025,1.1,.035);
    for(const y of [.72,1.05,1.42,1.77])box(wood,0,y,.17,1.08,.035,.04);
    canopy(2.05,1.7,1.85);
    // Torii stands in front of the sanctuary on its own stone feet.
    for(const x of [-1.15,1.15]){
      box(stone,x,.13,1.22,.39,.26,.4);
      part(new T.CylinderGeometry(.09,.12,2.4,12),red,x,1.43,1.22,0,0,-x*.018);
      box(wood,x,.39,1.22,.24,.22,.24);
    }
    box(red,0,2.31,1.22,2.8,.15,.19);box(red,0,2.67,1.22,3.05,.17,.27);
    box(wood,0,2.79,1.22,3.25,.1,.34);box(red,0,2.49,1.22,.12,.24,.16);
  }else{
    box(stone,0,.12,0,3.65,.24,2.45);box(wood,0,.36,0,3.8,.2,2.65);
    box(wood,0,1.18,-.89,3.32,1.62,.14);
    for(const x of [-1.65,1.65])box(wood,x,1.18,-.02,.13,1.66,1.85);
    for(let i=0;i<4;i++){
      const x=-1.24+i*.827;box(paper,x,1.24,.62,.73,1.38,.045);
      for(let j=-2;j<=2;j++)box(wood,x+j*.14,1.24,.66,.021,1.4,.036);
    }
    for(const x of [-1.67,-.83,0,.83,1.67])box(wood,x,1.27,.73,.075,1.82,.095);
    for(const y of [.56,.87,1.18,1.49,1.8,2.08])box(wood,0,y,.69,3.38,.035,.055);
    box(wood,0,2.07,0,3.5,.14,2.03);canopy(4.25,3.12,2.03);
    for(let i=0;i<3;i++)box(stone,-.83,.1+i*.085,1.68-i*.18,1.24,.16,.4);
    const lantern=new T.MeshStandardMaterial({color:0xe0a667,emissive:0xe39a45,emissiveIntensity:.6,roughness:.8});
    part(new T.SphereGeometry(.16,12,10).scale(1,1.65,1),lantern,-1.35,1.65,1.03);
    box(wood,-1.35,1.98,1.03,.025,.21,.025);
  }
  for(const [mat,geometries] of batches){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  return root;
}

export function rabbitModel(){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const fur=new T.MeshStandardMaterial({color:0xa99b7e,roughness:1}),cream=new T.MeshStandardMaterial({color:0xd4c7ac,roughness:1}),pink=new T.MeshStandardMaterial({color:0x9c736b,roughness:1}),dark=new T.MeshStandardMaterial({color:0x231d16,roughness:.3});
  const ell=(parent:T.Group,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const o=new T.Mesh(new T.SphereGeometry(1,16,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
  ell(body,fur,0,.24,0,.32,.25,.21);ell(body,fur,-.17,.2,0,.23,.25,.23);ell(body,cream,-.36,.24,0,.085,.085,.085);
  const head=new T.Group();head.position.set(.27,.43,0);body.add(head);ell(head,fur,0,0,0,.17,.16,.145);ell(head,cream,.12,-.07,0,.09,.07,.10);
  ell(head,pink,.20,-.04,0,.023,.019,.032);
  for(const z of [-.12,.12])ell(head,dark,.055,.025,z,.025,.029,.016);
  const ears=[-.075,.075].map(z=>{const e=new T.Group();e.position.set(-.025,.12,z);head.add(e);ell(e,fur,0,.16,0,.052,.20,.035);ell(e,pink,.028,.17,0,.015,.15,.022);return e;});
  const feet=[-.18,.20].flatMap(x=>[-.15,.15].map(z=>{const f=new T.Group();f.position.set(x,.07,z);root.add(f);ell(f,cream,.025,0,0,.12,.055,.063);return f;}));
  return {root,body,head,ears,feet};
}

export function birdModel(){
  const root=new T.Group(),white=new T.MeshStandardMaterial({color:0xdfd9c5,roughness:.9}),dark=new T.MeshStandardMaterial({color:0x39403b,roughness:1});
  const ell=(parent:T.Group,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const o=new T.Mesh(new T.SphereGeometry(1,12,8),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);};
  ell(root,white,0,0,0,.32,.11,.13);ell(root,white,.32,.035,0,.24,.045,.045);ell(root,white,.52,.06,0,.075,.065,.06);ell(root,dark,.64,.055,0,.11,.02,.023);ell(root,dark,-.42,-.06,0,.25,.012,.06);
  const wings=[-1,1].map(sign=>{const pivot=new T.Group();root.add(pivot);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([.15,0,0,-.17,0,0,-.31,0,sign*.77,.02,.025,sign*.58],3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const m=white.clone();m.side=T.DoubleSide;pivot.add(new T.Mesh(g,m));return pivot;});
  return {root,wings};
}
