export interface Box { x: number; z: number; w: number; d: number; h: number; tag?: string; }
export interface Point { x: number; z: number; }
export function overlaps(x: number, z: number, r: number, b: Box): boolean { return x + r > b.x-b.w/2 && x-r < b.x+b.w/2 && z+r > b.z-b.d/2 && z-r < b.z+b.d/2; }
export function moveCircle(p: Point, dx: number, dz: number, radius: number, feet: number, boxes: Box[]): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx,dz)/.16));
  let { x, z } = p;
  for(let i=0;i<steps;i++) {
    const nx=x+dx/steps; if(!boxes.some(b=>b.h>feet+.1 && overlaps(nx,z,radius,b))) x=nx;
    const nz=z+dz/steps; if(!boxes.some(b=>b.h>feet+.1 && overlaps(x,nz,radius,b))) z=nz;
  }
  return { x, z };
}
// A vault must clear every other solid along its full trajectory, not just its landing.
export function vaultClear(start:Point,end:Point,obstacle:Box,boxes:Box[],radius=.3): boolean {
  return !boxes.some(box=>box!==obstacle&&segmentBox(start,end,{...box,w:box.w+radius*2,d:box.d+radius*2}));
}
export function supportHeight(p:Point,feet:number,boxes:Box[]):number {
  let height=0;
  for(const box of boxes)if(box.h<=feet+.06&&overlaps(p.x,p.z,.27,box))height=Math.max(height,box.h);
  return height;
}
// Segment/rectangle slab test; useful for vision, sound occlusion and hitscan walls.
export function segmentBox(a: Point,b: Point,box: Box): boolean {
  let near=0, far=1;
  for(const axis of ['x','z'] as const){
    const half=(axis==='x'?box.w:box.d)/2, min=box[axis]-half,max=box[axis]+half,d=b[axis]-a[axis];
    if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return false;}
    else { let t1=(min-a[axis])/d,t2=(max-a[axis])/d; if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return false; }
  }
  return true;
}
export function lineClear(a: Point,b: Point,boxes: Box[],height=1.2): boolean { return !boxes.some(box=>box.h>=height && segmentBox(a,b,box)); }
export function findPath(start: Point,end: Point,boxes: Box[]): Point[] {
  const step=1, minX=-19,maxX=36,minZ=-35,maxZ=43;
  const cell=(p:Point)=>({x:Math.round(p.x/step),z:Math.round(p.z/step)});
  const s=cell(start),e=cell(end), key=(p:Point)=>`${p.x},${p.z}`;
  const open=[s], cost=new Map([[key(s),0]]), from=new Map<string,Point>();
  const closed=new Set<string>();
  let iterations=0;
  while(open.length && iterations++<4500){
    open.sort((a,b)=>(cost.get(key(a))!+Math.abs(a.x-e.x)+Math.abs(a.z-e.z))-(cost.get(key(b))!+Math.abs(b.x-e.x)+Math.abs(b.z-e.z)));
    const c=open.shift()!,k=key(c); if(closed.has(k))continue; closed.add(k);
    if(c.x===e.x&&c.z===e.z){const path:Point[]=[e];let cur=c;while(from.has(key(cur))){cur=from.get(key(cur))!;path.push(cur);}return path.reverse().slice(1);}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const n={x:c.x+dx,z:c.z+dz},nk=key(n);if(n.x<minX||n.x>maxX||n.z<minZ||n.z>maxZ||closed.has(nk)||boxes.some(b=>overlaps(n.x,n.z,.35,b)))continue;
      const g=cost.get(k)!+1;if(g<(cost.get(nk)??Infinity)){cost.set(nk,g);from.set(nk,c);open.push(n);}
    }
  }
  return [];
}
