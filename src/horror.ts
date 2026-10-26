import * as THREE from 'three';
import type {Encounter} from './expansion';
/** Non-colliding narrative glimpses, never unavoidable damage or forced camera movement. */
export class HorrorEffects {
  private figure=new THREE.Group();private veil:THREE.MeshStandardMaterial;private life=0;private lightning:THREE.DirectionalLight;private flash=0;
  private particles:THREE.Points;private positions:Float32Array;
  constructor(public scene:THREE.Scene){
    this.veil=new THREE.MeshStandardMaterial({color:0x192b29,emissive:0x203532,emissiveIntensity:.2,transparent:true,opacity:.65,roughness:1});
    const body=new THREE.Mesh(new THREE.ConeGeometry(.42,1.9,10),this.veil);body.position.y=1;const head=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),this.veil);head.position.y=2.05;
    this.figure.add(body,head);for(const x of [-.42,.42]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.035,.018,1.1,6),this.veil);arm.position.set(x,1.05,0);arm.rotation.z=x*.3;this.figure.add(arm);}
    this.figure.visible=false;scene.add(this.figure);this.lightning=new THREE.DirectionalLight(0xc9e3e8,0);this.lightning.position.set(-15,25,25);scene.add(this.lightning);
    this.positions=new Float32Array(120*3);for(let i=0;i<120;i++){this.positions[i*3]=(Math.random()-.5)*30;this.positions[i*3+1]=Math.random()*3.3;this.positions[i*3+2]=(Math.random()-.5)*30;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xd4d5b4,size:.025,transparent:true,opacity:.28,depthWrite:false}));scene.add(this.particles);
  }
  trigger(event:Encounter,reducedScares:boolean){if(event.kind==='apparition'&&!reducedScares){this.figure.position.set(event.x,0,event.z);this.life=5;this.figure.visible=true;}if(event.kind==='thunder'&&!reducedScares)this.flash=.35;}
  reset(){this.life=0;this.flash=0;this.figure.visible=false;this.lightning.intensity=0;}
  update(dt:number,time:number,player:THREE.Vector3,quality:string,reducedScares:boolean){
    this.life=Math.max(0,this.life-dt);if(this.figure.position.distanceTo(player)<3)this.life=0;
    this.figure.visible=this.life>0&&!reducedScares;this.veil.opacity=Math.min(.65,this.life*.4);this.figure.rotation.y=Math.atan2(player.x-this.figure.position.x,player.z-this.figure.position.z);
    this.flash=Math.max(0,this.flash-dt);this.lightning.intensity=reducedScares?0:this.flash>0?Math.sin((1-this.flash/.35)*Math.PI)*.45:0;
    this.particles.visible=quality!=='low';this.particles.position.set(player.x,0,player.z);if(this.particles.visible){for(let i=0;i<120;i++){this.positions[i*3]+=(Math.sin(time*.2+i)*.015)*dt;this.positions[i*3+1]+=.025*dt;if(this.positions[i*3+1]>3.4)this.positions[i*3+1]=0;}this.particles.geometry.attributes.position.needsUpdate=true;}
  }
}
