declare module "page-flip/dist/js/page-flip.module.js" {
  export class PageFlip {
    constructor(element:HTMLElement,settings:Record<string,unknown>);
    loadFromHTML(elements:HTMLElement[]):void;
    on(event:string,callback:(event:{data:number|{page:number;mode:string}})=>void):void;
    flipNext(corner?:"top"|"bottom"):void;
    flipPrev(corner?:"top"|"bottom"):void;
    turnToPage(index:number):void;
    getCurrentPageIndex():number;
    getOrientation():"portrait"|"landscape";
    update():void;
    destroy():void;
  }
}
