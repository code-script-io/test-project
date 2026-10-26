export interface AudioPoint { x:number; z:number; }
export interface AudioListenerPoint extends AudioPoint { yaw:number; }
export const clampAudio=(value:number,min:number,max:number,fallback=0)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
/** Horizontal listener-relative spatialization. Positive pan is the listener's right. */
export function spatialMix(position:AudioPoint,listener:AudioListenerPoint){
  const dx=position.x-listener.x,dz=position.z-listener.z,distance=Math.hypot(dx,dz);
  const yaw=Number.isFinite(listener.yaw)?listener.yaw:0;
  return {
    distance,
    pan:distance<.001?0:clampAudio((dx*Math.cos(yaw)-dz*Math.sin(yaw))/distance,-1,1),
    gain:Number.isFinite(distance)?1/(1+.12*distance+.035*distance*distance):0,
    cutoff:Number.isFinite(distance)?Math.max(650,8500/(1+distance*.21)):650
  };
}
