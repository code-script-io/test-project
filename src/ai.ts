import * as THREE from 'three';
import { findPath, lineClear, moveCircle, type Box, type Point } from './physics';
import type { Difficulty } from './config';
import { difficulty } from './config';
export type EnemyState='patrol'|'investigate'|'search'|'chase'|'attack'|'stunned'|'down';
export interface Target extends Point { hidden:boolean; crouched:boolean; flashlight:boolean; }
export class Enemy {
  mesh=new THREE.Group();position:THREE.Vector3;state:EnemyState='patrol';health=100;lastKnown:Point;path:Point[]=[];private repath=0;private timer=0;private attackCooldown=0;private lost=0;private patrolIndex=0;private gait=0;private limbs:THREE.Mesh[]=[];private tell=0;
  constructor(public kind:'warden'|'crawler',scene:THREE.Scene,public boxes:Box[],public patrol:Point[]){
    this.position=new THREE.Vector3(patrol[0].x,0,patrol[0].z);this.lastKnown={...patrol[0]};this.health=kind==='warden'?140:70;
    const skin=new THREE.MeshStandardMaterial({color:kind==='warden'?0x666c58:0x504f41,roughness:.96}),cloth=new THREE.MeshStandardMaterial({color:0x1d2a26,roughness:.9});
    const torso=new THREE.Mesh(new THREE.ConeGeometry(.36,1.15,6),cloth);torso.position.y=1.15;this.mesh.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.23,10,8),skin);head.position.y=1.96;head.scale.set(.8,1.35,.85);this.mesh.add(head);
    for(const x of [-.085,.085]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.027,6,6),new THREE.MeshBasicMaterial({color:kind==='warden'?0xe3ac78:0xaad3a2}));eye.position.set(x,2.0,-.19);this.mesh.add(eye);}
    for(const x of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(.13,.95,.15),skin);arm.position.set(x*.43,1.13,0);arm.rotation.z=x*.1;this.mesh.add(arm);this.limbs.push(arm);const leg=new THREE.Mesh(new THREE.BoxGeometry(.17,.75,.2),cloth);leg.position.set(x*.18,.4,0);this.mesh.add(leg);this.limbs.push(leg);}
    if(kind==='crawler'){this.mesh.scale.set(1.3,.55,1.3);this.mesh.rotation.x=-.15;}
    this.mesh.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});this.mesh.position.copy(this.position);scene.add(this.mesh);
  }
  hear(point:Point,loudness:number,diff:Difficulty){if(this.state==='down'||this.state==='stunned'||this.state==='chase'||this.state==='attack')return;const dist=Math.hypot(this.position.x-point.x,this.position.z-point.z),occluded=!lineClear(this.position,point,this.boxes);const range=loudness*difficulty[diff].hearing*(this.kind==='crawler'?.45:1)*(occluded?.65:1);if(dist<range){this.lastKnown={...point};this.state='investigate';this.timer=7;this.repath=0;}}
  damage(amount:number){if(this.state==='down')return false;this.health-=amount;this.state=this.health<=0?'down':'stunned';this.timer=this.health<=0?22:1.1;this.path=[];return this.health<=0;}
  update(dt:number,t:number,target:Target,diff:Difficulty,damage:(n:number)=>void,alert:()=>void){
    this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.tell=Math.max(0,this.tell-dt);
    if(this.state==='down'){this.timer-=dt;this.mesh.rotation.z=1.4;this.mesh.position.y=.15;if(this.timer<=0){this.health=this.kind==='warden'?140:70;this.state='search';this.timer=5;this.mesh.rotation.z=0;}return;}
    if(this.state==='stunned'){this.timer-=dt;this.mesh.rotation.z=Math.sin(t*24)*.07;if(this.timer<=0){this.state='investigate';this.timer=7;this.repath=0;}return;}
    this.mesh.rotation.z=0;
    const distance=this.position.distanceTo(new THREE.Vector3(target.x,0,target.z));
    const sight=(target.crouched?8:14)+(target.flashlight?3:0),dx=target.x-this.position.x,dz=target.z-this.position.z;
    const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),this.mesh.rotation.y),dot=(forward.x*dx+forward.z*dz)/Math.max(.01,distance);
    const sees=!target.hidden&&distance<sight&&lineClear(this.position,target,this.boxes,target.crouched?.8:1.4)&&(dot>-.05||distance<3.3||this.state==='chase'||this.state==='attack');
    if(sees){if(this.state!=='chase'&&this.state!=='attack'){this.tell=.8;alert();}this.lastKnown={x:target.x,z:target.z};this.lost=0;this.state=distance<1.65?'attack':'chase';}
    else if(this.state==='chase'||this.state==='attack'){this.lost+=dt;if(this.lost>3){this.state='search';this.timer=8;this.repath=0;}}
    if(this.state==='attack'){
      if(sees&&distance<1.85&&this.attackCooldown<=0&&this.tell<=0){damage(difficulty[diff].damage*(this.kind==='crawler'?.65:1));this.attackCooldown=1.5;}
      if(!sees||distance>1.8)this.state='chase';
    }
    this.timer-=dt;this.repath-=dt;
    let destination:Point=this.lastKnown;
    if(this.state==='patrol'){
      destination=this.patrol[this.patrolIndex];if(Math.hypot(destination.x-this.position.x,destination.z-this.position.z)<1){this.patrolIndex=(this.patrolIndex+1)%this.patrol.length;destination=this.patrol[this.patrolIndex];this.repath=0;}
    }else if((this.state==='search'||this.state==='investigate')&&this.timer<=0){this.state='patrol';this.repath=0;}
    if(this.repath<=0){this.path=findPath(this.position,destination,this.boxes);this.repath=this.state==='chase'?.65:1.6;}
    let next=this.path[0];if(next&&Math.hypot(next.x-this.position.x,next.z-this.position.z)<.18){this.path.shift();next=this.path[0];}
    const moving=next&&this.tell<=0&&this.state!=='attack';
    if(moving){const delta=new THREE.Vector2(next.x-this.position.x,next.z-this.position.z).normalize();const speed=difficulty[diff].speed*(this.kind==='crawler'?1.4:1)*(this.state==='chase'?1:this.state==='patrol'?.43:.66);
      const p=moveCircle(this.position,delta.x*speed*dt,delta.y*speed*dt,.32,0,this.boxes);this.position.x=p.x;this.position.z=p.z;this.mesh.rotation.y=Math.atan2(-delta.x,-delta.y);this.gait+=dt*speed*4;
    }
    this.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(this.gait+i%2*Math.PI+(i>1?Math.PI:0))*(moving?.3:.02));
    this.mesh.position.copy(this.position);this.mesh.position.y=Math.sin(t*1.8)*.015;
  }
}
