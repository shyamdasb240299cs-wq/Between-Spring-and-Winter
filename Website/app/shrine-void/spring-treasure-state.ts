/** Persistent trail, physical hands and ten real storage slots. */
import {ADAVI_STONES} from './spring-adavi-physics';
export type SpringItem='basket'|'mangoes'|'grapes'|'shawarma'|'parotta'|'pazham-pori'|'samosa'|'key';
export type SpringTarget=SpringItem|'letter'|'door-note'|'guide';
export const RAMBUTAN_COUNT=8;
export const INTRO_PAGES=2;
export const SPRING_HOTBAR:readonly (SpringItem|null)[]=[null,'basket','mangoes','grapes','shawarma','parotta','pazham-pori','samosa','key'];
export const SPRING_FOOD_NAMES:Record<SpringItem,string>={basket:'Rambutan',mangoes:'Mango',grapes:'Grapes',shawarma:'Shawarma',parotta:'Parotta & curry','pazham-pori':'Pazham pori',samosa:'Samosa',key:'Brass key'};
export const SPRING_FOOD_COUNTS:Record<SpringItem,number>={basket:8,mangoes:5,grapes:42,shawarma:3,parotta:3,'pazham-pori':4,samosa:3,key:0};
export const SPRING_EAT_MS=1150;
export const ADAVI_INTRO_PAGES=4;
export const ADAVI_WIN_PAGES=2;
export interface SpringSkipResult {success:boolean;skips:number;distance:number;feedback:string;}
export const SPRING_BAG_ITEMS=['mushroom-toy','candle','note'] as const;
export type SpringBagItem=typeof SPRING_BAG_ITEMS[number];
export type SpringCarryItem=SpringItem|SpringBagItem|'backpack'|'letter'|'door-note'|'bridge-note'|'pill-letter'|'paper-fragments'|'pill'|'river-stone'|'journey-note'|'compass'|'glasses'|'treasure-key'|'dumpling-tray'|'chopsticks'|'shovel'|'spring-book';
export type SpringDreamPhase='awake'|'closing'|'sleeping'|'waking'|'bus'|'return-closing'|'return-waking';
export const SPRING_CARRY_NAMES:Record<SpringCarryItem,string>={...SPRING_FOOD_NAMES,'mushroom-toy':'Mushroom toy',candle:'Candle',note:'Backpack note',backpack:'Backpack',letter:'First letter','door-note':'Door note','bridge-note':'Bridge note','pill-letter':'The next letter','paper-fragments':'Torn keepsake',pill:'Dream pill','river-stone':'River stone','journey-note':'The north rail letter',compass:'Brass compass',glasses:'Smoky crystal glasses','treasure-key':'Diamond treasure key','dumpling-tray':'Steamed dumplings',chopsticks:'Chopsticks',shovel:'Shovel','spring-book':'Part One · Spring'};
export const SPRING_JOURNEY_NOTE='This journey was so short. Next, you have to go through the longest journey we ever had. Follow the north rail, and you may find it.';
export const SPRING_PAPER_MESSAGE='You are my aiteall.';
export const SPRING_DUMPLING_COUNT=7;
export const SPRING_DUMPLING_NOTE='My dear Aamii, your happiness means the world to me. That day I could not bring these for you. I know you will be laughing now; may that laughter stay forever. Now go to the riverside — there awaits your next task.';
export const SPRING_TRAIN_NOTE='You were like a doll in my hands that day, and I still remember every little detail. Wash your hands before you continue. And do not be afraid to open the door: this train is standing still. Perhaps the two of us can open the lock together.';
export const SPRING_TRAIN_LETTER='You found it. This is the key that opens the final treasure, so keep it safe. You cannot find what is hidden beneath the earth until the rain stops. You are my Spring. To bring happiness to my Spring, I have kept something for you beneath the food stall.';
export const SPRING_TRAIN_LOCK_LETTERS=['S','C','E','A','D'] as const;
export const SPRING_BRIDGE_NOTE='There are five pieces of a paper hidden near this lake. Find the words and keep them with you — you may need them later. After finding the missing pieces, you may need a shovel. Look for the little patch of sunlight on the path beside the riverside bench.';
export const SPRING_RETURN_LETTER='Okay, you almost have everything you need, but a few things are still missing. For that, I give you this pill. Go to a bench, sit down, and take it. You shall see.';
export interface SpringBagPlacement {world:'spring'|'adavi';x:number;z:number;yaw:number;}
export interface SpringDroppedItem {item:SpringCarryItem;world:'spring'|'adavi'|'bus';x:number;y:number;z:number;yaw:number;}
export interface SpringSave {
  version:4;introStep:number;noteRead:boolean;rambutanEaten:number;keyTaken:boolean;doorNoteRead:boolean;
  doorUnlocked:boolean;riverVisited:boolean;keyGuideSeen:boolean;riverGuideSeen:boolean;
  inventory:SpringItem[];selectedSlot:number;foodEaten:Record<SpringItem,number>;
  paperHeld:'letter'|'door-note'|null;eatStarted:number;eatRevision:number;lastEaten:SpringItem|null;
  basketHeld:boolean;
  adaviActive:boolean;adaviIntroStep:number;adaviWinStep:number;selectedStone:string|null;
  skipPhase:'exploring'|'aiming'|'flying'|'result';skipPower:number;skipAngle:number;skipAim:number;
  skipSeed:number;skipContacts:number;skipResult:SpringSkipResult|null;stoneChallengeComplete:boolean;
  bagRevealed:boolean;bagTaken:boolean;bagNoteRead:boolean;bagNoteOpen:boolean;bridgeVisited:boolean;
  bagHeld:boolean;bagOpen:boolean;bagItemHeld:SpringBagItem|null;bagItemsTaken:SpringBagItem[];bagPlacement:SpringBagPlacement|null;
  storageSlots:(SpringCarryItem|null)[];hands:[SpringCarryItem|null,SpringCarryItem|null];activeHand:0|1;
  lakeNoteRead:boolean;paperPieces:number[];returnLetterRead:boolean;pillTaken:boolean;pillUsed:boolean;
  dreamReturned:boolean;journeyNoteRead:boolean;compassTaken:boolean;glassesTaken:boolean;droppedItems:SpringDroppedItem[];
  trainNoteRead:boolean;handsWashed:boolean;trainMirrorRevealed:boolean;trainLockOpen:boolean;trainCaseOpen:boolean;trainLockWheels:[number,number,number,number,number];treasureKeyTaken:boolean;trainLetterRead:boolean;trainNoteOpen:'train-note'|'train-letter'|null;
  dumplingNoteRead:boolean;dumplingTrayTaken:boolean;dumplingTrayOpen:boolean;dumplingsEaten:number;dumplingEatStarted:number;rainCleared:boolean;weatherClearStarted:number;paperHuntStarted:boolean;shovelTaken:boolean;diggingStarted:number;treasureDug:boolean;treasureOpen:boolean;finalDialogueSeen:boolean;candleLit:boolean;candleFocusStarted:number;springBookTaken:boolean;endingPhase:'none'|'walking'|'sitting'|'opening'|'reading'|'complete';endingStarted:number;
  questNoteOpen:'dumpling-note'|'bridge-note'|'pill-letter'|'paper-fragments'|'journey-note'|null;benchSeated:boolean;dreamPhase:SpringDreamPhase;dreamStarted:number;busSeated:boolean;questDialogue:number;inventoryNotice:string;
}
export const SPRING_SAVE_KEY='between-spring-fresh-trail-v4';
const initial=():SpringSave=>({version:4,introStep:0,noteRead:false,rambutanEaten:0,keyTaken:false,doorNoteRead:false,doorUnlocked:false,riverVisited:false,keyGuideSeen:false,riverGuideSeen:false,inventory:[],selectedSlot:0,foodEaten:{basket:0,mangoes:0,grapes:0,shawarma:0,parotta:0,'pazham-pori':0,samosa:0,key:0},paperHeld:null,eatStarted:0,eatRevision:0,lastEaten:null,basketHeld:false,adaviActive:false,adaviIntroStep:0,adaviWinStep:0,selectedStone:null,skipPhase:'exploring',skipPower:.78,skipAngle:10,skipAim:0,skipSeed:0,skipContacts:0,skipResult:null,stoneChallengeComplete:false,bagRevealed:false,bagTaken:false,bagNoteRead:false,bagNoteOpen:false,bridgeVisited:false,bagHeld:false,bagOpen:false,bagItemHeld:null,bagItemsTaken:[],bagPlacement:null,storageSlots:Array(10).fill(null),hands:[null,null],activeHand:0,lakeNoteRead:false,paperPieces:[],returnLetterRead:false,pillTaken:false,pillUsed:false,dreamReturned:false,journeyNoteRead:false,compassTaken:false,glassesTaken:false,droppedItems:[],trainNoteRead:false,handsWashed:false,trainMirrorRevealed:false,trainLockOpen:false,trainCaseOpen:false,trainLockWheels:[0,0,0,0,0],treasureKeyTaken:false,trainLetterRead:false,trainNoteOpen:null,dumplingNoteRead:false,dumplingTrayTaken:false,dumplingTrayOpen:false,dumplingsEaten:0,dumplingEatStarted:0,rainCleared:false,weatherClearStarted:0,paperHuntStarted:false,shovelTaken:false,diggingStarted:0,treasureDug:false,treasureOpen:false,finalDialogueSeen:false,candleLit:false,candleFocusStarted:0,springBookTaken:false,endingPhase:'none',endingStarted:0,questNoteOpen:null,benchSeated:false,dreamPhase:'awake',dreamStarted:0,busSeated:false,questDialogue:0,inventoryNotice:''});
type Storage={getItem(k:string):string|null;setItem(k:string,v:string):void};
const bounded=(value:unknown,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;
const isItem=(v:unknown):v is SpringItem=>typeof v==='string'&&SPRING_HOTBAR.includes(v as SpringItem);
const isStone=(v:unknown):v is string=>typeof v==='string'&&ADAVI_STONES.some(stone=>stone.id===v);
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):null;
const isBagItem=(value:unknown):value is SpringBagItem=>SPRING_BAG_ITEMS.includes(value as SpringBagItem);
const isCarryItem=(value:unknown):value is SpringCarryItem=>typeof value==='string'&&Object.hasOwn(SPRING_CARRY_NAMES,value);
function droppedPlacement(value:unknown):SpringDroppedItem|null{
  if(!value||typeof value!=='object')return null;const p=value as SpringDroppedItem;
  if(!isCarryItem(p.item)||!springCanStore(p.item)||!['spring','adavi','bus'].includes(p.world)||![p.x,p.y,p.z,p.yaw].every(Number.isFinite)||p.y< -5||p.y>40)return null;
  if(p.world==='bus'?(p.x<398||p.x>402||Math.abs(p.z)>5.4):p.world==='adavi'?(p.x<177||p.x>223||p.z< -31||p.z>26):(Math.abs(p.x)>90||p.z< -265||p.z>150))return null;
  return {item:p.item,world:p.world,x:p.x,y:p.y,z:p.z,yaw:p.yaw};
}
export const springItemHands=(item:SpringCarryItem)=>isItem(item)&&item!=='key'||item==='backpack'||item==='shovel'?2:1;
export const springCanStore=(item:SpringCarryItem)=>springItemHands(item)===1&&!['river-stone','dumpling-tray','chopsticks','spring-book'].includes(item);
export const springOwnsItem=(state:SpringSave,item:SpringCarryItem)=>state.storageSlots.includes(item)||state.hands.includes(item);
/** Bulky containers stay in the world or occupy both hands; only small objects fit storage. */
function stowItem(state:SpringSave,item:SpringCarryItem){
  if(item==='river-stone'){state.hands=state.hands.map(held=>held===item?null:held) as SpringSave['hands'];state.selectedStone=null;return true;}
  if(!springCanStore(item))return false;
  if(state.storageSlots.includes(item)){state.hands=state.hands.map(held=>held===item?null:held) as SpringSave['hands'];return true;}
  const index=state.storageSlots.indexOf(null);if(index<0)return false;
  state.storageSlots[index]=item;state.hands=state.hands.map(held=>held===item?null:held) as SpringSave['hands'];return true;
}
function storeItem(state:SpringSave,item:SpringCarryItem){
  state.droppedItems=state.droppedItems.filter(p=>p.item!==item);
  if(springOwnsItem(state,item))return true;
  const index=state.storageSlots.indexOf(null);
  if(index>=0&&springCanStore(item)){state.storageSlots[index]=item;return true;}
  // The two hands are usable capacity too. The last letter and capsule must
  // remain collectible when the ten storage spaces contain earlier keepsakes.
  if(springItemHands(item)===2){if(state.hands.some(Boolean))return false;state.hands=[item,item];}
  else {const hand=state.hands.indexOf(null);if(hand<0)return false;state.hands[hand]=item;state.activeHand=hand as 0|1;}
  return true;
}
function removeItem(state:SpringSave,item:SpringCarryItem){state.storageSlots=state.storageSlots.map(stored=>stored===item?null:stored);state.hands=state.hands.map(held=>held===item?null:held) as SpringSave['hands'];}
function equipItem(state:SpringSave,item:SpringCarryItem){
  state.droppedItems=state.droppedItems.filter(p=>p.item!==item);
  if(state.hands.includes(item)){state.activeHand=state.hands.indexOf(item) as 0|1;return true;}
  const hand=springItemHands(item)===1&&state.hands[state.activeHand]&&!state.hands[1-state.activeHand]?(1-state.activeHand) as 0|1:state.activeHand;
  // Free the source slot before moving current hands into storage. No items are lost on a full inventory.
  state.storageSlots=state.storageSlots.map(stored=>stored===item?null:stored);
  for(const existing of [...new Set(state.hands.filter((held):held is SpringCarryItem=>!!held))]){
    if(springItemHands(item)===2||springItemHands(existing)===2||state.hands[hand]===existing)if(!stowItem(state,existing))return false;
  }
  state.hands[hand]=item;state.activeHand=hand;if(springItemHands(item)===2)state.hands[1-hand]=item;return true;
}
function syncHands(state:SpringSave){
  state.bagHeld=state.hands.includes('backpack');if(!state.bagHeld)state.bagOpen=false;
  state.bagItemHeld=isBagItem(state.hands[state.activeHand])?state.hands[state.activeHand] as SpringBagItem:isBagItem(state.hands[1-state.activeHand])?state.hands[1-state.activeHand] as SpringBagItem:null;
  state.basketHeld=state.hands.includes('basket');
  const food=state.hands[state.activeHand];state.selectedSlot=food&&isItem(food)?SPRING_HOTBAR.indexOf(food):0;
}
function bagPlacement(value:unknown):SpringBagPlacement|null {
  if(!value||typeof value!=='object')return null;const p=value as SpringBagPlacement;
  if(!['spring','adavi'].includes(p.world)||![p.x,p.z,p.yaw].every(Number.isFinite))return null;
  if(p.world==='spring'?(Math.hypot(p.x,p.z)>36&&!(p.x>=5&&p.x<=20&&p.z>=-104&&p.z<=-25)):p.x<177||p.x>223||p.z< -31||p.z>26)return null;
  return {world:p.world,x:p.x,z:p.z,yaw:p.yaw};
}
export const springAdaviDialogue=(s:SpringSave)=>s.adaviActive&&(s.adaviIntroStep<ADAVI_INTRO_PAGES||s.stoneChallengeComplete&&s.adaviWinStep<ADAVI_WIN_PAGES);
export const springQuestBusy=(s:SpringSave)=>!!s.questNoteOpen||!!s.trainNoteOpen||s.trainCaseOpen||!!s.diggingStarted||!!s.candleFocusStarted||s.treasureOpen&&!s.finalDialogueSeen||['walking','sitting','opening','reading'].includes(s.endingPhase)||['closing','sleeping','waking','return-closing','return-waking'].includes(s.dreamPhase);
export const springInventoryHeld=(s:SpringSave)=>s.hands[s.activeHand]??s.hands[1-s.activeHand];
/** Keyboard, touch buttons and the general put-down control share one decision. */
export function springPutAwayCommand(s:SpringSave,nearTable:boolean):{action:string;value?:unknown}{
  if(s.paperHeld)return {action:'put-paper'};
  const item=springInventoryHeld(s);if(!item)return {action:'inventory-notice',value:''};
  if(item==='backpack')return {action:'put-bag'};
  if(item==='river-stone')return {action:'put-stone'};
  if(item==='shovel')return {action:'put-shovel'};
  if(item==='dumpling-tray'||item==='chopsticks')return nearTable?{action:'return-dumplings'}:{action:'inventory-notice',value:'Return the steamer and chopsticks to the stall, then press Q.'};
  if(springItemHands(item)===2)return nearTable?{action:'return-held'}:{action:'inventory-notice',value:'Bring this serving back to the food stall, then press Q to put it back.'};
  return {action:'stow-hand',value:s.hands[s.activeHand]?s.activeHand:1-s.activeHand};
}
export function springHeldItem(state:SpringSave){const item=state.hands[state.activeHand]??state.hands[1-state.activeHand];return item&&isItem(item)&&state.inventory.includes(item)&&!state.paperHeld?item:null;}
export const springRemaining=(s:SpringSave,item:SpringItem)=>Math.max(0,SPRING_FOOD_COUNTS[item]-s.foodEaten[item]);
/** Held food casts no world shadow. Eating, dialogue and hotbar changes do not
 * require redrawing the entire Spring landscape's static shadow map. */
export function springShadowChanged(previous:SpringSave|null|undefined,next:SpringSave){
  return !previous||previous.bagHeld!==next.bagHeld||previous.bagRevealed!==next.bagRevealed||previous.bagPlacement!==next.bagPlacement||previous.doorUnlocked!==next.doorUnlocked||(previous.paperHeld==='letter')!==(next.paperHeld==='letter')||SPRING_HOTBAR.some(item=>item&&item!=='key'&&previous.inventory.includes(item)!==next.inventory.includes(item));
}
export function createSpringTreasureState(storage?:Storage,now=()=>Date.now(),random=()=>Math.random()){
  let state=initial();const listeners=new Set<()=>void>();
  try{const saved=JSON.parse(storage?.getItem(SPRING_SAVE_KEY)??'null');if(saved&&(saved.version===2||saved.version===3||saved.version===4)){
    for(const key of ['noteRead','keyTaken','doorNoteRead','doorUnlocked','riverVisited','keyGuideSeen','riverGuideSeen','stoneChallengeComplete','bagRevealed','bagTaken','bagNoteRead','bridgeVisited'] as const)state[key]=saved[key]===true;
    state.introStep=saved.version===2&&saved.introStep>0?INTRO_PAGES:bounded(saved.introStep,INTRO_PAGES);
    for(const item of SPRING_HOTBAR)if(item)state.foodEaten[item]=bounded(saved.foodEaten?.[item],SPRING_FOOD_COUNTS[item]);
    state.foodEaten.basket=Math.max(state.foodEaten.basket,bounded(saved.rambutanEaten,RAMBUTAN_COUNT));
    if(saved.version>=3&&Array.isArray(saved.inventory))state.inventory=[...new Set<SpringItem>(saved.inventory.filter(isItem))];
    state.selectedSlot=bounded(saved.selectedSlot,8);
    if(state.riverVisited)state.doorUnlocked=true;
    if(state.doorUnlocked)state.keyTaken=true;
    if(state.keyTaken){state.foodEaten.basket=RAMBUTAN_COUNT;if(!state.inventory.includes('key'))state.inventory.push('key');}
    else state.inventory=state.inventory.filter(item=>item!=='key');
    state.rambutanEaten=state.foodEaten.basket;
    if(state.rambutanEaten<RAMBUTAN_COUNT)state.doorNoteRead=false;
    state.adaviIntroStep=bounded(saved.adaviIntroStep,ADAVI_INTRO_PAGES);
    state.adaviWinStep=bounded(saved.adaviWinStep,ADAVI_WIN_PAGES);
    // Recover milestones in order; unfinished throws and held shore stones are session-only.
    if(state.bagRevealed||state.bagTaken||state.bagNoteRead||state.bridgeVisited)state.stoneChallengeComplete=true;
    if(state.stoneChallengeComplete){state.adaviIntroStep=ADAVI_INTRO_PAGES;state.riverVisited=true;state.doorUnlocked=true;state.keyTaken=true;if(!state.inventory.includes('key'))state.inventory.push('key');state.foodEaten.basket=RAMBUTAN_COUNT;state.rambutanEaten=RAMBUTAN_COUNT;}
    if(state.bagTaken||state.bagNoteRead||state.bridgeVisited){state.bagRevealed=true;state.adaviWinStep=ADAVI_WIN_PAGES;}
    if(state.bridgeVisited){state.bagTaken=true;state.bagNoteRead=true;}
    if(state.bagNoteRead)state.bagTaken=true;
    state.bagHeld=state.bagTaken&&(saved.bagHeld===true||saved.bagHeld===undefined);
    state.bagItemsTaken=state.bagTaken&&Array.isArray(saved.bagItemsTaken)?[...new Set<SpringBagItem>(saved.bagItemsTaken.filter(isBagItem))]:[];
    state.bagPlacement=bagPlacement(saved.bagPlacement);
    if(saved.version===4){
      state.lakeNoteRead=saved.lakeNoteRead===true&&state.bagNoteRead;
      state.paperPieces=state.lakeNoteRead&&Array.isArray(saved.paperPieces)?[...new Set<number>(saved.paperPieces.filter((id:unknown):id is number=>typeof id==='number'&&Number.isInteger(id)&&id>=0&&id<5))]:[];
      state.returnLetterRead=state.bagNoteRead&&(saved.returnLetterRead===true||saved.lakeNoteRead===true);
      for(const key of ['trainNoteRead','handsWashed','trainMirrorRevealed','trainLockOpen','treasureKeyTaken','trainLetterRead','dumplingNoteRead','dumplingTrayTaken','dumplingTrayOpen','rainCleared','paperHuntStarted','shovelTaken','treasureDug','treasureOpen','finalDialogueSeen','candleLit','springBookTaken'] as const)state[key]=saved[key]===true;
      state.trainLockWheels=Array.from({length:5},(_,i)=>bounded(saved.trainLockWheels?.[i],i===0?4:9)) as SpringSave['trainLockWheels'];
      state.dumplingsEaten=bounded(saved.dumplingsEaten,SPRING_DUMPLING_COUNT);
      state.pillTaken=state.returnLetterRead&&saved.pillTaken===true;state.pillUsed=state.pillTaken&&saved.pillUsed===true;
      state.dreamReturned=state.pillUsed&&saved.dreamReturned===true;
      // Validate newly added milestones in their playable order. A stale or
      // partial early save must not manufacture the later chapter's rewards.
      state.trainNoteRead=state.dreamReturned&&state.trainNoteRead;
      state.handsWashed=state.trainNoteRead&&state.handsWashed;
      state.trainMirrorRevealed=state.handsWashed&&state.trainMirrorRevealed;
      state.trainLockOpen=state.dreamReturned&&state.trainLockOpen;
      state.treasureKeyTaken=state.trainLockOpen&&state.treasureKeyTaken;
      state.trainLetterRead=state.trainLockOpen&&state.trainLetterRead;
      const mealAvailable=state.treasureKeyTaken&&state.trainLetterRead;
      state.dumplingNoteRead=mealAvailable&&state.dumplingNoteRead;
      state.dumplingTrayTaken=mealAvailable&&state.dumplingTrayTaken;
      state.dumplingTrayOpen=mealAvailable&&state.dumplingTrayOpen;
      if(!mealAvailable)state.dumplingsEaten=0;
      state.rainCleared=mealAvailable&&state.dumplingsEaten===SPRING_DUMPLING_COUNT;
      state.weatherClearStarted=state.rainCleared?(finite(saved.weatherClearStarted,0,now())??0):0;
      // Old scraps remain keepsakes, but the new hunt starts after the meal.
      state.paperHuntStarted=state.rainCleared&&state.dumplingNoteRead&&state.paperHuntStarted;
      state.shovelTaken=state.paperHuntStarted&&state.paperPieces.length===5&&state.shovelTaken;
      state.treasureDug=state.paperHuntStarted&&state.paperPieces.length===5&&state.treasureDug;
      state.treasureOpen=state.treasureDug&&state.treasureKeyTaken&&state.treasureOpen;
      state.finalDialogueSeen=state.treasureOpen&&state.finalDialogueSeen;
      state.candleLit=state.finalDialogueSeen&&state.candleLit;
      state.springBookTaken=state.candleLit&&state.springBookTaken;
      if(state.springBookTaken)state.endingPhase=saved.endingPhase==='complete'?'complete':'reading';
      // Earlier completed dreams already left the bus. Recover the new keepsakes
      // without forcing players to repeat or reset their completed chapter.
      state.journeyNoteRead=state.pillUsed&&(saved.journeyNoteRead===true||state.dreamReturned&&saved.journeyNoteRead===undefined);
      state.compassTaken=state.pillUsed&&(saved.compassTaken===true||state.dreamReturned&&saved.compassTaken===undefined);
      state.glassesTaken=state.pillUsed&&(saved.glassesTaken===true||state.dreamReturned&&saved.glassesTaken===undefined);
      state.questDialogue=bounded(saved.questDialogue,5);state.activeHand=saved.activeHand===1?1:0;
      const allowed=new Set<SpringCarryItem>(state.inventory);state.bagItemsTaken.forEach(item=>allowed.add(item));
      if(state.bagTaken&&!state.bagPlacement||state.bagHeld)allowed.add('backpack');
      if(state.noteRead)allowed.add('letter');if(state.doorNoteRead)allowed.add('door-note');if(state.paperHuntStarted||state.paperPieces.length>0||saved.storageSlots?.includes('bridge-note')||saved.hands?.includes('bridge-note'))allowed.add('bridge-note');if(state.returnLetterRead)allowed.add('pill-letter');if(state.paperPieces.length)allowed.add('paper-fragments');if(state.pillTaken&&!state.pillUsed)allowed.add('pill');
      if(state.journeyNoteRead)allowed.add('journey-note');if(state.compassTaken)allowed.add('compass');if(state.glassesTaken)allowed.add('glasses');
      if(state.treasureKeyTaken)allowed.add('treasure-key');if(state.dumplingTrayTaken){allowed.add('dumpling-tray');allowed.add('chopsticks');}if(state.shovelTaken)allowed.add('shovel');
      const dropped=new Set<SpringCarryItem>();
      for(const raw of Array.isArray(saved.droppedItems)?saved.droppedItems:[]){const p=droppedPlacement(raw);if(p&&allowed.has(p.item)&&!dropped.has(p.item)){state.droppedItems.push(p);dropped.add(p.item);}}
      const unique=new Set<SpringCarryItem>();
      state.storageSlots=Array.from({length:10},(_,i)=>{const item=saved.storageSlots?.[i];if(!isCarryItem(item)||!springCanStore(item)||!allowed.has(item)||dropped.has(item)||unique.has(item))return null;unique.add(item);return item;});
      state.hands=[null,null];for(let i=0;i<2;i++){const item=saved.hands?.[i];if(!isCarryItem(item)||!allowed.has(item)||dropped.has(item)||unique.has(item))continue;if(springItemHands(item)===2){if(state.hands.some(Boolean))continue;state.hands=[item,item];unique.add(item);break;}state.hands[i]=item;unique.add(item);}
      // Old saves could carry a container through the dream. Place it safely
      // before restoring new keepsakes, so both hands remain usable capacity.
      if(state.pillUsed)for(const item of [...new Set(state.hands)])if(item&&springItemHands(item)===2&&item!=='shovel'){removeItem(state,item);unique.delete(item);if(item==='backpack')state.bagPlacement={world:'spring',x:14.7,z:-17,yaw:.55};else state.inventory=state.inventory.filter(owned=>owned!==item);}
      // Restore items missing from older or partially written saves without duplicating ownership.
      for(const item of allowed)if(!unique.has(item)&&!dropped.has(item)){
        if(springItemHands(item)===2){
          if(item==='backpack'){state.bagPlacement=state.bagPlacement??(state.bridgeVisited?{world:'spring',x:14.7,z:-12,yaw:.55}:{world:'adavi',x:192.5,z:8,yaw:.55});}
          else if(item==='shovel')state.shovelTaken=false;
          else state.inventory=state.inventory.filter(owned=>owned!==item);
          continue;
        }
        if(storeItem(state,item))unique.add(item);
        else if(springCanStore(item)){
          // Keep migrated/partially saved keepsakes reachable even when all
          // twelve carried spaces are occupied. This measured bench-side patch
          // is dry, walkable and clear of the seat's collision footprint.
          const bus=state.pillUsed&&!state.dreamReturned;
          state.droppedItems.push({item,world:bus?'bus':'spring',x:bus?399.74:14.7,y:bus?.17:.225,z:bus?2:-17,yaw:.35});
        }
      }
      // Earlier drafts could store either meal prop on its own. Return that
      // interrupted pair to the stall without resetting any eaten dumplings.
      if(state.dumplingTrayTaken&&(!state.hands.includes('dumpling-tray')||!state.hands.includes('chopsticks'))){removeItem(state,'dumpling-tray');removeItem(state,'chopsticks');state.dumplingTrayTaken=false;}
      if(state.pillUsed){if(state.hands.includes('backpack')){removeItem(state,'backpack');state.bagPlacement={world:'spring',x:14.7,z:-17,yaw:.55};}state.dreamPhase=state.dreamReturned?'awake':'bus';state.busSeated=!state.dreamReturned;state.benchSeated=false;removeItem(state,'pill');}
    }else{
      const selected=SPRING_HOTBAR[state.selectedSlot];
      for(const item of state.inventory)if(item!==selected&&springCanStore(item))storeItem(state,item);
      if(selected&&state.inventory.includes(selected))equipItem(state,selected);
      for(const item of state.bagItemsTaken)storeItem(state,item);
      if(state.bagTaken&&(state.bagHeld||!state.bagPlacement))equipItem(state,'backpack');
    }
    // Legacy container ownership denotes a serving left on the stall, never a slot.
    state.inventory=state.inventory.filter(item=>springItemHands(item)===1||state.hands.includes(item));
    if(state.bagTaken&&!state.hands.includes('backpack')&&!state.bagPlacement)state.bagPlacement=state.bridgeVisited?{world:'spring',x:14.7,z:-12,yaw:.55}:{world:'adavi',x:192.5,z:8,yaw:.55};
    syncHands(state);
  }}catch{/* The game also works without browser storage. */}
  let guard:((action:string,value?:unknown)=>boolean)|undefined;
  const controller={
    get state(){return state;},snapshot:()=>state,
    subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
    setGuard(fn:(action:string,value?:unknown)=>boolean){guard=fn;},
    act(action:string,value?:unknown):boolean{
      if(guard&&!guard(action,value))return false;
      if(state.bagNoteOpen&&!['close-bag-note','stow-bag-item','return-bag-item','put-bag','reset'].includes(action))return false;
      if(state.questNoteOpen&&!['close-quest-note','reset'].includes(action))return false;
      if(state.trainNoteOpen&&!['close-train-note','reset'].includes(action))return false;
      if(['walking','sitting','opening','reading'].includes(state.endingPhase)&&!['ending-phase','close-spring-book','reset'].includes(action))return false;
      if(state.trainCaseOpen&&!['turn-train-wheel','unlock-train-case','close-train-case','reset'].includes(action))return false;
      if(state.treasureOpen&&!state.finalDialogueSeen&&!['dismiss-final-dialogue','reset'].includes(action))return false;
      if(state.diggingStarted&&!['finish-dig','reset'].includes(action))return false;
      if(state.candleFocusStarted&&!['cancel-candle-focus','light-candle','reset'].includes(action))return false;
      if(['closing','sleeping','waking','return-closing','return-waking'].includes(state.dreamPhase)&&!['sleep-phase','wake-in-bus','wake-at-bench','finish-waking','reset'].includes(action))return false;
      if(['aiming','flying'].includes(state.skipPhase)&&['select-slot','select-hand','equip-storage','stow-hand','move-storage','move-inventory','drop-inventory','pickup-dropped','take-item','take-bag','hold-bag-item','stow-bag-item'].includes(action))return false;
      if(state.adaviActive&&['intro-next','dismiss-guide','read-letter','read-door-note','put-paper','take-basket','take-item','put-basket','return-held','eat-rambutan','eat-held','take-key','unlock-door'].includes(action))return false;
      const next:SpringSave={...state,inventory:[...state.inventory],foodEaten:{...state.foodEaten},bagItemsTaken:[...state.bagItemsTaken],storageSlots:[...state.storageSlots],hands:[...state.hands],paperPieces:[...state.paperPieces],droppedItems:[...state.droppedItems],trainLockWheels:[...state.trainLockWheels],inventoryNotice:''};
      const held=springHeldItem(state),eating=state.eatRevision>0&&now()-state.eatStarted<SPRING_EAT_MS||state.dumplingEatStarted>0&&now()-state.dumplingEatStarted<1500;
      const canChooseStone=state.adaviActive&&state.adaviIntroStep===ADAVI_INTRO_PAGES&&!state.stoneChallengeComplete&&!state.bagNoteOpen;
      const canUseBag=state.bagTaken&&state.skipPhase==='exploring'&&!springAdaviDialogue(state)&&!eating&&!state.paperHeld;
      const noRoom=()=>{state={...state,inventoryNotice:state.hands.some(item=>item&&springItemHands(item)===2)?'This needs both hands and cannot go in storage. Set down the backpack or return the serving to the stall first.':'Your storage and hands are full. Put an item back to make room.'};listeners.forEach(fn=>fn());return false;};
      switch(action){
        case 'intro-next':next.introStep=Math.min(INTRO_PAGES,state.introStep+1);break;
        case 'dismiss-guide':next.introStep=INTRO_PAGES;next.riverGuideSeen=true;break;
        case 'read-letter':if(!equipItem(next,'letter'))return noRoom();next.noteRead=true;next.paperHeld='letter';break;
        case 'read-door-note':if(held!=='basket'||state.foodEaten.basket!==RAMBUTAN_COUNT||eating)return false;removeItem(next,'basket');next.inventory=next.inventory.filter(item=>item!=='basket');if(!equipItem(next,'door-note'))return noRoom();next.doorNoteRead=true;next.paperHeld='door-note';break;
        case 'put-paper':if(state.paperHeld&&!stowItem(next,state.paperHeld))return noRoom();next.paperHeld=null;break;
        case 'take-basket':return controller.act('take-item','basket');
        case 'take-item':if(!isItem(value)||value==='key'||eating||springRemaining(state,value)===0&&value!=='basket')return false;if(!equipItem(next,value))return noRoom();if(!next.inventory.includes(value))next.inventory.push(value);next.paperHeld=null;break;
        case 'select-slot':{if(eating||typeof value!=='number'||!Number.isInteger(value)||value<0||value>8)return false;const item=SPRING_HOTBAR[value];if(item&&state.inventory.includes(item)){if(!equipItem(next,item))return noRoom();}else for(const heldItem of [...new Set(next.hands)])if(heldItem&&!stowItem(next,heldItem))return noRoom();next.paperHeld=null;break;}
        case 'select-hand':if(eating||value!==0&&value!==1)return false;next.activeHand=value;next.paperHeld=null;break;
        case 'equip-storage':{if(eating||typeof value!=='number'||!Number.isInteger(value)||value<0||value>=10)return false;const item=state.storageSlots[value];if(!item)return false;if(!equipItem(next,item))return noRoom();next.paperHeld=null;if(item==='letter'||item==='door-note')next.paperHeld=item;else if(item==='note'){next.bagNoteOpen=true;next.bagNoteRead=true;}else if(item==='bridge-note')next.questNoteOpen=state.paperHuntStarted?'bridge-note':'pill-letter';else if(item==='pill-letter'||item==='paper-fragments'||item==='journey-note')next.questNoteOpen=item;break;}
        case 'stow-hand':{if(eating||value!==0&&value!==1)return false;const item=state.hands[value];if(!item)return false;if(!stowItem(next,item))return noRoom();next.paperHeld=null;break;}
        case 'move-storage':{
          const v=value as {from:number;to:number;item:SpringCarryItem};
          if(eating||!v||![v.from,v.to].every(n=>Number.isInteger(n)&&n>=0&&n<10)||v.from===v.to||!v.item||state.storageSlots[v.from]!==v.item)return false;
          [next.storageSlots[v.from],next.storageSlots[v.to]]=[next.storageSlots[v.to],next.storageSlots[v.from]];break;
        }
        case 'move-inventory':{
          const v=value as {from:number;to:number;item:SpringCarryItem};
          if(eating||!v||![v.from,v.to].every(n=>Number.isInteger(n)&&n>=0&&n<12)||v.from===v.to)return false;
          const get=(slot:number)=>slot<10?state.storageSlots[slot]:state.hands[slot-10];
          const item=get(v.from),other=get(v.to);
          if(!item||item!==v.item)return false;
          if(springItemHands(item)===2||other&&springItemHands(other)===2)return noRoom();
          if(v.to<10&&!springCanStore(item)||v.from<10&&other&&!springCanStore(other))return false;
          const set=(slot:number,held:SpringCarryItem|null)=>{if(slot<10)next.storageSlots[slot]=held;else next.hands[slot-10]=held;};
          set(v.from,other);set(v.to,item);if(v.to>=10)next.activeHand=(v.to-10) as 0|1;
          next.paperHeld=null;break;
        }
        case 'drop-inventory':{
          const v=value as {slot:number;item:SpringCarryItem;placement:SpringDroppedItem},p=droppedPlacement(v?.placement);
          if(eating||!v||!Number.isInteger(v.slot)||v.slot<0||v.slot>=12||(v.slot<10?state.storageSlots[v.slot]:state.hands[v.slot-10])!==v.item||!p||p.item!==v.item||state.droppedItems.some(d=>d.item===v.item))return false;
          removeItem(next,v.item);next.droppedItems.push(p);next.paperHeld=null;break;
        }
        case 'pickup-dropped':{
          if(eating||!isCarryItem(value))return false;const dropped=state.droppedItems.find(p=>p.item===value);if(!dropped)return false;
          if(!storeItem(next,value))return noRoom();next.droppedItems=next.droppedItems.filter(p=>p.item!==value);break;
        }
        case 'inventory-notice':if(typeof value!=='string')return false;next.inventoryNotice=value.slice(0,180);break;
        case 'put-basket':if(held!=='basket')return false;removeItem(next,'basket');next.inventory=next.inventory.filter(item=>item!=='basket');next.paperHeld=null;break;
        case 'return-held':if(!held||held==='key'||eating)return false;removeItem(next,held);next.inventory=next.inventory.filter(item=>item!==held);next.paperHeld=null;break;
        case 'eat-rambutan':if(held!=='basket')return false;return controller.act('eat-held');
        case 'eat-held':if(!held||held==='key'||state.paperHeld||eating||springRemaining(state,held)===0)return false;next.foodEaten[held]++;next.eatStarted=now();next.eatRevision++;next.lastEaten=held;break;
        case 'take-key':if(held!=='basket'||state.foodEaten.basket!==RAMBUTAN_COUNT||state.keyTaken||eating)return false;if(!storeItem(next,'key'))return noRoom();next.keyTaken=true;next.inventory.push('key');break;
        case 'unlock-door':if(held!=='key'||!state.keyTaken||eating)return false;next.doorUnlocked=true;break;
        case 'visit-river':if(!state.doorUnlocked)return false;next.riverVisited=true;break;
        case 'key-guide-seen':next.keyGuideSeen=true;break;
        case 'river-guide-seen':next.riverGuideSeen=true;break;
        case 'enter-adavi':if(!state.doorUnlocked||state.adaviActive||eating)return false;next.adaviActive=true;next.riverVisited=true;next.paperHeld=null;next.selectedStone=null;next.skipPhase='exploring';next.skipContacts=0;next.skipResult=null;break;
        case 'exit-adavi':if(!state.adaviActive||springAdaviDialogue(state)||state.skipPhase==='aiming'||state.skipPhase==='flying'||state.bagNoteOpen)return false;removeItem(next,'river-stone');next.adaviActive=false;next.bagOpen=false;next.selectedStone=null;next.skipPhase='exploring';next.skipContacts=0;next.skipResult=null;break;
        case 'adavi-intro-next':if(!state.adaviActive||state.adaviIntroStep>=ADAVI_INTRO_PAGES)return false;next.adaviIntroStep++;break;
        case 'adavi-win-next':if(!state.adaviActive||!state.stoneChallengeComplete||state.adaviWinStep>=ADAVI_WIN_PAGES)return false;next.adaviWinStep++;break;
        case 'pick-stone':if(!canChooseStone||state.skipPhase!=='exploring'||!isStone(value))return false;if(!equipItem(next,'river-stone'))return noRoom();next.selectedStone=value;next.skipSeed=Math.floor((finite(random(),0,1)??0)*1_000_000);next.skipResult=null;next.skipContacts=0;break;
        case 'put-stone':if(!canChooseStone||state.skipPhase!=='exploring'||!state.selectedStone)return false;removeItem(next,'river-stone');next.selectedStone=null;break;
        case 'aim-stone':if(!canChooseStone||state.skipPhase!=='exploring'||!state.selectedStone)return false;next.skipPhase='aiming';next.skipResult=null;next.skipContacts=0;break;
        case 'cancel-aim':if(!canChooseStone||state.skipPhase!=='aiming')return false;next.skipPhase='exploring';break;
        case 'set-skip-power':{const v=finite(value,.15,1);if(!canChooseStone||state.skipPhase!=='aiming'||v===null)return false;next.skipPower=v;break;}
        case 'set-skip-angle':{const v=finite(value,4,40);if(!canChooseStone||state.skipPhase!=='aiming'||v===null)return false;next.skipAngle=v;break;}
        case 'set-skip-aim':{const v=finite(value,-25,25);if(!canChooseStone||state.skipPhase!=='aiming'||v===null)return false;next.skipAim=v;break;}
        case 'throw-stone':if(!canChooseStone||state.skipPhase!=='aiming'||!state.selectedStone)return false;removeItem(next,'river-stone');next.skipPhase='flying';next.skipContacts=0;break;
        case 'skip-contact':if(!state.adaviActive||state.skipPhase!=='flying'||typeof value!=='number'||!Number.isInteger(value)||value<=state.skipContacts||value>10)return false;next.skipContacts=value;break;
        case 'finish-throw':{if(!state.adaviActive||state.skipPhase!=='flying'||!value||typeof value!=='object')return false;const result=value as SpringSkipResult;if(typeof result.success!=='boolean'||!Number.isInteger(result.skips)||result.skips<0||result.skips>10||result.success&&result.skips<4||!Number.isFinite(result.distance)||result.distance<0||typeof result.feedback!=='string')return false;next.skipResult={success:result.success,skips:result.skips,distance:result.distance,feedback:result.feedback.slice(0,500)};next.skipContacts=result.skips;next.skipPhase='result';if(result.success){next.stoneChallengeComplete=true;next.selectedStone=null;}break;}
        case 'retry-stone':if(!state.adaviActive||state.skipPhase!=='result'||state.stoneChallengeComplete)return false;next.skipPhase='exploring';next.selectedStone=null;next.skipResult=null;next.skipContacts=0;break;
        case 'reveal-bag':if(!state.adaviActive||!state.stoneChallengeComplete||state.adaviWinStep!==ADAVI_WIN_PAGES||state.bagRevealed)return false;next.bagRevealed=true;next.skipPhase='exploring';next.skipResult=null;break;
        case 'take-bag':if(!state.stoneChallengeComplete||!state.bagRevealed||state.bagHeld||state.adaviWinStep!==ADAVI_WIN_PAGES||state.skipPhase!=='exploring'||springAdaviDialogue(state))return false;if(!equipItem(next,'backpack'))return noRoom();next.bagTaken=true;next.bagOpen=false;next.bagPlacement=null;next.paperHeld=null;break;
        case 'stow-bag':if(!canUseBag||!state.bagHeld)return false;return noRoom();
        case 'put-bag':{const placement=bagPlacement(value);if(!canUseBag||!state.bagHeld||!placement)return false;removeItem(next,'backpack');next.bagOpen=false;next.bagPlacement=placement;break;}
        case 'open-bag':if(!canUseBag||!state.bagHeld||state.bagOpen||state.bagNoteOpen)return false;next.bagOpen=true;break;
        case 'close-bag':if(!canUseBag||!state.bagHeld||!state.bagOpen||state.bagNoteOpen)return false;next.bagOpen=false;break;
        case 'take-bag-item':if(!canUseBag||!state.bagHeld||!state.bagOpen||!isBagItem(value)||state.bagItemsTaken.includes(value))return false;if(!storeItem(next,value))return noRoom();next.bagItemsTaken.push(value);if(value==='note'){next.bagNoteRead=true;next.bagNoteOpen=true;}break;
        case 'hold-bag-item':if(!canUseBag||!isBagItem(value)||!state.bagItemsTaken.includes(value))return false;if(!equipItem(next,value))return noRoom();if(value==='note'){next.bagNoteRead=true;next.bagNoteOpen=true;}break;
        case 'return-bag-item':if(!canUseBag||!state.bagItemHeld)return false;removeItem(next,state.bagItemHeld);next.bagItemsTaken=next.bagItemsTaken.filter(item=>item!==state.bagItemHeld);next.bagNoteOpen=false;break;
        case 'stow-bag-item':if(!canUseBag||!state.bagItemHeld)return false;if(!stowItem(next,state.bagItemHeld))return noRoom();next.bagNoteOpen=false;break;
        case 'read-bag-note':if(!canUseBag||!state.bagItemsTaken.includes('note'))return false;next.bagNoteRead=true;next.bagNoteOpen=true;break;
        case 'close-bag-note':if(!state.bagNoteOpen)return false;next.bagNoteOpen=false;break;
        case 'visit-bridge':if(state.adaviActive||!state.bagTaken||!state.bagNoteRead)return false;next.bridgeVisited=true;break;
        case 'read-bridge-note':if(state.adaviActive||state.dreamPhase!=='awake'||!state.bagTaken||!state.bagNoteRead)return false;next.bridgeVisited=true;next.lakeNoteRead=true;if(state.rainCleared&&state.dumplingNoteRead){if(!storeItem(next,'bridge-note'))return noRoom();next.paperHuntStarted=true;next.questNoteOpen='bridge-note';next.questDialogue=1;}else{if(!storeItem(next,'pill-letter'))return noRoom();next.returnLetterRead=true;next.questNoteOpen='pill-letter';next.questDialogue=4;}break;
        case 'collect-paper':if(state.adaviActive||state.dreamPhase!=='awake'||!state.paperHuntStarted||!state.rainCleared||typeof value!=='number'||!Number.isInteger(value)||value<0||value>4||state.paperPieces.includes(value))return false;if(!storeItem(next,'paper-fragments'))return noRoom();next.paperPieces.push(value);next.paperPieces.sort((a,b)=>a-b);if(next.paperPieces.length===1)next.questDialogue=2;if(next.paperPieces.length===5)next.questDialogue=3;break;
        case 'inspect-fragments':if(!state.paperPieces.length)return false;next.questNoteOpen='paper-fragments';break;
        case 'read-return-letter':if(state.adaviActive||state.dreamPhase!=='awake'||!state.bagNoteRead||state.rainCleared)return false;if(!storeItem(next,'pill-letter'))return noRoom();next.returnLetterRead=true;next.questNoteOpen='pill-letter';next.questDialogue=4;break;
        case 'close-quest-note':if(!state.questNoteOpen)return false;next.questNoteOpen=null;break;
        case 'take-pill':if(state.adaviActive||state.dreamPhase!=='awake'||!state.returnLetterRead||state.pillTaken)return false;if(!storeItem(next,'pill'))return noRoom();next.pillTaken=true;break;
        case 'sit-bench':if(state.adaviActive||state.dreamPhase!=='awake'||state.benchSeated)return false;next.benchSeated=true;break;
        case 'stand-up':if(!state.benchSeated||state.dreamPhase!=='awake')return false;next.benchSeated=false;break;
        case 'take-pill-seated':if(state.adaviActive||!state.benchSeated||!state.pillTaken||state.pillUsed||!springOwnsItem(state,'pill')||state.dreamPhase!=='awake')return false;if(next.hands.includes('backpack')){removeItem(next,'backpack');next.bagOpen=false;next.bagPlacement={world:'spring',x:14.7,z:-17,yaw:.55};}if(!equipItem(next,'pill'))return noRoom();next.pillUsed=true;next.dreamPhase='closing';next.dreamStarted=now();next.questDialogue=0;break;
        case 'sleep-phase':if(value==='sleeping'&&state.dreamPhase==='closing'&&now()-state.dreamStarted>=1100){removeItem(next,'pill');next.dreamPhase='sleeping';}else if(value==='waking'&&state.dreamPhase==='sleeping'&&now()-state.dreamStarted>=4600){next.dreamPhase='waking';next.benchSeated=false;next.busSeated=true;}else return false;break;
        case 'wake-in-bus':if(state.dreamPhase!=='waking'||now()-state.dreamStarted<4600)return false;next.dreamPhase='bus';next.benchSeated=false;next.busSeated=true;next.questDialogue=5;break;
        case 'stand-bus':if(state.dreamPhase!=='bus'||!state.busSeated)return false;next.busSeated=false;break;
        case 'sit-bus':if(state.dreamPhase!=='bus'||state.busSeated)return false;next.busSeated=true;break;
        case 'read-journey-note':if(state.dreamPhase!=='bus')return false;if(!storeItem(next,'journey-note'))return noRoom();next.journeyNoteRead=true;next.questNoteOpen='journey-note';break;
        case 'read-stored-journey-note':if(!state.journeyNoteRead||!springOwnsItem(state,'journey-note'))return false;next.questNoteOpen='journey-note';break;
        case 'take-compass':if(state.dreamPhase!=='bus'||state.compassTaken)return false;if(!storeItem(next,'compass'))return noRoom();next.compassTaken=true;break;
        case 'take-glasses':if(state.dreamPhase!=='bus'||state.glassesTaken)return false;if(!storeItem(next,'glasses'))return noRoom();next.glassesTaken=true;break;
        case 'hold-compass':if(!state.compassTaken||!springOwnsItem(state,'compass'))return false;if(!equipItem(next,'compass'))return noRoom();break;
        case 'return-from-bus':if(state.dreamPhase!=='bus'||!state.journeyNoteRead||!state.compassTaken||!state.glassesTaken||!springOwnsItem(state,'journey-note')||!springOwnsItem(state,'compass')||!springOwnsItem(state,'glasses'))return false;next.dreamPhase='return-closing';next.dreamStarted=now();next.questDialogue=0;break;
        case 'wake-at-bench':if(state.dreamPhase!=='return-closing'||now()-state.dreamStarted<1100)return false;next.dreamPhase='return-waking';next.dreamReturned=true;next.busSeated=false;next.benchSeated=true;break;
        case 'finish-waking':if(state.dreamPhase!=='return-waking'||now()-state.dreamStarted<2800)return false;next.dreamPhase='awake';next.questDialogue=6;break;
        case 'dismiss-quest-dialogue':next.questDialogue=0;break;
        case 'read-train-note':if(!state.dreamReturned||state.adaviActive||state.dreamPhase!=='awake')return false;next.trainNoteRead=true;next.trainNoteOpen='train-note';break;
        case 'close-train-note':if(!state.trainNoteOpen)return false;next.trainNoteOpen=null;break;
        case 'wash-hands':if(!state.dreamReturned||!state.trainNoteRead||state.adaviActive||state.dreamPhase!=='awake')return false;next.handsWashed=true;next.inventoryNotice='Clean hands. Try the door beside the wash area.';break;
        case 'reveal-train-mirror':if(!state.handsWashed)return false;next.trainMirrorRevealed=true;break;
        case 'open-train-case':if(!state.dreamReturned||state.adaviActive||state.dreamPhase!=='awake'||state.trainLockOpen)return false;next.trainCaseOpen=true;break;
        case 'close-train-case':next.trainCaseOpen=false;break;
        case 'turn-train-wheel':{const v=value as {index:number;delta:number};if(!state.trainCaseOpen||state.trainLockOpen||!v||!Number.isInteger(v.index)||v.index<0||v.index>4||![-1,1].includes(v.delta))return false;const count=v.index===0?5:10;next.trainLockWheels[v.index]=(state.trainLockWheels[v.index]+v.delta+count)%count;break;}
        case 'unlock-train-case':if(!state.trainCaseOpen||state.trainLockOpen)return false;if(!state.trainLockWheels.every((v,i)=>v===[0,1,1,9,6][i])){next.inventoryNotice='The clasp holds. Try another combination.';break;}next.trainLockOpen=true;next.trainCaseOpen=false;break;
        case 'take-treasure-key':if(!state.trainLockOpen||state.treasureKeyTaken)return false;if(!storeItem(next,'treasure-key'))return noRoom();next.treasureKeyTaken=true;break;
        case 'read-train-letter':if(!state.trainLockOpen)return false;next.trainLetterRead=true;next.trainNoteOpen='train-letter';break;
        case 'read-dumpling-note':if(!state.trainLetterRead||!state.treasureKeyTaken)return false;next.dumplingNoteRead=true;next.questNoteOpen='dumpling-note';break;
        case 'take-dumplings':if(!state.trainLetterRead||!state.treasureKeyTaken||state.adaviActive||state.dreamPhase!=='awake')return false;if(state.dumplingTrayTaken&&(!springOwnsItem(state,'dumpling-tray')||!springOwnsItem(state,'chopsticks')))return false;removeItem(next,'dumpling-tray');removeItem(next,'chopsticks');for(const item of [...new Set(next.hands)])if(item&&!stowItem(next,item))return noRoom();next.hands=['dumpling-tray','chopsticks'];next.activeHand=0;next.dumplingTrayTaken=true;break;
        case 'return-dumplings':if(!state.dumplingTrayTaken||!springOwnsItem(state,'dumpling-tray')||!springOwnsItem(state,'chopsticks')||state.dumplingEatStarted&&now()-state.dumplingEatStarted<1500)return false;removeItem(next,'dumpling-tray');removeItem(next,'chopsticks');next.dumplingTrayTaken=false;break;
        case 'open-dumplings':if(!state.dumplingTrayTaken||!state.hands.includes('dumpling-tray'))return false;next.dumplingTrayOpen=true;break;
        case 'eat-dumpling':if(!state.dumplingTrayOpen||!state.hands.includes('dumpling-tray')||!state.hands.includes('chopsticks')||state.dumplingsEaten>=SPRING_DUMPLING_COUNT||state.dumplingEatStarted&&now()-state.dumplingEatStarted<1500)return false;next.dumplingsEaten++;next.dumplingEatStarted=now();if(next.dumplingsEaten===SPRING_DUMPLING_COUNT){next.rainCleared=true;next.weatherClearStarted=now();}break;
        case 'take-shovel':if(!state.paperHuntStarted||state.paperPieces.length!==5||state.shovelTaken||state.treasureDug)return false;if(!equipItem(next,'shovel'))return noRoom();next.shovelTaken=true;break;
        case 'put-shovel':if(!state.shovelTaken||!state.hands.includes('shovel'))return false;removeItem(next,'shovel');next.shovelTaken=false;break;
        case 'dig-treasure':if(!state.paperHuntStarted||state.paperPieces.length!==5||!state.rainCleared||!state.hands.includes('shovel')||state.treasureDug||state.diggingStarted)return false;next.diggingStarted=now();break;
        case 'finish-dig':if(!state.diggingStarted||now()-state.diggingStarted<6000)return false;next.treasureDug=true;next.diggingStarted=0;break;
        case 'open-treasure':if(!state.treasureDug||!state.hands.includes('treasure-key')||state.treasureOpen)return false;next.treasureOpen=true;break;
        case 'dismiss-final-dialogue':if(!state.treasureOpen)return false;next.finalDialogueSeen=true;break;
        case 'focus-candle':if(!state.treasureOpen||!state.finalDialogueSeen||!state.rainCleared||state.candleLit||!state.hands.includes('candle')||!state.hands.includes('glasses')||state.candleFocusStarted)return false;next.candleFocusStarted=now();break;
        case 'cancel-candle-focus':if(!state.candleFocusStarted)return false;next.candleFocusStarted=0;break;
        case 'light-candle':if(!state.candleFocusStarted||now()-state.candleFocusStarted<4000||!state.hands.includes('candle')||!state.hands.includes('glasses'))return false;next.candleLit=true;next.candleFocusStarted=0;break;
        case 'take-spring-book':if(!state.treasureOpen||!state.candleLit||!state.hands.includes('candle')||state.springBookTaken)return false;next.springBookTaken=true;next.endingPhase='walking';next.endingStarted=now();break;
        case 'ending-phase':{const order=['walking','sitting','opening','reading'];if(typeof value!=='string'||order.indexOf(value)<1||order.indexOf(value)!==order.indexOf(state.endingPhase)+1||!state.springBookTaken)return false;next.endingPhase=value as SpringSave['endingPhase'];next.endingStarted=now();break;}
        case 'close-spring-book':if(state.endingPhase!=='reading')return false;next.endingPhase='complete';break;
        case 'read-spring-book':if(!state.springBookTaken||state.endingPhase!=='complete')return false;next.endingPhase='reading';next.endingStarted=now();break;
        case 'reset':Object.assign(next,initial());break;
        default:return false;
      }
      next.rambutanEaten=next.foodEaten.basket;syncHands(next);
      if(JSON.stringify(next)===JSON.stringify(state))return true;
      state=next;try{const {eatStarted,eatRevision,lastEaten,paperHeld,adaviActive,selectedStone,skipPhase,skipPower,skipAngle,skipAim,skipSeed,skipContacts,skipResult,bagNoteOpen,bagOpen,bagItemHeld,questNoteOpen,benchSeated,dreamStarted,questDialogue,inventoryNotice,trainNoteOpen,trainCaseOpen,dumplingEatStarted,diggingStarted,candleFocusStarted,endingStarted,...save}=state;void eatStarted;void eatRevision;void lastEaten;void paperHeld;void adaviActive;void selectedStone;void skipPhase;void skipPower;void skipAngle;void skipAim;void skipSeed;void skipContacts;void skipResult;void bagNoteOpen;void bagOpen;void bagItemHeld;void questNoteOpen;void benchSeated;void dreamStarted;void questDialogue;void inventoryNotice;void trainNoteOpen;void trainCaseOpen;void dumplingEatStarted;void diggingStarted;void candleFocusStarted;void endingStarted;storage?.setItem(SPRING_SAVE_KEY,JSON.stringify(save));}catch{/* Session remains playable. */}
      listeners.forEach(fn=>fn());return true;
    },
  };return controller;
}
export type SpringTreasureController=ReturnType<typeof createSpringTreasureState>;
