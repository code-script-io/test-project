export type PauseReason='toggle'|'focus'|'pointer';
export class Input {
  private touchMode:'auto'|'on'|'off'='auto';
  keys=new Set<string>(); pressed=new Set<string>(); dx=0;dy=0;aim=false; fire=false; touch=false;
  move={x:0,y:0}; look={x:0,y:0}; private leftId=-1;private rightId=-1; private origin={x:0,y:0};private last={x:0,y:0};private dragging=false;
  constructor(public canvas: HTMLCanvasElement, public onPause:(reason:PauseReason)=>void) {
    this.setTouchMode('auto');window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&this.touchMode==='auto'){this.touch=true;document.body.classList.add('touch');}},{capture:true});
    window.addEventListener('keydown',e=>{
      if(e.code==='Escape'||(e.code==='KeyP'&&!(e.target instanceof HTMLInputElement))){e.preventDefault();if(!e.repeat)this.onPause('toggle');return;}
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
      if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      if(!e.repeat)this.pressed.add(e.code);this.keys.add(e.code);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas||this.dragging){this.dx+=e.movementX;this.dy+=e.movementY;}});
    canvas.addEventListener('mousedown',e=>{if(document.pointerLockElement!==canvas&&!this.touch){this.dragging=true;this.lock();return;}if(e.button===0){this.fire=true;this.pressed.add('Fire');}if(e.button===2)this.aim=true;});
    window.addEventListener('mouseup',e=>{this.dragging=false;if(e.button===0)this.fire=false;if(e.button===2)this.aim=false;});
    window.addEventListener('blur',()=>{this.clear();this.onPause('focus');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.onPause('focus');}});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    document.addEventListener('pointerlockchange',()=>{this.dragging=false;if(!document.pointerLockElement&&!this.touch)this.onPause('pointer');});
    this.bindTouch();
  }
  setTouchMode(mode:'auto'|'on'|'off'){this.touchMode=mode;this.touch=mode==='on'||(mode==='auto'&&(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches));document.body.classList.toggle('touch',this.touch);}
  lock(){if(!this.touch)try{const promise=this.canvas.requestPointerLock();promise?.catch(()=>{});}catch{}}
  down(...codes:string[]){return codes.some(c=>this.keys.has(c));}
  take(code:string){const yes=this.pressed.has(code);this.pressed.delete(code);return yes;}
  clear(){this.keys.clear();this.pressed.clear();this.fire=false;this.aim=false;this.dragging=false;this.dx=this.dy=0;this.leftId=this.rightId=-1;this.move={x:0,y:0};this.look={x:0,y:0};const nub=document.querySelector<HTMLElement>('#touch-move i');if(nub)nub.style.transform='';}
  end(){this.dx=this.dy=0;this.pressed.clear();}
  bindTouch(){
    const zone=document.querySelector<HTMLElement>('#touch-move')!, nub=zone.querySelector<HTMLElement>('i')!;
    zone.addEventListener('pointerdown',e=>{if(this.leftId!==-1)return;this.leftId=e.pointerId;this.origin={x:e.clientX,y:e.clientY};zone.setPointerCapture(e.pointerId);});
    zone.addEventListener('pointermove',e=>{if(e.pointerId!==this.leftId)return;const x=e.clientX-this.origin.x,y=e.clientY-this.origin.y,l=Math.max(1,Math.hypot(x,y)/44);this.move={x:x/l/44,y:-y/l/44};nub.style.transform=`translate(${x/l}px,${y/l}px)`;});
    const stop=(e:PointerEvent)=>{if(e.pointerId!==this.leftId)return;this.leftId=-1;this.move={x:0,y:0};nub.style.transform='';};for(const type of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(type,stop as EventListener);
    const look=document.querySelector<HTMLElement>('#touch-look')!;
    look.addEventListener('pointerdown',e=>{if(this.rightId!==-1)return;this.rightId=e.pointerId;this.last={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId);});
    look.addEventListener('pointermove',e=>{if(e.pointerId!==this.rightId)return;this.dx+=(e.clientX-this.last.x)*1.8;this.dy+=(e.clientY-this.last.y)*1.8;this.last={x:e.clientX,y:e.clientY};});
    const stopLook=(e:PointerEvent)=>{if(e.pointerId===this.rightId)this.rightId=-1;};for(const type of ['pointerup','pointercancel','lostpointercapture'])look.addEventListener(type,stopLook as EventListener);
    document.querySelectorAll<HTMLElement>('[data-touch]').forEach(b=>{
      const code=b.dataset.touch!;
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(code==='fire'){this.fire=true;this.pressed.add('Fire');}else if(code==='aim')this.aim=!this.aim;else{this.keys.add(code);this.pressed.add(code);}});
      const up=()=>{if(code==='fire')this.fire=false;else this.keys.delete(code);};for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,up);
    });
  }
}
