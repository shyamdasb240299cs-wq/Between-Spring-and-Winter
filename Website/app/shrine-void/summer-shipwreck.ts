import * as THREE from 'three';
import {createSummerModelKit} from './summer-models';
import {SUMMER_WRECK_SECTIONS,summerGroundHeight} from './summer-layout';

type SummerKit = ReturnType<typeof createSummerModelKit>;

export function createSummerShipwreck(kit:SummerKit,parent:THREE.Group) {
  const root=new THREE.Group();root.name='The Marigold · open coastal shipwreck';parent.add(root);
  const {mesh,box,beam,tube,ring,cylinder,own,material}=kit;
  const woodSurface={map:kit.m.wood.map,normalMap:kit.m.wood.normalMap,normalScale:new THREE.Vector2(.72,.72),roughnessMap:kit.m.wood.roughnessMap};
  const timber=material({color:0xa3977d,roughness:.99,...woodSurface});
  const exposed=material({color:0xb8aa8e,roughness:.98,...woodSurface});
  const iron=material({color:0x4b6059,roughness:.88,metalness:.32});
  const growth=material({color:0x73816a,roughness:1});
  const vector=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const sections=SUMMER_WRECK_SECTIONS.map(section=>({...section,bed:summerGroundHeight(section.x,-28)-.16}));
  for(let index=0;index<sections.length-1;index++) {
    const section=sections[index],next=sections[index+1];
    beam(root,vector(section.x,section.bed+.3,-28),vector(next.x,next.bed+.3,-28),.20,timber,'Buried keel');
    for(const side of [-1,1])for(let plank=0;plank<5;plank++) {
      if(side===1&&index>=2&&index<=5&&plank>=1)continue;
      if((index*7+plank*3+(side+1))%13===0)continue;
      const rise=.52+plank*.40,spread=.45+plank*.137;
      const start=vector(section.x,section.bed+rise,-28+side*section.width*spread);
      const end=vector(next.x,next.bed+rise,-28+side*next.width*spread);
      const centre=start.clone().add(end).multiplyScalar(.5);
      const board=box(root,start.distanceTo(end)+.055,.33,.13,plank%3===0?exposed:timber,centre.x,centre.y,centre.z,.008,'Weathered hull strake');
      board.quaternion.setFromUnitVectors(vector(1,0,0),end.clone().sub(start).normalize());
    }
    if(index>=2&&index<=7)for(const side of [-1,1]) {
      const start=vector(section.x,section.bed+.29,-28+side*.65);
      const end=vector(next.x,next.bed+.29,-28+side*.65);
      const board=box(root,start.distanceTo(end),.12,1.28,timber,...start.clone().add(end).multiplyScalar(.5).toArray() as [number,number,number],.008,'Exposed cargo floor');
      board.rotation.z=Math.atan2(end.y-start.y,end.x-start.x);
    }
  }
  sections.forEach((section,index)=>{
    for(const side of [-1,1]) {
      if(side===1&&index>=3&&index<=5)continue;
      tube(root,[vector(section.x,section.bed+.20,-28),vector(section.x,section.bed+.45,-28+side*section.width*.58),vector(section.x,section.bed+1.25,-28+side*section.width*.9),vector(section.x,section.bed+2.75,-28+side*section.width)],.105,index%3?timber:exposed,'Curved exposed ship rib',10);
      if(index%2===0)cylinder(root,.085,.11,.18,iron,section.x,section.bed+2.30,-28+side*section.width);
    }
  });
  const stern=sections[1],bow=sections[sections.length-2];
  beam(root,vector(stern.x,stern.bed+.2,-30.2),vector(stern.x+.8,stern.bed+3.5,-30.2),.17,timber,'Broken sternpost');
  beam(root,vector(bow.x,bow.bed+.2,-28),vector(bow.x+2.2,bow.bed+3.8,-28),.22,exposed,'Raked bow stem');
  for(const offset of [0,1.6]) {
    const x=184+offset,width=3.4-offset*.35,z=-28-width*.837-.10;
    const porthole=ring(root,.32,.075,iron,x,summerGroundHeight(x,-28)+1.49,z);
    mesh(porthole,own(new THREE.CircleGeometry(.31,20)),material({color:0x294943,roughness:.94,side:THREE.DoubleSide}),0,0,.018);
    for(let bolt=0;bolt<8;bolt++)cylinder(porthole,.025,.025,.10,iron,Math.cos(bolt*Math.PI/4)*.32,Math.sin(bolt*Math.PI/4)*.32,0).rotation.x=Math.PI/2;
  }
  const cabin=new THREE.Group();cabin.name='Collapsed roofless stern cabin';cabin.position.set(160,summerGroundHeight(160,-30),-30);root.add(cabin);
  for(const side of [-1,1])for(const offset of [0,1.4])beam(cabin,vector(offset,0,side*1.35),vector(offset+.12,2.4,side*1.35),.13,exposed);
  for(const side of [-1,1])box(cabin,2.0,.75,.12,timber,.70,.5,side*1.35,.01);
  beam(root,vector(161,summerGroundHeight(161,-33)+.3,-33),vector(171,summerGroundHeight(171,-38)+.32,-38),.18,timber,'Fallen mast resting on sand');
  for(let index=0;index<14;index++) {
    const x=158+index*2.25,z=-34.5-Math.sin(index*2.399)*1.7;
    const splinter=box(root,.20,.095,1.1+(index%3)*.45,index%2?timber:exposed,x,summerGroundHeight(x,z)+.035,z,.006,'Grounded wreck debris');
    splinter.rotation.y=index*2.399;
    if(index%3===0){const sponge=mesh(root,own(new THREE.SphereGeometry(.20,8,6)),growth,x,summerGroundHeight(x,z)+.10,z);sponge.scale.y=.6;}
  }
  const anchor=new THREE.Group();anchor.name='Fallen iron anchor in sheltered sand';anchor.position.set(155,summerGroundHeight(155,-19)+.10,-19);root.add(anchor);
  beam(anchor,vector(-.9,.10,0),vector(.9,.10,0),.055,iron);
  beam(anchor,vector(0,.08,0),vector(0,.10,1.7),.075,iron);
  tube(anchor,[vector(-.85,.08,.95),vector(-.56,.08,1.50),vector(0,.10,1.7),vector(.56,.08,1.50),vector(.85,.08,.95)],.06,iron,'Anchor flukes');
  ring(anchor,.18,.045,iron,0,.10,-.10).rotation.x=-Math.PI/2;
  for(let link=0;link<18;link++) {
    const x=155-link*.23,z=-19-Math.sin(link*.3)*.65;
    const chain=ring(root,.11,.025,iron,x,summerGroundHeight(x,z)+.06,z);chain.rotation.x=link%2?Math.PI/2:.35;
  }
  return root;
}
