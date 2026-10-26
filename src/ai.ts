import * as THREE from 'three';
import { findPath, lineClear, moveCircle, overlaps, type Box, type Point } from './physics';
import type { Difficulty } from './config';
import { difficulty } from './config';

export type EnemyState='patrol'|'investigate'|'search'|'chase'|'attack'|'stunned'|'down';
export interface Target extends Point { hidden:boolean; crouched:boolean; flashlight:boolean; }

/** A visible, audible hunter: memories and navigation never reveal a hidden player's location. */
export class Enemy {
  mesh=new THREE.Group();
  position:THREE.Vector3;
  state:EnemyState='patrol';
  health=100;
  lastKnown:Point;
  path:Point[]=[];
  /** Root audio code can emit a positional footfall only when this counter changes. */
  stepCount=0;
  movementSpeed=0;
  private repath=0;
  private timer=0;
  private attackCooldown=0;
  private lost=0;
  private patrolIndex=0;
  private gait=0;
  private limbs:THREE.Group[]=[];
  private head=new THREE.Group();
  private tell=0;
  private attackPose=0;
  private stride=0;
  private arrival=false;
  private unreachable=0;
  private searchPoints:Point[]=[];
  private searchIndex=0;
  private linger=0;

  constructor(public kind:'warden'|'crawler',scene:THREE.Scene,public boxes:Box[],public patrol:Point[]){
    if(!patrol.length)throw new Error('An enemy requires at least one patrol point.');
    this.position=new THREE.Vector3(patrol[0].x,0,patrol[0].z);
    this.lastKnown={...patrol[0]};
    this.health=kind==='warden'?140:70;
    this.buildModel();
    this.mesh.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    this.mesh.position.copy(this.position);scene.add(this.mesh);
  }

  private buildModel(){
    const skin=new THREE.MeshStandardMaterial({color:this.kind==='warden'?0x82907b:0x697567,roughness:.94});
    const cloth=new THREE.MeshStandardMaterial({color:0x293c36,roughness:.94});
    const bone=new THREE.MeshStandardMaterial({color:0xa4aa8d,roughness:.8});
    const metal=new THREE.MeshStandardMaterial({color:0x41443b,roughness:.7,metalness:.5});
    const eye=new THREE.MeshBasicMaterial({color:this.kind==='warden'?0xecc78a:0xbedbb0});
    const sphere=(r:number,x:number,y:number,z:number,mat:THREE.Material,parent:THREE.Object3D=this.mesh)=>{
      const m=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),mat);m.position.set(x,y,z);parent.add(m);return m;
    };
    const segment=(a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material,parent:THREE.Object3D)=>{
      const delta=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.7,r,delta.length(),6),mat);
      m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(m);return m;
    };
    const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
    if(this.kind==='warden'){
      const coat=new THREE.Mesh(new THREE.CylinderGeometry(.27,.43,1.15,8),cloth);coat.position.y=1.12;this.mesh.add(coat);
      const shoulders=new THREE.Mesh(new THREE.BoxGeometry(.63,.26,.29),cloth);shoulders.position.y=1.57;this.mesh.add(shoulders);
      // Uneven torn hems and an exposed button line give the silhouette a readable identity.
      for(let i=0;i<5;i++){const hem=new THREE.Mesh(new THREE.ConeGeometry(.09,.32,3),cloth);hem.position.set((i-2)*.15,.48,-.1+(i%2)*.15);hem.rotation.z=Math.PI;this.mesh.add(hem);}
      for(let i=0;i<4;i++)sphere(.018,-.06,1.5-i*.18,-.29,metal);
      segment(v(0,1.65,0),v(0,1.88,-.03),.065,skin,this.mesh);
      this.head.position.set(0,1.98,-.04);this.mesh.add(this.head);
      const skull=sphere(.215,0,0,0,skin,this.head);skull.scale.set(.78,1.35,.9);
      const mask=new THREE.Mesh(new THREE.BoxGeometry(.28,.21,.06),bone);mask.position.set(0,.015,-.18);mask.rotation.z=.07;this.head.add(mask);
      for(const x of [-.073,.073])sphere(.026,x,.045,-.221,eye,this.head);
      // A stitched central seam and three hanging tendons are original procedural details.
      for(let i=0;i<4;i++){const stitch=new THREE.Mesh(new THREE.BoxGeometry(.035,.009,.015),metal);stitch.position.set(0,.13-i*.06,-.218);stitch.rotation.z=i%2?.3:-.3;this.head.add(stitch);}
      for(const x of [-.13,0,.13])segment(v(x,-.19,-.01),v(x*.7,-.39,.04),.018,skin,this.head);
      for(const side of [-1,1]){
        const arm=new THREE.Group();arm.position.set(side*.37,1.6,0);this.mesh.add(arm);this.limbs.push(arm);
        segment(v(0,0,0),v(side*.06,-.43,.035),.09,cloth,arm);
        sphere(.065,side*.06,-.43,.035,skin,arm);
        segment(v(side*.06,-.43,.035),v(side*.09,-.93,-.08),.055,skin,arm);
        for(let i=0;i<3;i++)segment(v(side*.09+(i-1)*.035,-.93,-.08),v(side*.1+(i-1)*.04,-1.1,-.12),.013,bone,arm);
        const leg=new THREE.Group();leg.position.set(side*.16,.58,0);this.mesh.add(leg);this.limbs.push(leg);
        segment(v(0,0,0),v(0,-.42,0),.085,cloth,leg);
        const boot=new THREE.Mesh(new THREE.BoxGeometry(.18,.16,.29),metal);boot.position.set(0,-.47,-.065);leg.add(boot);
      }
      const cage=new THREE.Mesh(new THREE.BoxGeometry(.16,.21,.14),metal);cage.position.set(.19,1.21,-.31);this.mesh.add(cage);
      const ember=new THREE.Mesh(new THREE.BoxGeometry(.085,.12,.15),new THREE.MeshBasicMaterial({color:0xaf9665}));ember.position.copy(cage.position);this.mesh.add(ember);
    }else{
      const thorax=sphere(.32,0,.54,.02,skin);thorax.scale.set(1,.68,1.5);
      const abdomen=sphere(.28,0,.48,.38,cloth);abdomen.scale.set(.9,.8,1.3);
      this.head.position.set(0,.59,-.48);this.mesh.add(this.head);
      const skull=sphere(.22,0,0,0,skin,this.head);skull.scale.set(1,.7,1.25);
      for(const x of [-.085,.085])sphere(.027,x,.035,-.225,eye,this.head);
      for(let i=0;i<5;i++){
        const rib=new THREE.Mesh(new THREE.TorusGeometry(.26,.017,4,8,Math.PI),bone);rib.rotation.z=Math.PI/2;rib.rotation.y=Math.PI/2;rib.position.set(0,.53,-.12+i*.12);this.mesh.add(rib);
        segment(v(0,.72,-.1+i*.12),v((i%2?1:-1)*.06,.91,-.04+i*.12),.022,bone,this.mesh);
      }
      for(const side of [-1,1])for(const front of [-1,1]){
        const limb=new THREE.Group();limb.position.set(side*.24,.52,front*.24);this.mesh.add(limb);this.limbs.push(limb);
        segment(v(0,0,0),v(side*.28,-.1,front*.12),.055,skin,limb);
        sphere(.06,side*.28,-.1,front*.12,bone,limb);
        segment(v(side*.28,-.1,front*.12),v(side*.4,-.45,-.1),.035,skin,limb);
        segment(v(side*.4,-.45,-.1),v(side*.43,-.46,-.24),.02,bone,limb);
      }
    }
  }

  hear(point:Point,loudness:number,diff:Difficulty){
    if(['down','stunned','chase','attack'].includes(this.state))return;
    const distance=Math.hypot(this.position.x-point.x,this.position.z-point.z);
    const occluded=!lineClear(this.position,point,this.boxes);
    const range=loudness*difficulty[diff].hearing*(this.kind==='crawler'?.45:1)*(occluded?.65:1);
    if(distance<range){
      this.lastKnown={x:point.x,z:point.z};this.state='investigate';this.timer=.9;
      this.arrival=false;this.unreachable=0;this.repath=0;this.searchPoints=[];
    }
  }

  damage(amount:number){
    if(this.state==='down')return false;
    this.health-=amount;this.state=this.health<=0?'down':'stunned';this.timer=this.health<=0?22:1.1;
    this.path=[];this.movementSpeed=0;if(this.health<=0)this.head.rotation.x=0;return this.health<=0;
  }

  private beginSearch(duration=8){
    this.state='search';this.timer=duration;this.searchIndex=0;this.linger=.25;this.arrival=false;this.unreachable=0;this.repath=0;
    const offsets=[[0,0],[2,0],[0,2],[-2,0],[0,-2],[2,2],[-2,-2]];
    this.searchPoints=offsets.map(([x,z])=>({x:this.lastKnown.x+x,z:this.lastKnown.z+z}))
      .filter(p=>!this.boxes.some(b=>overlaps(p.x,p.z,.36,b)));
    if(!this.searchPoints.length)this.searchPoints=[{x:this.position.x,z:this.position.z}];
  }

  private animate(dt:number,time:number,moving:boolean){
    const attack=this.attackPose>0?Math.sin(Math.min(1,this.attackPose/.32)*Math.PI):0;
    this.attackPose=Math.max(0,this.attackPose-dt);
    this.limbs.forEach((limb,i)=>{
      if(this.kind==='warden'){
        limb.rotation.x=Math.sin(this.gait+(i%2?Math.PI:0)+(i>1?Math.PI:0))*(moving?.3:.018)+(i%2===0?attack*.9:0);
        limb.rotation.z=i%2===0?(i<2?-1:1)*.08:0;
      }else{
        limb.rotation.x=Math.sin(this.gait+(i%2?Math.PI:0))*(moving?.3:.025)+attack*.25;
        limb.rotation.z=Math.cos(this.gait+(i%2?Math.PI:0))*(moving?.12:.015);
      }
    });
    const scanning=(this.state==='search'||this.state==='investigate')&&!moving;
    this.head.rotation.y=scanning?Math.sin(time*1.4)*.7:Math.sin(time*.9)*.035;
    this.head.rotation.z=this.kind==='warden'?Math.sin(time*.7)*.07:0;
    this.mesh.position.copy(this.position);this.mesh.position.y=Math.sin(time*(moving?7:1.6))*(moving?.015:.008);
  }

  update(dt:number,time:number,target:Target,diff:Difficulty,damage:(n:number)=>void,alert:()=>void){
    this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.tell=Math.max(0,this.tell-dt);this.movementSpeed=0;
    if(this.state==='down'){
      this.timer-=dt;this.mesh.rotation.z=1.4;this.mesh.position.y=.15;
      if(this.timer<=0){this.health=this.kind==='warden'?140:70;this.mesh.rotation.z=0;this.beginSearch(5);}
      return;
    }
    if(this.state==='stunned'){
      this.timer-=dt;this.mesh.rotation.z=Math.sin(time*24)*.07;this.head.rotation.x=Math.sin(time*20)*.14;
      if(this.timer<=0){this.mesh.rotation.z=0;this.head.rotation.x=0;this.state='investigate';this.timer=.9;this.arrival=false;this.unreachable=0;this.repath=0;}
      return;
    }
    this.mesh.rotation.z=0;
    const dx=target.x-this.position.x,dz=target.z-this.position.z,distance=Math.hypot(dx,dz);
    const sight=(target.crouched?8:14)+(target.flashlight?3:0);
    const dot=(-Math.sin(this.mesh.rotation.y)*dx-Math.cos(this.mesh.rotation.y)*dz)/Math.max(.01,distance);
    const sees=!target.hidden&&distance<sight&&lineClear(this.position,target,this.boxes,target.crouched?.8:1.4)
      &&(dot>-.05||distance<3.3||this.state==='chase'||this.state==='attack');
    if(sees){
      if(this.state!=='chase'&&this.state!=='attack'){this.tell=.8;this.repath=0;alert();}
      this.lastKnown={x:target.x,z:target.z};this.lost=0;this.state=distance<1.65?'attack':'chase';
    }else if(this.state==='chase'||this.state==='attack'){
      this.lost+=dt;if(this.lost>3)this.beginSearch();
    }
    if(this.state==='attack'){
      if(sees&&distance<1.85&&this.attackCooldown<=0&&this.tell<=0){damage(difficulty[diff].damage*(this.kind==='crawler'?.65:1));this.attackCooldown=1.5;this.attackPose=.32;}
      if(!sees||distance>1.8)this.state='chase';
    }

    let destination:Point=this.lastKnown;
    let stop=false;
    if(this.state==='patrol'){
      destination=this.patrol[this.patrolIndex];
      if(Math.hypot(destination.x-this.position.x,destination.z-this.position.z)<.75){this.patrolIndex=(this.patrolIndex+1)%this.patrol.length;destination=this.patrol[this.patrolIndex];this.repath=0;}
    }else if(this.state==='investigate'){
      const arrived=Math.hypot(destination.x-this.position.x,destination.z-this.position.z)<.75;
      if(arrived){this.arrival=true;this.timer-=dt;stop=true;if(this.timer<=0)this.beginSearch(7);}
      // A noise inside an inaccessible solid cannot trap the hunter forever.
      else if(!this.path.length){this.unreachable+=dt;if(this.unreachable>5)this.beginSearch(5);}
    }else if(this.state==='search'){
      destination=this.searchPoints[this.searchIndex]??this.lastKnown;
      const arrived=Math.hypot(destination.x-this.position.x,destination.z-this.position.z)<.7;
      if(arrived){this.arrival=true;this.linger-=dt;stop=true;if(this.linger<=0){this.searchIndex=(this.searchIndex+1)%this.searchPoints.length;this.linger=.85;this.repath=0;}}
      if(this.arrival||this.searchIndex>0)this.timer-=dt;
      if(!this.path.length&&!arrived)this.unreachable+=dt;
      if(this.timer<=0||this.unreachable>8){this.state='patrol';this.searchPoints=[];this.repath=0;stop=false;destination=this.patrol[this.patrolIndex];}
    }

    this.repath-=dt;
    if(this.repath<=0&&!stop&&this.state!=='attack'){
      this.path=findPath(this.position,destination,this.boxes);this.repath=this.state==='chase'?.65:1.5;
    }
    let next=this.path[0];
    if(next&&Math.hypot(next.x-this.position.x,next.z-this.position.z)<.18){this.path.shift();next=this.path[0];}
    const moving=!!next&&this.tell<=0&&this.state!=='attack'&&!stop;
    if(moving&&next){
      const dx=next.x-this.position.x,dz=next.z-this.position.z,length=Math.hypot(dx,dz);
      const speed=difficulty[diff].speed*(this.kind==='crawler'?1.4:1)*(this.state==='chase'?1:this.state==='patrol'?.43:.66);
      const travel=Math.min(length,speed*dt);
      const point=moveCircle(this.position,dx/length*travel,dz/length*travel,.32,0,this.boxes);
      const travelled=Math.hypot(point.x-this.position.x,point.z-this.position.z);
      this.movementSpeed=travelled/Math.max(.001,dt);this.stride+=travelled;
      const strideLength=this.kind==='warden'?.8:.55;
      if(this.stride>=strideLength){this.stride-=strideLength;this.stepCount++;}
      this.position.x=point.x;this.position.z=point.z;this.mesh.rotation.y=Math.atan2(-dx,-dz);this.gait+=travelled*(this.kind==='warden'?4.7:8);
    }
    this.animate(dt,time,moving);
  }
}
