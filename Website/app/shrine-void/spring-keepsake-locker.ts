import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** A grounded, front-opening keepsake locker. The liner owns distinct materials
 * so the moving candle can illuminate the cavity without lighting the shell. */
export function createSpringKeepsakeLocker(_wood?:THREE.Texture){
  const group=new THREE.Group();group.name='Buried keepsake locker · integrated keyhole';
  const interior=new THREE.Group();interior.name='Locker interior · candlelight only';group.add(interior);
  const door=new THREE.Group();door.name='Side-hinged locker door';door.position.set(-.46,0,.33);group.add(door);
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  const material=(p:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(p);materials.add(m);return m;};
  const paint=material({color:0x314d43,metalness:.57,roughness:.56});
  const edge=material({color:0x466055,metalness:.66,roughness:.46});
  const brass=material({color:0x9e8050,metalness:.87,roughness:.39});
  const iron=material({color:0x33413b,metalness:.72,roughness:.57});
  const rubber=material({color:0x101a15,roughness:.96,metalness:0});
  const keyDark=material({color:0x050806,roughness:1,metalness:0});
  const lining=material({color:0x3d4238,metalness:.32,roughness:.86});
  const shelf=material({color:0x4e4a3c,metalness:.16,roughness:.93});
  const add=(parent:THREE.Object3D,name:string,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{
    geometries.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  };
  const box=(parent:THREE.Object3D,name:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,r=.005)=>
    add(parent,name,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.22,h*.22,d*.22)),m,x,y,z);
  // Five solid walls leave a true aperture; there is no front cover plane or
  // black card across the opening. Thin inner faces sit just inside the shell.
  box(group,'Locker left folded wall',.05,.68,.64,paint,-.445,.34,0);
  box(group,'Locker right folded wall',.05,.68,.64,paint,.445,.34,0);
  box(group,'Locker base',.84,.075,.64,paint,0,.0375,0);
  box(group,'Locker roof',.84,.08,.64,paint,0,.64,0);
  box(group,'Locker rear wall',.84,.525,.05,paint,0,.3375,-.295);
  box(interior,'Locker dark left wall',.002,.524,.572,lining,-.419,.338,-.007);
  box(interior,'Locker dark right wall',.002,.524,.572,lining,.419,.338,-.007);
  box(interior,'Locker dark ceiling',.836,.002,.572,lining,0,.599,-.007);
  box(interior,'Locker dark rear wall',.836,.522,.002,lining,0,.338,-.269);
  box(interior,'Locker lower shelf',.836,.008,.572,shelf,0,.079,-.007,.001);
  // Folded returns catch daylight on the outer lip while the interior remains
  // independently shaded. A narrow gasket describes the door's sealing edge.
  for(const side of [-1,1]){
    box(group,'Rounded front jamb '+side,.028,.57,.025,edge,side*.432,.3375,.312,.004);
    box(group,'Recessed door gasket '+side,.008,.536,.006,rubber,side*.417,.338,.325,.001);
  }
  for(const [y,label]of [[.088,'bottom'],[.591,'top']] as const){
    box(group,'Front '+label+' return',.838,.021,.028,edge,0,y,.312,.004);
    box(group,label+' sealing gasket',.828,.006,.006,rubber,0,y+(.34-y)*.035,.325,.001);
  }
  const rounded=(x:number,y:number,w:number,h:number,r:number)=>{
    const s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);
    s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  };
  const keyX=.739,keyY=.337;
  const keyhole=()=>{
    const h=new THREE.Path();h.moveTo(keyX-.0035,keyY-.013);h.lineTo(keyX+.0035,keyY-.013);
    h.lineTo(keyX+.0025,keyY+.001);h.absarc(keyX,keyY+.008,.0078,-1.244,4.386,false);
    h.lineTo(keyX-.0035,keyY-.013);return h;
  };
  const panel=rounded(.012,.031,.896,.615,.021);panel.holes.push(keyhole());
  const panelGeometry=new THREE.ExtrudeGeometry(panel,{depth:.026,bevelEnabled:true,bevelSegments:2,steps:1,bevelThickness:.0025,bevelSize:.0025,curveSegments:8});
  add(door,'Solid locker door with inset keyway',panelGeometry,paint,0,0,-.013);
  // The small escutcheon is flush on the door and shares its actual key-shaped
  // opening. The recessed barrel is part of the door, never a hanging lock.
  const escutcheon=rounded(keyX-.026,keyY-.028,.052,.072,.012);escutcheon.holes.push(keyhole());
  add(door,'Flush brass keyhole surround',new THREE.ExtrudeGeometry(escutcheon,{depth:.0018,bevelEnabled:true,bevelSegments:1,steps:1,bevelThickness:.0007,bevelSize:.0007,curveSegments:8}),brass,0,0,.016);
  add(door,'Recess inside integrated key barrel',new THREE.CircleGeometry(.018,16),keyDark,keyX,keyY+.007,-.014);
  // A shallow thumb recess and slender pull provide a believable way to open
  // the door, without a projecting hasp or a second locking object.
  box(door,'Recessed finger pull shadow',.079,.021,.002,rubber,keyX,.435,.016,.005);
  box(door,'Inset brass finger pull',.083,.007,.012,brass,keyX,.442,.021,.002);
  for(const y of [.132,.538]){
    const hinge=add(group,'Compact side hinge',new THREE.CylinderGeometry(.012,.012,.092,12),iron,-.463,y,.332);
    hinge.castShadow=true;
    for(const dy of [-.031,.031])add(group,'Hinge collar',new THREE.CylinderGeometry(.013,.013,.006,12),brass,-.463,y+dy,.332);
  }
  // Small, recessed screw heads and a quiet impressed diamond finish the face.
  for(const x of [.055,.865])for(const y of [.074,.603]){
    const screw=add(door,'Recessed door screw',new THREE.CylinderGeometry(.004,.004,.0018,10),iron,x,y,.017);screw.rotation.x=Math.PI/2;
    box(door,'Screw slot',.0045,.0007,.0006,keyDark,x,y,.0182,.0001);
  }
  const stamp=add(door,'Impressed keepsake diamond',new THREE.RingGeometry(.014,.017,4),brass,.46,.477,.017);stamp.rotation.z=Math.PI/4;
  for(const side of [-1,1])for(const z of [-.22,.22])box(group,'Low locker foot',.10,.018,.09,iron,side*.35,.009,z,.004);
  // Useful bounds and origin information for interaction/candle authoring.
  group.userData.frontDirection='+Z';
  interior.userData.bounds={min:{x:-.42,y:.075,z:-.27},max:{x:.42,y:.60,z:.30}};
  door.userData.closedAngle=0;door.userData.openAngle=-1.8;
  return {group,door,interior,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();group.clear();}};
}
