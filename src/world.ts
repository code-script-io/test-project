import * as THREE from 'three';
import type { Box } from './physics';
export type ItemType='fuse'|'key'|'valve'|'ammo'|'medkit'|'battery'|'note'|'power'|'gate'|'sewer'|'radio'|'locker'|'obstacle'|'bell'|'seal';
export interface Interactable { id:string; type:ItemType; name:string; description:string; position:THREE.Vector3; mesh:THREE.Object3D; active:boolean; }
export class World {
  boxes:Box[]=[]; solidMeshes:THREE.Mesh[]=[]; items:Interactable[]=[]; lights:THREE.PointLight[]=[]; emergency:THREE.PointLight[]=[]; rain:THREE.Points; scene:THREE.Scene; power=false; private rainPositions:Float32Array;
  private materials:Record<string,THREE.MeshStandardMaterial>={};
  private ritualMaterials:THREE.MeshStandardMaterial[]=[];private ritualLights:THREE.PointLight[]=[];private candles:THREE.Mesh[]=[];private hauntingStrength=0;private hauntingTime=0;
  constructor(scene:THREE.Scene){
    this.scene=scene;
    this.materials.wall=this.texture('#69766b','#47574e',true);
    this.materials.wood=this.texture('#70634f','#434c3d',false);
    this.materials.floor=this.texture('#657466','#404f45',false);
    this.materials.concrete=this.texture('#70827d','#4c625c',true);
    this.materials.metal=new THREE.MeshStandardMaterial({color:0x344441,roughness:.55,metalness:.7});
    this.materials.rust=this.texture('#66432d','#242f28',true);
    this.build();
    this.rainPositions=new Float32Array(1400*3);for(let i=0;i<1400;i++){this.rainPositions[i*3]=(Math.random()-.5)*55;this.rainPositions[i*3+1]=Math.random()*16;this.rainPositions[i*3+2]=15+Math.random()*28;}
    const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(this.rainPositions,3));this.rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0x9cbbb4,size:.045,transparent:true,opacity:.35,depthWrite:false}));scene.add(this.rain);
  }
  texture(a:string,b:string,vertical:boolean){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=a;ctx.fillRect(0,0,256,256);let seed=41;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    // Subtle surface grain, rather than large random patches that conceal geometry.
    for(let i=0;i<6500;i++){ctx.fillStyle=rand()>.5?'rgba(255,255,245,.035)':'rgba(0,0,0,.045)';ctx.fillRect(rand()*256,rand()*256,1,1);}
    if(!vertical){
      for(let i=0;i<150;i++){const x=rand()*256;ctx.strokeStyle='rgba(30,24,15,.09)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+rand()*6,85,x-rand()*6,170,x,256);ctx.stroke();}
      ctx.strokeStyle=b;ctx.globalAlpha=.55;ctx.lineWidth=1.4;
      for(let x=0;x<=256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.moveTo(x,x%128?85:170);ctx.lineTo(x+64,x%128?85:170);ctx.stroke();}
    }else if(a==='#69766b'){
      ctx.strokeStyle=b;ctx.globalAlpha=.28;ctx.lineWidth=1;
      for(let x=0;x<256;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();for(let y=16;y<256;y+=48){ctx.beginPath();ctx.moveTo(x+16,y-6);ctx.lineTo(x+21,y);ctx.lineTo(x+16,y+6);ctx.lineTo(x+11,y);ctx.closePath();ctx.stroke();}}
    }else{
      ctx.strokeStyle=b;ctx.globalAlpha=.3;ctx.lineWidth=1;
      for(let y=0;y<=256;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.moveTo(y%256?128:0,y);ctx.lineTo(y%256?128:0,y+128);ctx.stroke();}
      for(let i=0;i<22;i++){ctx.fillStyle=b;ctx.globalAlpha=.06;ctx.fillRect(rand()*256,rand()*256,rand()*16+2,1);}
    }
    ctx.globalAlpha=1;const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);map.anisotropy=4;map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map,roughness:.95});
  }
  mesh(w:number,h:number,d:number,x:number,y:number,z:number,material:string|THREE.Material='wall',collide=false){const geometry=new THREE.BoxGeometry(w,h,d);const uv=geometry.attributes.uv,normals=geometry.attributes.normal;
    // Keep grain and boards at a consistent world scale on large floors and narrow walls.
    for(let i=0;i<uv.count;i++){const nx=Math.abs(normals.getX(i)),ny=Math.abs(normals.getY(i));const u=nx>.5?d:w,v=ny>.5?d:h;uv.setXY(i,uv.getX(i)*u/3,uv.getY(i)*v/3);}
    const m=new THREE.Mesh(geometry,typeof material==='string'?this.materials[material]:material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);if(collide){this.boxes.push({x,z,w,d,h:y+h/2});this.solidMeshes.push(m);}return m;}
  wall(x:number,z:number,w:number,d:number,material='wall',h=3.8){return this.mesh(w,h,d,x,h/2,z,material,true);}
  light(x:number,z:number,color:number,power=14,y=2.7){const l=new THREE.PointLight(color,power,13,2);l.position.set(x,y,z);this.scene.add(l);this.lights.push(l);this.mesh(.18,.14,.18,x,y+.18,z,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2}));return l;}
  sign(text:string,x:number,y:number,z:number,ry=0,w=3,color='#b4c8ad'){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d')!;g.fillStyle='#101b18';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=3;g.strokeRect(6,6,500,116);g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font='bold 34px monospace';g.fillText(text,256,64,470);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;this.scene.add(m);return m;}
  addItem(id:string,type:ItemType,name:string,description:string,x:number,z:number,y=.9){
    const group=new THREE.Group();group.position.set(x,y,z);this.scene.add(group);
    const colors:Partial<Record<ItemType,number>>={fuse:0xcfdca1,key:0xc4a45a,valve:0xbc593a,ammo:0xb8a475,medkit:0xd7d7c3,battery:0x73a9a4,note:0xbfb38d};
    const material=new THREE.MeshStandardMaterial({color:colors[type]??0x354c49,roughness:.5,metalness:type==='key'?.8:.3,emissive:colors[type]??0x1d5850,emissiveIntensity:.15});
    let model:THREE.Object3D;
    if(type==='locker'){
      model=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.6,.9),this.materials.metal);model.position.y=.4;
      for(let i=0;i<5;i++){const vent=new THREE.Mesh(new THREE.BoxGeometry(.65,.035,.04),new THREE.MeshBasicMaterial({color:0x101d19}));vent.position.set(0,1.1-i*.13,.47);group.add(vent);}
    }else if(type==='bell'){
      model=new THREE.Group();const bronze=new THREE.MeshStandardMaterial({color:0xc09a59,emissive:0x6a491d,emissiveIntensity:.18,metalness:.7,roughness:.4,side:THREE.DoubleSide});this.ritualMaterials.push(bronze);
      const cup=new THREE.Mesh(new THREE.CylinderGeometry(.13,.34,.4,16,1,true),bronze);cup.position.y=.04;
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.34,.035,6,20),bronze);rim.rotation.x=Math.PI/2;rim.position.y=-.16;
      const clapper=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),this.materials.metal);clapper.position.y=-.18;
      const hanger=new THREE.Mesh(new THREE.TorusGeometry(.08,.022,6,12),bronze);hanger.position.y=.3;model.add(cup,rim,clapper,hanger);
    }else if(type==='seal'){
      model=new THREE.Group();const seal=new THREE.MeshStandardMaterial({color:0x9f7246,emissive:0xb26a2b,emissiveIntensity:.4,metalness:.5,roughness:.55,side:THREE.DoubleSide});this.ritualMaterials.push(seal);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.78,.075,8,40),seal);model.add(ring);
      for(let i=0;i<6;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.035,.5,.04),seal);spoke.position.set(Math.sin(i*Math.PI/3)*.4,Math.cos(i*Math.PI/3)*.4,0);spoke.rotation.z=-i*Math.PI/3;model.add(spoke);}
      const center=new THREE.Mesh(new THREE.OctahedronGeometry(.12),seal);model.add(center);
    }else if(['power','radio'].includes(type)){
      model=new THREE.Mesh(new THREE.BoxGeometry(type==='radio'?1.5:1,.9,.45),material);
      const led=new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),new THREE.MeshBasicMaterial({color:0x9adcaa}));led.position.set(.25,.2,.25);group.add(led);
    }else if(type==='gate'){model=new THREE.Group();for(let i=0;i<11;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.07,3.5,.08),this.materials.metal);bar.position.set((i-5)*.35,.8,0);model.add(bar);}for(const yb of [-.3,1.6]){const bar=new THREE.Mesh(new THREE.BoxGeometry(4,.07,.1),this.materials.metal);bar.position.y=yb;model.add(bar);}}
    else if(type==='sewer'){model=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.15,20),this.materials.metal);model.position.y=-.8;}
    else if(type==='valve'){model=new THREE.Mesh(new THREE.TorusGeometry(.24,.045,6,12),material);model.rotation.x=Math.PI/2;}
    else if(type==='key'){model=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,12),material);const stem=new THREE.Mesh(new THREE.BoxGeometry(.06,.32,.04),material);stem.position.y=-.2;model.add(ring,stem);}
    else {model=new THREE.Mesh(new THREE.BoxGeometry(type==='note'?.48:.3,type==='note'?.025:.2,type==='note'?.34:.25),material);}
    model.castShadow=true;group.add(model);
    if(colors[type]){const halo=new THREE.Mesh(new THREE.RingGeometry(.23,.25,24),new THREE.MeshBasicMaterial({color:colors[type],transparent:true,opacity:.55,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.y=-.1;group.add(halo);}
    if(type==='gate'){this.boxes.push({x,z,w:4,d:.2,h:3.5,tag:id});group.traverse(o=>{if(o instanceof THREE.Mesh)this.solidMeshes.push(o);});}
    if(type==='locker'&&id!=='bed-hide'){this.boxes.push({x,z,w:1.2,d:.9,h:2.7,tag:id});if(model instanceof THREE.Mesh)this.solidMeshes.push(model);}
    const item={id,type,name,description,position:new THREE.Vector3(x,y,z),mesh:group,active:true};this.items.push(item);return item;
  }
  table(x:number,z:number,w=2,d=1){this.mesh(w,.15,d,x,.85,z,'wood',true);for(const dx of [-w/2+.12,w/2-.12])for(const dz of [-d/2+.12,d/2-.12])this.mesh(.1,.8,.1,x+dx,.4,z+dz,'wood');}
  build(){
    // Continuous ground; low foundation floors deliberately avoid collision seams.
    this.mesh(70,.3,90,7,-.2,4,'floor');this.mesh(32,.12,32,0,-.025,-2,'wood');this.mesh(18,.13,18,25,-.02,-9,'concrete');this.mesh(32,.14,16,0,-.01,-26,'concrete');
    for(const [x,z,w,d] of [[-19,4,1,78],[36,4,1,78],[8,-35,56,1],[8,43,56,1]])this.wall(x,z,w,d,'concrete',6);
    // Mansion perimeter and three generous passageways.
    this.wall(-16,-2,.5,32);this.wall(-9,14,14,.5);this.wall(9,14,14,.5);
    this.wall(-9,-18,14,.5);this.wall(9,-18,14,.5);
    this.wall(16,-13,.5,10);this.wall(16,6,.5,16);
    this.mesh(32,.18,32,0,3.85,-2,'wood');
    // A gabled roof, boarded windows and a chimney silhouette establish the estate exterior.
    const roofGeometry=new THREE.BufferGeometry();
    roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
      -17,3.9,15, 0,6.8,15, 0,6.8,-19, -17,3.9,15, 0,6.8,-19, -17,3.9,-19,
      0,6.8,15, 17,3.9,15, 17,3.9,-19, 0,6.8,15, 17,3.9,-19, 0,6.8,-19,
      -17,3.9,15, 17,3.9,15, 0,6.8,15, -17,3.9,-19, 0,6.8,-19, 17,3.9,-19
    ],3));roofGeometry.computeVertexNormals();
    const roof=new THREE.Mesh(roofGeometry,new THREE.MeshStandardMaterial({color:0x202b24,roughness:.95,side:THREE.DoubleSide}));roof.castShadow=true;this.scene.add(roof);
    this.mesh(1.4,3,1.4,-10,5.7,-9,'concrete');
    for(const x of [-12,-8,8,12]){
      this.mesh(2,1.9,.16,x,2.1,14.32,'wood');
      this.mesh(1.65,1.6,.18,x,2.1,14.42,new THREE.MeshStandardMaterial({color:0x273b2c,emissive:0x8b794a,emissiveIntensity:.25}));
      for(const dx of [-.5,.5]){this.mesh(.09,1.7,.21,x+dx,2.1,14.49,'wood');}
      const board=this.mesh(2.15,.17,.24,x,2,14.55,'wood');board.rotation.z=x*.015;
    }
    this.sign('BLACKTHORN',0,3.2,14.35,0,3.7);
    // Central hall, bedrooms, archive and surgery.
    for(const x of [-5,5]){this.wall(x,-15.5,.25,5);this.wall(x,-4.5,.25,9);this.wall(x,9,.25,10);}
    for(const x of [-14,-7])this.wall(x,-3,4,.25);
    for(const x of [7,14])this.wall(x,-3,4,.25);
    this.sign('BLACKTHORN ESTATE',0,2.7,-17.7,0,4);
    this.sign('ARCHIVE  ←',-4.84,2.5,-11,Math.PI/2,2.4);this.sign('LABORATORY  →',4.84,2.5,-11,-Math.PI/2,2.6);
    this.sign('NORTH / DRAINAGE',0,2.8,-19,0,3.5);this.sign('SOUTH / FOREST',0,2.7,13.7,Math.PI,3.6);
    for(const z of [-12,-1,9])this.light(0,z,0xd9bc78,13);
    this.light(-11,-12,0x8aafa1,10);this.light(-11,7,0xb6794b,9);this.light(11,6,0xc38a54,11);this.light(11,-12,0x83a899,8);
    // Wainscoting and beams give rooms a strong silhouette in flashlight light.
    for(const x of [-15.68,15.68])this.mesh(.12,.85,31,x,.45,-2,'wood');
    for(const z of [-14,-6,3,11]){this.mesh(32,.26,.25,0,3.55,z,'wood');}
    // Portraits: entirely procedural, unsettling silhouettes.
    for(const z of [-11,-5,5]){
      this.mesh(.14,1.5,1.1,-4.78,2,z,'wood');
      this.mesh(.15,1.28,.9,-4.68,2,z,new THREE.MeshStandardMaterial({color:0x101915}));
      const portrait=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),new THREE.MeshStandardMaterial({color:0x626a51,roughness:1}));portrait.scale.set(.24,1,1);portrait.position.set(-4.56,2.15,z);this.scene.add(portrait);
    }
    this.table(-11,-12,3,1.2);this.table(11,6,5,1.6);this.table(12,-13,2.6,1.2);this.table(-12,2,2,1);
    // Beds and shelves double as cover.
    for(const [x,z] of [[-12,8],[-8,8]]){
      // Keep a single support volume, but leave real visual clearance for a hidden eye at y=.3.
      this.boxes.push({x,z,w:2,d:3.4,h:.775});
      for(const dx of [-.94,.94])this.solidMeshes.push(this.mesh(.12,.14,3.4,x+dx,.54,z,'wood'));
      for(const dz of [-1.64,1.64])this.solidMeshes.push(this.mesh(2,.2,.12,x,.57,z+dz,'wood'));
      for(const dx of [-.88,.88])for(const dz of [-1.5,1.5])this.solidMeshes.push(this.mesh(.13,.55,.13,x+dx,.275,z+dz,'wood'));
      this.solidMeshes.push(this.mesh(1.9,.17,3.25,x,.69,z,new THREE.MeshStandardMaterial({color:0x596456})));
      this.mesh(1.6,.15,.6,x,.84,z-1.1,new THREE.MeshStandardMaterial({color:0x929582}));
    }
    for(const z of [-15,-8]){this.wall(-15,z,1.1,4,'wood',2.8);for(let i=0;i<16;i++){const b=this.mesh(.15,.55,.5,-14.38,.5+Math.floor(i/8)*.8,z-1.5+(i%8)*.36,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.06+i*.015,.18,.16+i%3*.035)}));b.rotation.x=.03*(i%3);}}
    this.addItem('bed-hide','locker','Hide beneath the bed','Stay still. Being seen entering gives your hiding place away.',-8,8,.3).mesh.visible=false;
    this.addItem('bedroom-locker','locker','Hide in locker','Break line of sight before hiding.',-14,4,1);
    this.addItem('archive-fuse','fuse','Ceramic fuse','A replacement for the lab generator.',-11,-12,1.05);
    this.addItem('archive-note','note','Log 0417','ACCESS LOG / 17 APRIL\nThe evacuation frequency is locked to 0417.\nRestore the lab generator, then use the north tunnel radio.\nThe Warden hears running and gunfire. Walk. Break sight. Hide.',-10,-12,1.02);
    this.addItem('hall-ammo','ammo','Pistol rounds × 12','Every shot tells them where you are.',-12,2,1.02);
    this.addItem('bedroom-med','medkit','Medical kit','Press H to heal 45 health.',-13,10,.25);
    this.addItem('dining-battery','battery','Flashlight battery','Restores 50% battery.',11,6,1.05);
    // Lab extension.
    this.wall(25,-18,18,.5,'concrete');this.wall(34,-9,.5,18,'concrete');this.wall(19.6,0,7.2,.5,'concrete');this.wall(30.4,0,7.2,.5,'concrete');this.mesh(18,.15,18,25,3.85,-9,'concrete');
    this.sign('SECTOR 04 / NEURAL RESEARCH',25,2.8,-17.7,0,5);
    this.sign('POWER / INSERT FUSE',25,2,-16.9,0,3.5);
    this.table(25,-16,3,1);this.addItem('generator','power','Lab generator','Requires a ceramic fuse from the archive.',25,-16,1.4);
    this.addItem('lab-valve','valve','Drainage valve','Use at the north tunnel drainage hatch.',30,-12,1.05);this.table(30,-12,2,1);
    this.addItem('lab-ammo','ammo','Pistol rounds × 12','Twelve chances to buy some time.',29,-3,1.05);this.table(29,-3,3,1);
    this.addItem('lab-med','medkit','Medical kit','Press H to recover.',20,-15,.3);
    this.addItem('lab-locker','locker','Hide in locker','Wait here until the hunt passes.',32,-3,1);
    for(const z of [-13,-5]){const l=this.light(25,z,0x5dc6b0,4);this.emergency.push(l);}
    this.wall(24,-8,5,1,'metal',1);this.mesh(2,.22,1,24,1.15,-8,new THREE.MeshStandardMaterial({color:0x8d9e8b}));
    // Tunnels, branching towards two alternate escapes.
    this.wall(-16,-26,.5,16,'concrete');this.wall(16,-26,.5,16,'concrete');this.wall(0,-34,32,.5,'concrete');this.mesh(32,.15,16,0,3.5,-26,'concrete');
    this.wall(-9,-18,14,.5,'concrete');this.wall(9,-18,14,.5,'concrete');
    for(const z of [-22,-30]){this.mesh(31,.2,.25,0,3.15,z,'rust');this.light(0,z,0xbc6644,10,2.8);}
    this.wall(-4,-27,.4,8,'concrete');this.wall(4,-27,.4,8,'concrete');
    this.sign('DRAINAGE  ←',-10,2.2,-33.7,0,3);this.sign('EMERGENCY RADIO',10,2.2,-33.7,0,3.5);
    this.addItem('drain-exit','sewer','Drainage escape','Requires restored power and a drainage valve.',-11,-31,.9);
    this.table(10,-31,3,1.2);this.addItem('radio-exit','radio','Emergency radio','Restore power. Enter the four-digit evacuation code.',10,-31,1.4);
    this.addItem('tunnel-battery','battery','Flashlight battery','Restores 50% battery.',-11,-22,.4);
    this.addItem('tunnel-note','note','A route through the rain','THE GARDENER’S NOTE\nThe brass gate key is in the old greenhouse, east of the forest path.\nPower opens the gate mechanism.\nThe fallen barricades can be vaulted with SPACE.\nThe thing in the woods is quick, but it has poor hearing.',0,-24,.6);
    // Forest: moonlit trunks, canopy silhouettes, greenhouse ruins, vault course.
    const bark=this.materials.wood,leaf=new THREE.MeshStandardMaterial({color:0x283d2a,roughness:1});
    let seed=731;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    for(let i=0;i<86;i++){const x=(rand()-.5)*34,z=17+rand()*24;if(Math.abs(x)<3|| (x>7&&x<14&&z>22&&z<29))continue;const h=5+rand()*5;const tree=new THREE.Mesh(new THREE.CylinderGeometry(.12,.3,h,6),bark);tree.position.set(x,h/2,z);tree.castShadow=true;this.scene.add(tree);this.boxes.push({x,z,w:.5,d:.5,h});for(let j=0;j<2;j++){const crown=new THREE.Mesh(new THREE.ConeGeometry(1.6+rand(),3.9,6),leaf);crown.position.set(x,h-1+j*1.5,z);this.scene.add(crown);}}
    for(const z of [20,28,34]){this.mesh(4,.8,.55,0,.4,z,'wood',true);this.sign('VAULT',0,.5,z-.29,Math.PI,1.3,'#b5bda2');this.addItem(`vault-${z}`,'obstacle','Vault barricade','SPACE to climb over',0,z,.8).mesh.visible=false;}
    for(const x of [7,14])this.wall(x,25,.12,7,'rust',1.1);this.wall(10.5,28.5,7,.12,'rust',1.1);
    for(const x of [7,14])for(const z of [21.5,28.5])this.mesh(.1,3,.1,x,1.5,z,'metal');
    this.sign('GREENHOUSE',10.5,2.5,28.5,0,3);this.table(11,26,2,1);this.addItem('forest-key','key','Brass gate key','The south perimeter gate. Restore power first.',11,26,1.2);
    this.addItem('forest-med','medkit','Medical kit','Press H to heal.',-7,24,.3);
    this.addItem('forest-note','note','The last groundskeeper','THE GROUNDSKEEPER\nThere are three ways out.\nSOUTH: brass key + power → perimeter gate.\nNORTH WEST: valve + power → drainage hatch.\nNORTH EAST: code + power → emergency radio.\nFind a fuse in the west archive. The generator is in the east lab.',2,16,.5);
    for(const x of [-3,3]){this.wall(x,39,.5,.8,'concrete',4.2);this.light(x,38.8,0x77bba5,16,3.5);}this.wall(-10,40,14,.4,'metal',3.4);this.wall(10,40,14,.4,'metal',3.4);
    this.addItem('forest-exit','gate','Perimeter escape gate','Requires restored power and the brass gate key.',0,40,1.2);
    this.sign('DEAD ZONE / PERIMETER',0,3.3,39.8,Math.PI,4);
    // Environmental narrative: broken laboratory containment vessel.
    for(const x of [19,31]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,2.3,12,1,true),new THREE.MeshStandardMaterial({color:0x68968b,transparent:true,opacity:.18,side:THREE.DoubleSide,metalness:.7,roughness:.2}));tank.position.set(x,1.25,-10);this.scene.add(tank);this.mesh(1.6,.2,1.6,x,.1,-10,'metal',true);}
    this.sign('DO NOT TRUST THE VOICES',11,1.8,-17.7,0,4,'#b28b76');
    this.buildEchoWard();this.addStoryDetails();
  }
  private candle(x:number,z:number,y:number){
    const wax=new THREE.MeshStandardMaterial({color:0xc7b98c,roughness:.95});const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.24,8),wax);body.position.set(x,y+.12,z);this.scene.add(body);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.045,.17,6),new THREE.MeshBasicMaterial({color:0xffc777,transparent:true,opacity:.88}));flame.position.set(x,y+.32,z);this.scene.add(flame);this.candles.push(flame);
  }
  private buildEchoWard(){
    // The former therapy chapel connects through the lab's southern wall. Its center aisle stays unobstructed.
    const plaster=this.texture('#897e68','#5d6152',true),runner=new THREE.MeshStandardMaterial({color:0x56483b,roughness:1});
    this.mesh(16,.13,14,26,-.02,7,'concrete');this.mesh(16,.18,14,26,4.2,7,'wood');
    this.wall(18,7,.4,14,'concrete',4.2);this.wall(34,7,.4,14,'concrete',4.2);this.mesh(16,4.2,.4,26,2.1,14,plaster,true);
    this.mesh(3,.025,11,25,.07,6.5,runner);
    this.sign('ECHO WARD / RESONANCE THERAPY',25,2.8,.24,0,5.6,'#d4bc8a');
    this.sign('ECHO WARD  →',25,2.6,-.3,Math.PI,3.6,'#d0bd92');
    this.sign('THE ROOM REMEMBERS',25,3.25,13.75,Math.PI,4.4,'#c2a980');
    // Four restrained pews leave two-metre approaches to all bells.
    for(const x of [20.7,29.4])for(const z of [3.5,5.5]){
      this.mesh(3,.18,.65,x,.52,z,'wood',true);this.mesh(3,.82,.13,x,.85,z-.3,'wood',true);
      for(const dx of [-1.2,1.2])this.mesh(.12,.5,.5,x+dx,.25,z,'wood');
    }
    // Tall acoustic panels and cracked observation glass, kept outside navigation routes.
    for(const x of [18.26,33.74])for(const z of [3,7,11])this.mesh(.09,2.4,1.6,x,2,z,'wood');
    for(const x of [20.5,25,29.5]){
      const glass=this.mesh(2.2,1.7,.05,x,2.8,13.73,new THREE.MeshStandardMaterial({color:0x66877c,transparent:true,opacity:.32,roughness:.32,metalness:.25}));
      this.mesh(.05,1.75,.08,x,2.8,13.67,'metal');this.mesh(2.25,.05,.08,x,2.8,13.67,'metal');
      const shard=new THREE.Mesh(new THREE.PlaneGeometry(.025,1.2),new THREE.MeshBasicMaterial({color:0xa4b4a1,transparent:true,opacity:.4,side:THREE.DoubleSide}));shard.position.copy(glass.position);shard.position.z-=.04;shard.rotation.z=.4;this.scene.add(shard);
    }
    for(let i=0;i<3;i++){
      const x=21+i*4,id=`bell-${i+1}`,roman=['I','II','III'][i];
      this.mesh(.8,.95,.8,x,.475,9,'concrete',true);this.mesh(1,.12,1,x,1.0,9,'wood');
      this.mesh(.09,.8,.09,x-.45,1.46,9,'metal');this.mesh(.09,.8,.09,x+.45,1.46,9,'metal');this.mesh(1,.09,.09,x,1.87,9,'metal');
      this.addItem(id,'bell',`Resonance bell ${roman}`,'Ring the bell. Listen to the others before choosing the next.',x,9,1.43);
      this.sign(roman,x,.67,8.57,Math.PI,.55,'#d8c79c');this.candle(x-.3,9,1.06);
    }
    this.table(20.6,11.5,1.5,.8);this.addItem('chapel-note','note','The last listening session','ECHO WARD / FINAL SESSION\nThey told the patients that the bells could quiet the signal. The staff were wrong. They could only teach it a name.\nRemember the listening order: II → I → III. Ring those three bells without a mistake.\nRestore the laboratory generator. Then the evacuation seal in this room will answer.\nIf you hear your own footsteps coming back, do not follow them.',20.6,11.5,1.04);
    this.addItem('chapel-exit','seal','Echo Ward evacuation seal','Restore the generator and complete the resonance sequence.',30,11,1.6);
    this.mesh(2.5,.12,1.6,30,.12,11,'concrete');
    const sealLight=this.light(30,11.3,0xd4965a,15,2.9);sealLight.userData.wardIntensity=15;this.ritualLights.push(sealLight);
    for(const [x,z,power] of [[25,3,26],[21,8,18],[29,8,18]]){const l=this.light(x,z,0xd3b98d,power,3.2);l.userData.wardIntensity=power;}
    this.addItem('chapel-battery','battery','Sealed battery','A battery wrapped in a patient admission slip.',31.8,3,.3);
    this.addItem('chapel-med','medkit','Field dressing','Someone prepared to leave, but never reached the door.',19.5,8,.3);
    this.addItem('chapel-locker','locker','Hide in linen cabinet','The doors have been padded from the inside.',32.4,6.5,1);
  }
  private addStoryDetails(){
    // A clock with a missing hand, personal effects, and abandoned observation equipment.
    const dial=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.06,24),new THREE.MeshStandardMaterial({color:0xc1b89a,roughness:.9}));dial.rotation.x=Math.PI/2;dial.position.set(3.6,2.8,-17.65);this.scene.add(dial);
    this.mesh(.025,.26,.08,3.6,2.88,-17.58,'metal');this.sign('STOPPED AT 04:17',3.6,2.2,-17.65,0,1.8,'#9aa78b');
    const cloth=new THREE.MeshStandardMaterial({color:0x817b6b,roughness:1});
    for(const [x,z] of [[10.8,-13],[-11.5,8]]){const bundle=new THREE.Mesh(new THREE.SphereGeometry(.28,10,6),cloth);bundle.scale.set(1.7,.4,1);bundle.position.set(x,1.05,z);this.scene.add(bundle);}
    for(const x of [-2.6,2.6]){this.mesh(.18,1.5,.18,x,.75,16.8,'wood');this.sign(x<0?'DO NOT ANSWER':'IF IT USES YOUR NAME',x,1.45,16.7,Math.PI,2.3,'#b9a580');}
    // Old cable conduits lead toward the Echo Ward door and emphasize the shared power system.
    for(const x of [23.5,26.5])this.mesh(.07,.08,12,x,3.5,-5.7,'metal');
    this.sign('SESSION 17: NO RESPONSE',32.7,1.8,-17.7,0,2.1,'#a8bba6');
  }
  ringBell(id:string){const bell=this.items.find(i=>i.id===id&&i.type==='bell');if(bell)bell.mesh.userData.ringPulse=1;}
  setRitualSolved(on:boolean){
    for(const material of this.ritualMaterials){material.color.setHex(on?0xa1c5ac:0xc09a59);material.emissive.setHex(on?0x368c78:0x6a491d);material.emissiveIntensity=on?.65:.18;}
    for(const light of this.ritualLights){light.color.setHex(on?0x8fe5c4:0xd4965a);light.userData.wardIntensity=on?26:15;}
  }
  setHaunting(strength:number,time:number){this.hauntingStrength=THREE.MathUtils.clamp(strength,0,1);this.hauntingTime=Number.isFinite(time)?time:0;}
  setPower(on:boolean){this.power=on;this.emergency.forEach(l=>{l.intensity=on?42:12;});}
  update(dt:number,t:number,quality:string,viewer:THREE.Vector3){const budget=quality==='low'?4:quality==='medium'?6:8;const closest=new Set([...this.lights].sort((a,b)=>a.position.distanceToSquared(viewer)-b.position.distanceToSquared(viewer)).slice(0,budget));this.lights.forEach(l=>{l.visible=closest.has(l);});this.rain.visible=quality!=='low';if(this.rain.visible){for(let i=0;i<this.rainPositions.length;i+=3){this.rainPositions[i+1]-=dt*11;if(this.rainPositions[i+1]<0)this.rainPositions[i+1]=16;}this.rain.geometry.attributes.position.needsUpdate=true;}this.lights.forEach((l,i)=>{if(!this.emergency.includes(l)){const base=Number(l.userData.wardIntensity)||(i<3?26:22);const pulse=Math.max(0,Math.sin(this.hauntingTime*7.2+i*3.1));l.intensity=base*(1+Math.sin(t*2+i*4)*.025)*(1-this.hauntingStrength*pulse*.12);}});for(const flame of this.candles){flame.scale.y=.9+Math.sin(t*9+flame.position.x)*.1;flame.rotation.z=Math.sin(t*5+flame.position.z)*.06;}for(const item of this.items){if(item.type==='bell'){const pulse=Number(item.mesh.userData.ringPulse)||0;item.mesh.rotation.z=Math.sin(t*18)*pulse*.14;item.mesh.userData.ringPulse=Math.max(0,pulse-dt*.8);}if(item.active&&['fuse','key','valve','ammo','medkit','battery'].includes(item.type)){item.mesh.rotation.y=Math.sin(t*.8)*.15;}}}
}
