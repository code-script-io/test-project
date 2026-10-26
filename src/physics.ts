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
  const minX=-19,maxX=36,minZ=-35,maxZ=43,gridRadius=.35;
  const key=(p:Point)=>`${p.x},${p.z}`;
  const inBounds=(p:Point)=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ;
  const free=(p:Point,radius:number)=>inBounds(p)&&!boxes.some(b=>overlaps(p.x,p.z,radius,b));
  const clear=(a:Point,b:Point,radius:number)=>!boxes.some(box=>segmentBox(a,b,{...box,w:box.w+radius*2-1e-6,d:box.d+radius*2-1e-6}));
  // A legal position beside a wall may round into the wall's occupied grid cell.
  // Choose a nearby free cell connected to the real point, rather than treating
  // a visible, reachable player as unreachable or snapping through a partition.
  const endpoint=(point:Point,radius:number):Point|null=>{
    if(!free(point,radius))return null;
    const rounded={x:Math.round(point.x),z:Math.round(point.z)};
    if(free(rounded,gridRadius)&&clear(point,rounded,radius))return rounded;
    const candidates:Point[]=[];
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      const candidate={x:rounded.x+dx,z:rounded.z+dz};
      if(free(candidate,gridRadius)&&clear(point,candidate,radius))candidates.push(candidate);
    }
    candidates.sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z));
    return candidates[0]??null;
  };
  const s=endpoint(start,.32),e=endpoint(end,.3);
  if(!s||!e)return [];
  const open=[s],cost=new Map([[key(s),0]]),from=new Map<string,Point>();
  const closed=new Set<string>();
  let iterations=0;
  while(open.length&&iterations++<4500){
    open.sort((a,b)=>(cost.get(key(a))!+Math.abs(a.x-e.x)+Math.abs(a.z-e.z))-(cost.get(key(b))!+Math.abs(b.x-e.x)+Math.abs(b.z-e.z)));
    const c=open.shift()!,k=key(c);if(closed.has(k))continue;closed.add(k);
    if(c.x===e.x&&c.z===e.z){
      const path:Point[]=[e];let cur=c;
      while(from.has(key(cur))){cur=from.get(key(cur))!;path.push(cur);}
      path.reverse();
      // Preserve smooth replanning between cells when the direct first step is
      // safe; otherwise visit the resolved start cell before following the grid.
      if(path.length>1&&clear(start,path[1],.32))path.shift();
      else if(path.length===1&&Math.hypot(path[0].x-start.x,path[0].z-start.z)<.18)path.shift();
      return path;
    }
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const n={x:c.x+dx,z:c.z+dz},nk=key(n);
      // Thin partitions can lie between two free cells. Check the whole edge,
      // not just its endpoints, so navigation cannot plan through those walls.
      if(closed.has(nk)||!free(n,gridRadius)||!clear(c,n,gridRadius))continue;
      const g=cost.get(k)!+1;
      if(g<(cost.get(nk)??Infinity)){cost.set(nk,g);from.set(nk,c);open.push(n);}
    }
  }
  return [];
}
