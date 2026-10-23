import {detailSummerMaterial} from './summer-surfaces';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

type LegacyScuba={root:THREE.Group;torso:THREE.Object3D;arms:THREE.Group[];legs:THREE.Group[];fins:THREE.Group[];bcd:THREE.Group;mask:THREE.Group;torch:THREE.Group;compass:THREE.Group;slate:THREE.Group;north:THREE.Object3D;};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

/** The source body is Cesium's artist-authored, weighted character, adapted offline
 * into neoprene. The real BCD/tank/regulator source is Steren Giannini's mesh.
 * Cloning the skeleton is essential: rack, boat and player must never share bones. */
export function adoptImportedSummerScuba(source:LegacyScuba,templates?:Record<string,THREE.Object3D>){
  const suitSource=templates?.['summer-diver'],gearSource=templates?.['summer-scuba-gear'];
  if(!suitSource||!gearSource)return {...source,imported:false,updatePose(_time:number,_swimming:boolean,_reduced:boolean,_firstPerson=false){}};
  const {root}=source,suit=clone(suitSource),gear=gearSource.clone(true);
  suit.name='Licensed skinned wetsuit · adapted Cesium body';
  // Imported body faces +Z. The Summer player, rack and boat use forward -Z.
  suit.rotation.y=Math.PI;
  source.torso.removeFromParent();source.arms.forEach(a=>a.removeFromParent());
  source.fins.forEach(f=>{f.removeFromParent();root.add(f);});
  source.legs.forEach(l=>l.removeFromParent());source.bcd.removeFromParent();
  root.add(suit);
  const bcd=new THREE.Group();bcd.name='Imported BCD, cylinder, regulators and gauges · Steren Giannini';
  gear.scale.setScalar(.52);gear.position.set(-.035,1.23,-.025);bcd.add(gear);root.add(bcd);
  suit.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;
    for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof THREE.MeshStandardMaterial&&!material.userData.neopreneFinish){material.userData.neopreneFinish=true;material.roughness=.89;material.metalness=0;material.envMapIntensity=.28;detailSummerMaterial(material,'neoprene');}
  }});
  gear.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});
  const bone=(name:string)=>suit.getObjectByName(name) as THREE.Bone|undefined;
  const arms=[bone('Skeleton_arm_joint_R'),bone('Skeleton_arm_joint_L__4_')];
  const elbows=[bone('Skeleton_arm_joint_R__2_'),bone('Skeleton_arm_joint_L__3_')];
  const hands=[bone('Skeleton_arm_joint_R__3_'),bone('Skeleton_arm_joint_L__2_')];
  const hips=[bone('leg_joint_R_1'),bone('leg_joint_L_1')];
  const knees=[bone('leg_joint_R_2'),bone('leg_joint_L_2')];
  const ankles=[bone('leg_joint_R_3'),bone('leg_joint_L_3')];
  const worldQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),turn=new THREE.Quaternion(),a=V(),b=V();
  function aim(parent:THREE.Bone|undefined,child:THREE.Bone|undefined,direction:THREE.Vector3){
    if(!parent||!child)return;
    root.updateMatrixWorld(true);parent.getWorldPosition(a);child.getWorldPosition(b);
    turn.setFromUnitVectors(b.sub(a).normalize(),direction.normalize());
    parent.getWorldQuaternion(worldQ);parent.parent!.getWorldQuaternion(parentQ);
    parent.quaternion.copy(parentQ.invert().multiply(turn).multiply(worldQ));root.updateMatrixWorld(true);
  }
  // Relax the source A-pose into an actual hanging suit. Bone weights preserve
  // smooth shoulders, elbows, knees and gloves; these are not segmented cylinders.
  arms.forEach((arm,i)=>{const side=i? -1:1;aim(arm,elbows[i],V(side*.19,-.98,-.02));aim(elbows[i],hands[i],V(side*.03,-.97,-.24));});
  hips.forEach((hip,i)=>{aim(hip,knees[i],V(i?-.014:.014,-1,0));aim(knees[i],ankles[i],V(0,-1,0));});
  const armRest=arms.map(a=>a?.quaternion.clone()),legRest=hips.map(a=>a?.quaternion.clone());
  // Preserve the world module's small control pivots while the actual geometry
  // deforms through bones. Those pivots never duplicate the body mesh.
  const armControls=[new THREE.Group(),new THREE.Group()],legControls=[new THREE.Group(),new THREE.Group()];
  const hinge=new THREE.Quaternion(),localAxis=V(),rootQ=new THREE.Quaternion();
  function rotate(bone:THREE.Bone|undefined,rest:THREE.Quaternion|undefined,angle:number){
    if(!bone||!rest)return;root.getWorldQuaternion(rootQ);localAxis.set(1,0,0).applyQuaternion(rootQ);
    bone.parent!.getWorldQuaternion(parentQ);localAxis.applyQuaternion(parentQ.invert());
    bone.quaternion.copy(rest).premultiply(hinge.setFromAxisAngle(localAxis,angle));
  }
  function updatePose(_time:number,swimming:boolean,reduced:boolean,firstPerson=false){
    armControls.forEach((control,i)=>rotate(arms[i],armRest[i],swimming?-.52:-.12));
    legControls.forEach((control,i)=>rotate(hips[i],legRest[i],swimming&&!reduced?control.rotation.x:0));
    root.updateMatrixWorld(true);
    source.fins.forEach((fin,i)=>{
      const ankle=ankles[i];if(!ankle)return;
      ankle.getWorldPosition(a);root.worldToLocal(a);fin.position.copy(a).add(V(0,-.065,-.06));
      // The fin's separate pitch pivot remains responsive to the swimming stroke.
    });
    // A first-person mask is represented by the viewport edge, never a lens
    // placed centimetres in front of the camera where it would obscure the scene.
    if(firstPerson)source.mask.visible=false;
  }
  updatePose(0,false,true);
  root.name='Summer imported skinned wetsuit and real scuba equipment';
  root.userData.assetSources=['CesiumMan / Cesium / CC BY 4.0','Scuba equipment / Steren Giannini / CC BY 3.0'];
  return {...source,torso:suit,arms:armControls,legs:legControls,bcd,imported:true,updatePose};
}
