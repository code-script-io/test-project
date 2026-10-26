import * as THREE from 'three';
import type { Settings } from './config';
export class Rendering {
  scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,95);renderer:THREE.WebGLRenderer;
  moon:THREE.DirectionalLight;flashlight:THREE.SpotLight;flashTarget=new THREE.Object3D();gun=new THREE.Group();muzzle:THREE.PointLight;gunBase=new THREE.Vector3(.26,-.27,-.47);
  constructor(public settings:Settings){
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.45;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.id='game-canvas';document.querySelector('#app')!.prepend(this.renderer.domElement);
    this.scene.background=new THREE.Color(0x243737);this.scene.fog=new THREE.FogExp2(0x243737,.018);
    this.scene.add(new THREE.HemisphereLight(0xb9cdd0,0x607361,2.1),new THREE.AmbientLight(0xc8d7c2,.65));
    const moon=this.moon=new THREE.DirectionalLight(0xabc7c8,2.1);moon.position.set(-14,28,18);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-30;moon.shadow.camera.right=36;moon.shadow.camera.top=44;moon.shadow.camera.bottom=-36;moon.shadow.bias=-.0004;this.scene.add(moon);
    const moonDisc=new THREE.Mesh(new THREE.SphereGeometry(1.3,20,20),new THREE.MeshBasicMaterial({color:0xcbd5bf}));moonDisc.position.set(-18,30,-38);this.scene.add(moonDisc);
    this.flashlight=new THREE.SpotLight(0xe5e7c7,55,30,Math.PI/5,.65,1.3);this.flashlight.position.set(.15,-.1,.1);this.flashlight.castShadow=true;this.flashlight.shadow.mapSize.set(1024,1024);this.flashlight.shadow.bias=-.002;this.flashTarget.position.set(0,0,-10);this.camera.add(this.flashlight,this.flashTarget);this.flashlight.target=this.flashTarget;
    this.scene.add(this.camera);this.buildGun();this.muzzle=new THREE.PointLight(0xffb75e,0,5);this.muzzle.position.set(.25,-.15,-.85);this.camera.add(this.muzzle);
    this.camera.rotation.order='YXZ';this.apply(settings);
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.render();});
  }
  buildGun(){const steel=new THREE.MeshStandardMaterial({color:0x3d4947,roughness:.35,metalness:.8}),grip=new THREE.MeshStandardMaterial({color:0x1c2520,roughness:.9});
    const slide=new THREE.Mesh(new THREE.BoxGeometry(.12,.13,.35),steel);slide.position.z=-.08;
    const handle=new THREE.Mesh(new THREE.BoxGeometry(.11,.22,.13),grip);handle.rotation.x=-.25;handle.position.set(0,-.12,.02);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.13,10),steel);barrel.rotation.x=Math.PI/2;barrel.position.z=-.31;
    const sight=new THREE.Mesh(new THREE.BoxGeometry(.015,.025,.018),steel);sight.position.set(0,.08,-.21);
    const hand=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.22),new THREE.MeshStandardMaterial({color:0x5b6552}));hand.position.set(.035,-.13,.13);hand.rotation.x=-.2;
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.14,.18,.5),new THREE.MeshStandardMaterial({color:0x333f32}));arm.position.set(.08,-.22,.36);arm.rotation.x=-.15;
    this.gun.add(slide,handle,barrel,sight,hand,arm);this.gun.position.copy(this.gunBase);this.camera.add(this.gun);
  }
  apply(settings:Settings){this.settings=settings;this.renderer.toneMappingExposure=1.45*settings.brightness;const ratio=Math.min(devicePixelRatio,settings.quality==='high'?2:settings.quality==='medium'?1.5:1);if(this.renderer.getPixelRatio()!==ratio)this.renderer.setPixelRatio(ratio);this.renderer.shadowMap.enabled=settings.quality!=='low';this.flashlight.castShadow=settings.quality==='high';}
  updateEnvironment(dt:number){const p=this.camera.position;const indoors=p.z<14&&p.z>-34&&p.x>-16&&p.x<34;this.moon.intensity=THREE.MathUtils.damp(this.moon.intensity,indoors?.35:2.1,5,dt);}
  render(){this.renderer.render(this.scene,this.camera);}
}
