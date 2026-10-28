/** Pointer intent shared by mouse, pen and touch inventory controls. */
export const SPRING_INVENTORY_HOLD_MS=480;
export const SPRING_INVENTORY_DOUBLE_MS=320;
export const SPRING_INVENTORY_DRAG_PX=9;
export function springInventoryDropTarget(x:number,y:number,slots:{index:number;left:number;right:number;top:number;bottom:number}[],bounds:{left:number;right:number;top:number;bottom:number}){
  const slot=slots.find(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);
  if(slot)return {kind:'slot' as const,index:slot.index};
  return {kind:x<bounds.left-12||x>bounds.right+12||y<bounds.top-12||y>bounds.bottom+12?'world' as const:'cancel' as const};
}
