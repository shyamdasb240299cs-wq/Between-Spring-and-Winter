import {CLOSE_START,READ_START,smooth} from './journey-data';
import {landscapeLayout,visibleFraction} from './scenery-layout';

/** Scroll targets are eased by the audio engine, never assigned as abrupt volume steps. */
export function soundMix(position:number,width:number,height:number,wind:number){
  const reading=smooth(position,READ_START-.6,READ_START-.03);
  const nature=(1-reading)*(1-smooth(position,CLOSE_START-.1,CLOSE_START+.4));
  const layout=landscapeLayout(width,height);
  const camera=layout.camera(position);
  const cameraX=layout.cameraX(position);
  const foregroundY=camera+(camera-layout.letterCamera)*.075;
  const ground=layout.foreground;
  const fire=visibleFraction(cameraX+ground.left+ground.width*.783,ground.top+ground.height*.622-foregroundY,ground.width*.138,ground.height*.055,width,height);
  const bell=visibleFraction(cameraX+ground.left+ground.width*.729,ground.top+ground.height*.215-foregroundY,ground.width*.13,ground.height*.18,width,height);
  const garden=smooth(position,2.3,3.2)*nature;
  return {
    music:.75-reading*.1,
    frequency:5800-reading*1800,
    openingBird:(1-smooth(position,.5,1.3))*nature*.6,
    birds:fire*nature*.72,
    waterfall:garden*.65,
    breeze:bell*nature*(.08+Math.min(1,Math.abs(wind))*.68),
    fire:fire*nature*.12,
    bell:bell*nature*.75,
    reading,
  };
}
