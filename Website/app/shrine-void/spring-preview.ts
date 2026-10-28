/** Disposable authoring fixtures. They never read or write the player's save. */
export type SpringPreviewChapter='river'|'bus'|'rail'|'adavi'|'meal'|'hunt'|'dig'|'light'|'ending';
export function createSpringPreviewStorage(chapter:SpringPreviewChapter){
  const afterBus=!['river','adavi','bus'].includes(chapter),afterTrain=afterBus&&chapter!=='rail',afterMeal=afterTrain&&chapter!=='meal',afterHunt=['dig','light','ending'].includes(chapter),afterDig=['light','ending'].includes(chapter);
  let save=JSON.stringify({version:4,introStep:2,noteRead:true,doorNoteRead:true,
    keyTaken:true,doorUnlocked:true,riverVisited:true,stoneChallengeComplete:true,
    bagRevealed:true,bagTaken:true,bagNoteRead:true,bridgeVisited:true,
    bagHeld:false,bagItemsTaken:['mushroom-toy','candle','note'],inventory:['key'],
    storageSlots:['key','mushroom-toy','candle','glasses','compass',...(afterTrain?['treasure-key']:[]),null,null,null,null].slice(0,10),
    glassesTaken:afterBus,compassTaken:afterBus,journeyNoteRead:afterBus,
    hands:afterHunt&&!afterDig?['shovel','shovel']:[null,null],lakeNoteRead:chapter!=='adavi'&&chapter!=='river',paperPieces:afterHunt?[0,1,2,3,4]:[],
    returnLetterRead:chapter!=='adavi'&&chapter!=='river',pillTaken:chapter!=='adavi'&&chapter!=='river',pillUsed:chapter!=='adavi'&&chapter!=='river',dreamReturned:afterBus,
    trainNoteRead:afterTrain,handsWashed:afterTrain,trainMirrorRevealed:afterTrain,trainLockOpen:afterTrain,treasureKeyTaken:afterTrain,trainLetterRead:afterTrain,
    dumplingNoteRead:afterMeal,dumplingsEaten:afterMeal?7:0,rainCleared:afterMeal,paperHuntStarted:afterMeal,shovelTaken:afterHunt,treasureDug:afterDig,treasureOpen:afterDig,finalDialogueSeen:afterDig,candleLit:chapter==='ending'});
  return {getItem:()=>save,setItem:(_key:string,value:string)=>{save=value;}};
}
