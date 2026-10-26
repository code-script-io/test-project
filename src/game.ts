import * as THREE from 'three';
import { AudioSystem } from './audio';
import { Enemy } from './ai';
import { difficulty, normalizeSettings, readSettings, SAVE_KEY, type Settings } from './config';
import { Input } from './input';
import { findPath, lineClear, moveCircle, overlaps, supportHeight, vaultClear, type Point } from './physics';
import { Rendering } from './rendering';
import { $, shell, UI, type Mode } from './ui';
import { World, type Interactable } from './world';
interface Save { version:1; health:number; ammo:number; reserve:number; battery:number; medkits:number; decoys:number; inventory:string[]; collected:string[]; notes:string[]; power:boolean; time:number; position:Point; yaw?:number; pitch?:number; flashlight?:boolean; crouched?:boolean; }
export class Game {
  settings=readSettings();rendering:Rendering;world:World;input:Input;audio=new AudioSystem();ui:UI;enemies:Enemy[]=[];
  mode:Mode='menu';player=new THREE.Vector3(0,0,8);yaw=0;pitch=0;health=100;stamina=100;battery=100;ammo=6;reserve=18;medkits=1;decoys=3;
  inventory=new Set<string>();collected=new Set<string>();notes=new Set<string>();power=false;time=0;hidden=false;crouched=false;flashlight=true;feet=0;velocityY=0;
  private last=performance.now();private elapsed=0;private stepTime=0;private shotCooldown=0;private reloadTime=0;private flashTime=0;private recoil=0;private invulnerability=0;private messageTime=0;private subtitleTime=0;private grace=12;private tutorialTime=24;private danger=0;private focused:Interactable|null=null;
  private vault:{start:THREE.Vector3;end:THREE.Vector3;t:number;height:number;startFeet:number}|null=null;private raycaster=new THREE.Raycaster();private checkpoints=0;private lookingDirection=new THREE.Vector3();private tmp=new THREE.Vector3();private uiTime=0;
  constructor(){
    shell();this.rendering=new Rendering(this.settings);this.world=new World(this.rendering.scene);
    this.ui=new UI(this.settings,a=>this.action(a),s=>this.applySettings(s));this.input=new Input(this.rendering.renderer.domElement,reason=>{if(reason==='toggle')this.togglePause();else this.pause();});
    document.body.classList.toggle('touch',this.input.touch);this.applySettings(this.settings);this.spawnEnemies();this.ui.show('menu');$('#loading').remove();
    window.addEventListener('beforeunload',()=>{if(this.mode==='playing'||this.mode==='paused')this.save();});
    window.addEventListener('keydown',e=>{if(e.code==='Enter'&&this.mode==='code')this.action('submit-code');if(e.code==='Tab'&&this.mode==='journal')this.resume();});
    if(new URLSearchParams(location.search).has('test'))this.exposeTestAPI();
    requestAnimationFrame(t=>this.frame(t));
  }
  applySettings(s:Settings){s=normalizeSettings(s);this.settings=s;if(this.ui)this.ui.settings=s;this.rendering.apply(s);this.input?.setTouchMode(s.touchControls);this.rendering.render();this.audio.setVolume(s.volume);document.body.classList.toggle('reduced-motion',s.reducedMotion);try{localStorage.setItem('ndz-settings',JSON.stringify(s));}catch{}}
  spawnEnemies(){this.enemies.forEach(e=>this.rendering.scene.remove(e.mesh));this.enemies=[new Enemy('warden',this.rendering.scene,this.world.boxes,[{x:11,z:-11},{x:0,z:-11},{x:0,z:1},{x:11,z:6},{x:0,z:8},{x:-10,z:4},{x:-10,z:-11},{x:0,z:-25},{x:25,z:-6}]),new Enemy('crawler',this.rendering.scene,this.world.boxes,[{x:-11,z:30},{x:-9,z:20},{x:9,z:32},{x:13,z:20}])];}
  action(action:string){
    if(action==='new'){this.newGame();return;}
    if(action==='continue'){this.load();return;}
    if(action==='resume'){this.resume();return;}
    if(action==='pause'){this.pause();return;}
    if(action==='settings'){this.ui.settingsReturn=this.mode==='menu'?'menu':'paused';this.show('settings');return;}
    if(action==='back-settings'){this.show(this.ui.settingsReturn);return;}
    if(action==='controls'){this.show('controls');return;}
    if(action==='journal'){if(this.mode!=='menu'){this.save();this.show('journal',this.journal());}return;}
    if(action==='menu'){if(['playing','paused','journal','settings'].includes(this.mode))this.save();this.show('menu');return;}
    if(action==='submit-code'&&this.mode==='code'){if(this.ui.verifyCode())this.win('radio');else{$('#code-error').textContent='ACCESS DENIED / Check the archive log.';this.audio.play('empty');}return;}
    if(action==='dismiss-tutorial'){$('#tutorial').style.display='none';this.tutorialTime=0;}
  }
  show(mode:Mode,extra=''){this.mode=mode;this.input?.clear();if(mode!=='playing'){if(document.pointerLockElement)document.exitPointerLock();this.audio.pause();}this.ui.show(mode,extra);}
  togglePause(){if(this.mode==='playing')this.pause();else if(['paused','journal','note','code'].includes(this.mode))this.resume();else if(this.mode==='settings')this.show(this.ui.settingsReturn);else if(this.mode==='controls')this.show('menu');}
  pause(){if(this.mode==='playing'){this.save();this.show('paused');}}
  resume(){this.input.clear();this.mode='playing';this.ui.show('playing');this.audio.start(this.settings.volume);this.input.lock();this.last=performance.now();}
  newGame(){this.health=100;this.stamina=100;this.battery=100;this.ammo=6;this.reserve=18;this.medkits=1;this.decoys=3;this.inventory.clear();this.collected.clear();this.notes.clear();this.power=false;this.world.setPower(false);this.time=0;this.checkpoints=0;this.resetPlayer();this.world.items.forEach(i=>{i.active=true;i.mesh.visible=!['obstacle'].includes(i.type)&&i.id!=='bed-hide';});this.spawnEnemies();this.tutorialTime=24;$('#tutorial').style.display='';this.resume();this.save();this.caption('[Rain against the windows. Somewhere, metal drags across a floor.]');}
  resetPlayer(){this.player.set(0,1.68,8);this.stamina=100;this.flashTime=0;this.stepTime=0;this.yaw=0;this.pitch=0;this.hidden=false;this.crouched=false;this.feet=0;this.velocityY=0;this.reloadTime=0;this.shotCooldown=0;this.vault=null;this.flashlight=true;this.grace=12;this.invulnerability=2;this.danger=0;this.recoil=0;}
  save(){
    if(this.health<=0||this.mode==='won')return;
    const s:Save={version:1,health:this.health,ammo:this.ammo,reserve:this.reserve,battery:this.battery,medkits:this.medkits,decoys:this.decoys,inventory:[...this.inventory],collected:[...this.collected],notes:[...this.notes],power:this.power,time:this.time,position:{x:this.player.x,z:this.player.z},yaw:this.yaw,pitch:this.pitch,flashlight:this.flashlight,crouched:this.crouched};
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch{this.toast('Checkpoint unavailable: browser storage is full or disabled.');}
  }
  load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);if(!raw){this.newGame();return;}const s=JSON.parse(raw) as Save;const retry=this.mode==='dead';
      if(s.version!==1||!Array.isArray(s.collected)||!Array.isArray(s.inventory)||!Array.isArray(s.notes))throw Error('Invalid save');
      const n=(v:number,max:number,fallback:number)=>Number.isFinite(v)?Math.min(max,Math.max(0,v)):fallback;
      this.health=Math.max(retry?60:1,n(s.health,100,100));this.ammo=n(s.ammo,6,6);this.reserve=n(s.reserve,180,18);this.battery=Math.max(retry?25:0,n(s.battery,100,100));this.medkits=n(s.medkits,20,1);this.decoys=n(s.decoys,20,3);this.time=n(s.time,86400,0);
      this.inventory=new Set(s.inventory.filter(i=>['fuse','key','valve'].includes(i)));this.collected=new Set(s.collected.filter(i=>this.world.items.some(w=>w.id===i)));this.notes=new Set(s.notes.filter(i=>this.world.items.some(w=>w.id===i&&w.type==='note')));this.power=!!s.power;this.world.setPower(this.power);this.resetPlayer();if(!retry){this.yaw=Number.isFinite(s.yaw)?s.yaw!:0;this.pitch=Number.isFinite(s.pitch)?THREE.MathUtils.clamp(s.pitch!,-1.4,1.4):0;this.crouched=!!s.crouched;this.flashlight=s.flashlight!==false&&this.battery>0;}
      // Death resumes in the safe foyer while retaining objective progress and supplies.
      if(this.mode!=='dead'&&s.position&&Number.isFinite(s.position.x)&&Number.isFinite(s.position.z)&&s.position.x>-18&&s.position.x<35&&s.position.z>-34&&s.position.z<42&&!this.world.boxes.some(b=>overlaps(s.position.x,s.position.z,.3,b))){this.player.x=s.position.x;this.player.z=s.position.z;}
      this.world.items.forEach(i=>{i.active=!this.collected.has(i.id);i.mesh.visible=i.active&&i.type!=='obstacle'&&i.id!=='bed-hide';});this.spawnEnemies();this.tutorialTime=0;$('#tutorial').style.display='none';this.resume();this.toast('Checkpoint restored. The hunt begins again.');
    }catch{this.newGame();this.toast('Checkpoint could not be read. A new night has begun.');}
  }
  toast(message:string){this.ui.toast(message);this.messageTime=4;}
  caption(message:string){this.ui.subtitle(message);this.subtitleTime=4;}
  objective(){
    if(!this.power&&!this.inventory.has('fuse'))return {text:'Find the ceramic fuse',hint:'WEST WING · ARCHIVE',point:new THREE.Vector3(-11,1,-12)};
    if(!this.power)return {text:'Restore the lab generator',hint:'EAST WING · LABORATORY',point:new THREE.Vector3(25,1.4,-16)};
    if(this.inventory.has('valve'))return {text:'Open the drainage hatch',hint:'NORTH TUNNEL · WEST BRANCH',point:new THREE.Vector3(-11,.9,-31)};
    if(this.inventory.has('key'))return {text:'Unlock the perimeter gate',hint:'SOUTH · FOREST PATH',point:new THREE.Vector3(0,1.2,40)};
    if(this.notes.has('archive-note'))return {text:'Transmit the evacuation code',hint:'NORTH TUNNEL · EAST BRANCH',point:new THREE.Vector3(10,1.4,-31)};
    return {text:'Choose an escape route',hint:'[TAB] JOURNAL · THREE WAYS OUT',point:new THREE.Vector3(11,1.2,26)};
  }
  journal(){const check=(done:boolean,text:string)=>`<span class="${done?'done':'pending'}">${done?'✓':'○'} ${text}</span>`;return `<div class="routes"><div class="route"><span class="number">01 / SOUTH</span><h3>The perimeter</h3><p>${check(this.power,'Generator online')}<br>${check(this.inventory.has('key'),'Brass key · greenhouse')}<br>→ Forest gate</p></div><div class="route"><span class="number">02 / NORTH WEST</span><h3>The drainage</h3><p>${check(this.power,'Generator online')}<br>${check(this.inventory.has('valve'),'Valve · laboratory')}<br>→ Tunnel hatch</p></div><div class="route"><span class="number">03 / NORTH EAST</span><h3>The signal</h3><p>${check(this.power,'Generator online')}<br>${check(this.notes.has('archive-note'),'Code · archive access log')}<br>→ Tunnel radio</p></div></div><div class="journal-notes">${this.notes.size?[...this.notes].map(id=>this.world.items.find(i=>i.id===id)!.description.replaceAll('\n','<br>')).join('<br><br>'):'No notes recovered. Search the west archive. The hall runs north to the tunnels and south to the forest.'}</div><p class="muted">Ammunition is scarce. Shots stagger creatures; enough hits put them down for 22 seconds. Crouch for quiet movement. E hides in lockers or beneath the bedroom bed. Space vaults the forest barricades. Autosaves preserve supplies and progress; after death, you return to the foyer.</p>`;}
  interact(){
    if(this.hidden){this.hidden=false;this.toast('You leave your hiding place.');return;}
    const i=this.focused;if(!i)return;
    const collect=()=>{this.collected.add(i.id);i.active=false;i.mesh.visible=false;this.audio.play('pickup');this.checkpoints++;};
    if(['fuse','key','valve'].includes(i.type)){this.inventory.add(i.type);collect();this.toast(`${i.name} collected. [TAB] View routes.`);if(i.type==='key'){this.noise(this.player,32);this.grace=0;this.caption('[A scream cuts through the trees. Get to the perimeter gate.]');}}
    else if(i.type==='ammo'){this.reserve+=12;collect();this.toast('+12 pistol rounds');}
    else if(i.type==='medkit'){this.medkits++;collect();this.toast('Medical kit collected. Press H to heal.');}
    else if(i.type==='battery'){this.battery=Math.min(100,this.battery+50);collect();this.toast('Flashlight battery restored +50%');}
    else if(i.type==='note'){this.notes.add(i.id);collect();this.save();this.show('note',i.description);return;}
    else if(i.type==='power'){
      if(this.power){this.toast('Power is already restored. Choose your escape route.');return;}
      if(!this.inventory.has('fuse')){this.toast('Missing ceramic fuse. Search the west archive.');return;}
      this.power=true;this.world.setPower(true);this.inventory.delete('fuse');this.audio.play('switch');this.toast('POWER RESTORED · All three escape systems are online.');this.caption('[The generator thunders to life. Something answers in the hall.]');this.noise(this.player,36);this.grace=0;
    }else if(i.type==='gate'){
      if(this.power&&this.inventory.has('key')){this.win('gate');return;}this.toast(`Gate locked. ${!this.power?'Restore the lab generator. ':''}${!this.inventory.has('key')?'Find the brass key in the greenhouse.':''}`);
    }else if(i.type==='sewer'){
      if(this.power&&this.inventory.has('valve')){this.win('sewer');return;}this.toast(`Hatch sealed. ${!this.power?'Restore the lab generator. ':''}${!this.inventory.has('valve')?'Find the valve in the lab.':''}`);
    }else if(i.type==='radio'){
      if(!this.power){this.toast('No signal. Restore power in the lab first.');return;}this.show('code');return;
    }else if(i.type==='locker'){
      const seen=this.enemies.some(e=>(e.state==='chase'||e.state==='attack')&&lineClear(e.position,this.player,this.world.boxes)&&e.position.distanceTo(this.player)<16);
      if(seen){this.toast('It can see you. Break line of sight before hiding.');return;}
      this.hidden=true;this.audio.play('switch');this.caption('[You hold your breath.]');
    }else if(i.type==='obstacle'){this.tryJump();return;}
    this.save();
  }
  noise(point:Point,volume:number){this.enemies.forEach(e=>e.hear(point,volume,this.settings.difficulty));}
  tryJump(){
    if(this.hidden||this.vault||this.velocityY!==0||Math.abs(this.feet-supportHeight(this.player,this.feet,this.world.boxes))>.06)return;
    const facing=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const b=this.world.boxes.find(b=>b.h>Math.max(.3,this.feet+.1)&&b.h<=1.2&&Math.hypot(b.x-this.player.x,b.z-this.player.z)<2.4&&facing.x*(b.x-this.player.x)+facing.z*(b.z-this.player.z)>.3);
    if(b){const end=this.player.clone().addScaledVector(facing,3.3);if(vaultClear(this.player,end,b,this.world.boxes)&&!this.world.boxes.some(box=>overlaps(end.x,end.z,.3,box))){this.vault={start:this.player.clone(),end,t:0,height:b.h+.3,startFeet:this.feet};this.stamina=Math.max(0,this.stamina-15);this.noise(this.player,7);return;}}
    this.velocityY=5.6;this.noise(this.player,4);
  }
  shoot(){
    if(this.hidden||this.shotCooldown>0||this.reloadTime>0)return;
    this.shotCooldown=.34;if(this.ammo<=0){this.audio.play('empty');this.toast('Empty magazine. Press R to reload.');return;}
    this.ammo--;this.audio.play('shot');this.flashTime=.075;this.recoil=.09;this.noise(this.player,42);this.caption('[A gunshot echoes through Blackthorn.]');
    this.syncCamera();this.rendering.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new THREE.Vector2(0,0),this.rendering.camera);
    const walls=this.raycaster.intersectObjects(this.world.solidMeshes,false);const wallDistance=walls[0]?.distance??Infinity;
    let hitEnemy:Enemy|null=null,min=wallDistance;for(const enemy of this.enemies){if(enemy.state==='down')continue;const hits=this.raycaster.intersectObject(enemy.mesh,true);if(hits[0]&&hits[0].distance<min){min=hits[0].distance;hitEnemy=enemy;}}
    if(hitEnemy){const down=hitEnemy.damage(38);$('#hit-marker').style.opacity='1';this.toast(down?'Creature down. It will recover. Run.':'Hit · staggered');this.audio.play('hit');}
  }
  reload(){if(this.reloadTime>0||this.ammo===6)return;if(this.reserve<=0){this.toast('No spare ammunition.');return;}this.reloadTime=1.6;this.audio.play('reload');this.caption('[Magazine clicks into place.]');}
  damage(amount:number){if(this.invulnerability>0||this.mode!=='playing')return;this.health=Math.max(0,this.health-amount);this.invulnerability=.85;this.audio.play('hit');$('#damage-flash').style.opacity=this.settings.reducedScares?'.35':'.7';this.caption('[Pain. It is too close. Get away!]');if(this.health<=0){this.show('dead');}}
  win(route:'gate'|'sewer'|'radio'){
    const text={gate:'The gate gives way. You run until the lights of Blackthorn disappear behind the trees.',sewer:'The hatch opens into cold water. You follow the current until the air smells like morning.',radio:'A voice answers the static. “Stay on this frequency. We see your signal.” For the first time tonight, you are not alone.'};
    const mins=Math.floor(this.time/60),seconds=Math.floor(this.time%60).toString().padStart(2,'0');
    try{localStorage.removeItem(SAVE_KEY);const endings=JSON.parse(localStorage.getItem('ndz-endings')||'[]') as string[];localStorage.setItem('ndz-endings',JSON.stringify([...new Set([...endings,route])]));}catch{}
    this.show('won',`${text[route]}<br><br><span class="eyebrow">${route.toUpperCase()} ENDING · ${mins}:${seconds} · ${this.settings.difficulty.toUpperCase()}</span>`);this.audio.start(this.settings.volume);this.audio.play('win');
  }
  update(dt:number){
    this.time+=dt;this.grace-=dt;this.invulnerability=Math.max(0,this.invulnerability-dt);this.shotCooldown=Math.max(0,this.shotCooldown-dt);this.flashTime=Math.max(0,this.flashTime-dt);this.recoil=Math.max(0,this.recoil-dt*.5);
    this.messageTime-=dt;this.subtitleTime-=dt;if(this.messageTime<0)$('#toast').classList.remove('visible');if(this.subtitleTime<0)$('#subtitle').classList.remove('visible');
    if(this.tutorialTime>0){this.tutorialTime-=dt;if(this.tutorialTime<=0)$('#tutorial').style.display='none';}
    if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0){const rounds=Math.min(6-this.ammo,this.reserve);this.ammo+=rounds;this.reserve-=rounds;}}
    this.yaw-=this.input.dx*.0022*this.settings.sensitivity;this.pitch=THREE.MathUtils.clamp(this.pitch-this.input.dy*.0022*this.settings.sensitivity,-1.4,1.4);
    if(this.input.take('KeyC')||this.input.take('ControlLeft'))this.crouched=!this.crouched;
    if(this.input.take('KeyF')){this.flashlight=!this.flashlight;this.audio.play('switch');}
    if(this.input.take('Space'))this.tryJump();
    if(this.input.take('KeyR'))this.reload();
    if(this.input.take('KeyH')){if(this.medkits>0&&this.health<100){this.medkits--;this.health=Math.min(100,this.health+45);this.audio.play('pickup');this.toast('Medical kit used · +45 health');}else this.toast(this.health===100?'You are already at full health.':'No medical kits remaining.');}
    if(this.input.take('KeyQ')){if(this.decoys>0){this.decoys--;const p={x:this.player.x-Math.sin(this.yaw)*8,z:this.player.z-Math.cos(this.yaw)*8};this.noise(p,25);this.audio.play('decoy');this.caption('[Glass shatters in the distance.]');this.toast('Decoy thrown. Move away quietly.');}else this.toast('No decoys left.');}
    if(this.input.take('Tab')){this.action('journal');return;}
    if(this.input.take('KeyE')){this.syncCamera();this.updateFocus();this.interact();if(this.mode!=='playing')return;}
    if(this.input.take('Fire')||this.input.fire)this.shoot();
    const forward=(this.input.down('KeyW','ArrowUp')?1:0)-(this.input.down('KeyS','ArrowDown')?1:0)+this.input.move.y;
    const strafe=(this.input.down('KeyD','ArrowRight')?1:0)-(this.input.down('KeyA','ArrowLeft')?1:0)+this.input.move.x;
    const len=Math.hypot(forward,strafe),moving=len>.05&&!this.hidden;
    const running=this.input.down('ShiftLeft','ShiftRight')&&!this.crouched&&this.stamina>2&&moving;
    if(running)this.stamina=Math.max(0,this.stamina-dt*22);else this.stamina=Math.min(100,this.stamina+dt*16);
    const speed=this.hidden?0:this.crouched?1.45:running?5:2.7;
    if(this.vault){this.vault.t+=dt/ .5;const t=Math.min(1,this.vault.t);this.player.lerpVectors(this.vault.start,this.vault.end,t);this.feet=this.vault.startFeet*(1-t)+Math.sin(t*Math.PI)*this.vault.height;if(t>=1){this.vault=null;this.feet=0;}}
    else {
      if(moving){const div=Math.max(1,len);const dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*strafe)/div*speed*dt,dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*strafe)/div*speed*dt;const p=moveCircle(this.player,dx,dz,.3,this.feet,this.world.boxes);this.player.x=p.x;this.player.z=p.z;this.stepTime+=dt;
        if(this.stepTime>(running?.31:this.crouched?.7:.48)){this.stepTime=0;this.audio.play('step',this.crouched?.25:running?1:.6);this.noise(this.player,this.crouched?1.2:running?16:5);}
      }
      const previous=this.feet;this.velocityY-=dt*16;this.feet+=this.velocityY*dt;let ground=0;
      for(const b of this.world.boxes)if(b.h<=previous+.08&&overlaps(this.player.x,this.player.z,.27,b))ground=Math.max(ground,b.h);
      if(this.feet<=ground){this.feet=ground;this.velocityY=0;}
    }
    if(this.flashlight&&!this.hidden){this.battery=Math.max(0,this.battery-dt*difficulty[this.settings.difficulty].battery);if(this.battery===0)this.flashlight=false;}
    const r=this.rendering, bob=this.settings.reducedMotion||!moving?0:Math.sin(this.time*(running?13:9))*(running?.042:.022);
    const targetHeight=this.crouched?1.05:1.68;this.player.y=THREE.MathUtils.damp(this.player.y,targetHeight,12,dt);
    r.camera.position.set(this.player.x,this.player.y+this.feet+bob,this.player.z);r.camera.rotation.set(this.pitch+(this.settings.reducedMotion?0:this.recoil),this.yaw,0);
    r.camera.fov=THREE.MathUtils.damp(r.camera.fov,this.input.aim?52:72,10,dt);r.camera.updateProjectionMatrix();r.flashlight.visible=this.flashlight&&this.battery>0&&!this.hidden;
    r.flashlight.intensity=55*(this.battery<12?.7+Math.sin(this.time*28)*.25:1);r.muzzle.intensity=this.flashTime>0?8:0;
    r.gun.visible=!this.hidden;r.gun.position.lerp(new THREE.Vector3(this.input.aim?.0:.26,this.input.aim?-.18:-.27,-.47+(this.recoil*.8)),.18);r.gun.rotation.x=this.reloadTime>0?-.6:0;r.gun.rotation.z=this.reloadTime>0?-.35:0;
    if(this.grace<=0)this.enemies.forEach(e=>e.update(dt,this.time,{x:this.player.x,z:this.player.z,hidden:this.hidden,crouched:this.crouched,flashlight:this.flashlight},this.settings.difficulty,n=>this.damage(n),()=>{this.audio.play('growl');this.caption(e.kind==='warden'?'[The Warden inhales sharply. It has seen you.]':'[A low chitter from the trees. Something is rushing you.]');}));
    this.danger=this.enemies.some(e=>e.state==='chase'||e.state==='attack')?1:Math.max(0,this.danger-dt*.3);
    this.updateFocus();this.uiTime+=dt;if(this.uiTime>.07){this.updateHUD();this.uiTime=0;}
    $('#damage-flash').style.opacity=String(Math.max(0,Number($('#damage-flash').style.opacity||0)-dt));$('#hit-marker').style.opacity=String(Math.max(0,Number($('#hit-marker').style.opacity||0)-dt*3));
  }
  syncCamera(){const c=this.rendering.camera;c.position.set(this.player.x,this.player.y+this.feet,this.player.z);c.rotation.set(this.pitch,this.yaw,0);c.updateMatrixWorld(true);}
  updateFocus(){
    this.focused=null;let nearest=2.7;this.rendering.camera.getWorldDirection(this.lookingDirection);
    if(this.hidden){this.ui.prompt('Leave hiding place','Listen before you step out.',true);return;}
    for(const i of this.world.items){if(!i.active)continue;const dist=Math.hypot(i.position.x-this.player.x,i.position.z-this.player.z);this.tmp.copy(i.position).sub(this.rendering.camera.position).normalize();if(dist<nearest&&this.tmp.dot(this.lookingDirection)>.38&&lineClear(this.player,i.position,this.world.boxes.filter(b=>b.tag!==i.id),1.6)){this.focused=i;nearest=dist;}}
    const i=this.focused;this.ui.prompt(i?.name??'',i?.type==='obstacle'?'Press SPACE to vault':i?.description.split('\n')[0]??'',!!i);
  }
  updateHUD(){
    $('#health-label').textContent=String(Math.ceil(this.health));$('#health-bar').style.width=`${this.health}%`;$('#stamina-bar').style.width=`${this.stamina}%`;$('#battery-label').textContent=`▰ ${Math.ceil(this.battery)}% ${this.flashlight?'':'OFF'}`;
    $('#ammo-label').innerHTML=`${this.ammo} <em>/ ${this.reserve}</em>`;$('#medkit-label').textContent=String(this.medkits);$('#decoy-label').textContent=String(this.decoys);$('#weapon-status').textContent=this.reloadTime>0?'RELOADING':this.ammo===0?'EMPTY':'READY';
    $('#inventory-label').textContent=[...(this.power?['POWER ON']:[]),...this.inventory].map(s=>s.toUpperCase()).join(' / ')||'NO KEY ITEMS';
    $('#zone').textContent=this.player.z>14?'SOUTH / BLACKTHORN FOREST':this.player.z<-18?'NORTH / DRAINAGE TUNNELS':this.player.x>16?'EAST / ABANDONED LAB':'BLACKTHORN ESTATE';
    const angle=((this.yaw*180/Math.PI)%360+360)%360;const dir=['N','NW','W','SW','S','SE','E','NE'][Math.round(angle/45)%8];$('#compass').textContent=`${dir} · ${Math.round((360-angle)%360)}°`;
    $('#threat').style.opacity=String(this.danger);$('#hidden-status').style.display=this.hidden?'block':'none';$('#crosshair').classList.toggle('aim',this.input.aim);
    $('#pointer-hint').style.display=!document.pointerLockElement&&!this.input.touch?'block':'none';
    const obj=this.objective();$('#objective-text').textContent=obj.text;$('#objective-hint').textContent=obj.hint;
    const proj=obj.point.clone().project(this.rendering.camera),delta=obj.point.clone().sub(this.rendering.camera.position),front=delta.dot(this.rendering.camera.getWorldDirection(this.tmp))>0;
    const mark=$('#waypoint');mark.style.display=front&&Math.abs(proj.x)<.9&&Math.abs(proj.y)<.8&&!this.hidden?'block':'none';mark.style.left=`${(proj.x*.5+.5)*100}%`;mark.style.top=`${(-proj.y*.5+.5)*100}%`;
    $('#waypoint small').textContent=`${Math.round(Math.hypot(delta.x,delta.z))} m`;
  }
  frame(now:number){
    const dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.elapsed+=dt;
    if(this.mode==='playing')this.update(dt);
    if(this.mode==='menu'||this.mode==='controls'){
      const c=this.rendering.camera;c.position.set(2+Math.sin(this.elapsed*.045)*1.5,2.8,34);c.lookAt(-2,2.9,8);this.rendering.gun.visible=false;this.rendering.flashlight.visible=false;
    }
    this.rendering.updateEnvironment(dt);
    if(this.mode==='playing'||this.mode==='menu')this.world.update(dt,this.elapsed,this.settings.quality,this.rendering.camera.position);
    if(['playing','menu','controls'].includes(this.mode))this.rendering.render();this.input.end();requestAnimationFrame(t=>this.frame(t));
  }
  exposeTestAPI(){
    const game=this;
    (window as unknown as {__game:unknown}).__game={
      get state(){return {mode:game.mode,health:game.health,ammo:game.ammo,reserve:game.reserve,power:game.power,inventory:[...game.inventory],position:{x:game.player.x,z:game.player.z},enemies:game.enemies.map(e=>({state:e.state,x:e.position.x,z:e.position.z,health:e.health})),items:game.world.items.map(i=>({id:i.id,active:i.active})),hidden:game.hidden,feet:game.feet,crouched:game.crouched,yaw:game.yaw,flashlight:game.flashlight,settings:game.settings,battery:game.battery,audioState:game.audio.ctx?.state};},
      teleport(x:number,z:number,yaw=0){game.vault=null;game.feet=0;game.velocityY=0;game.hidden=false;game.player.set(x,1.68,z);game.yaw=yaw;game.pitch=0;game.grace=60;game.update(.016);},
      face(x:number,z:number,y=1){game.yaw=Math.atan2(game.player.x-x,game.player.z-z);const d=Math.hypot(x-game.player.x,z-game.player.z);game.pitch=Math.atan2(y-1.68,d);game.update(.016);},
      interact(id:string){game.focused=game.world.items.find(i=>i.id===id)??null;game.interact();},
      noise(x:number,z:number,volume:number){game.noise({x,z},volume);},
      enemy(index:number,x:number,z:number){const e=game.enemies[index];e.position.set(x,0,z);e.mesh.position.copy(e.position);e.mesh.updateMatrixWorld(true);game.grace=0;},
      advance(seconds:number){for(let t=0;t<seconds&&game.mode==='playing';t+=.05){game.update(.05);game.input.end();}game.syncCamera();game.enemies.forEach(e=>e.mesh.updateMatrixWorld(true));},
      damage(n:number){game.invulnerability=0;game.damage(n);},
      shoot(){game.shotCooldown=0;game.shoot();},
      key(code:string,down:boolean){if(down){game.input.keys.add(code);game.input.pressed.add(code);}else game.input.keys.delete(code);},
      standOn(x:number,z:number,height:number){game.player.set(x,1.68,z);game.feet=height;game.velocityY=0;game.vault=null;game.grace=60;game.syncCamera();},
      look(yaw:number,pitch=0){game.yaw=yaw;game.pitch=pitch;},
      setHealth(n:number){game.health=n;},
      clearGrace(){game.grace=0;},
      pathTo(x:number,z:number){return findPath(game.player,{x,z},game.world.boxes);},
      get renderer(){return {calls:game.rendering.renderer.info.render.calls,triangles:game.rendering.renderer.info.render.triangles};}
    };
  }
}
