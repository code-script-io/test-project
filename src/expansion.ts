/** Serializable progression for the optional Echo Ward; no renderer or audio required. */
export interface RitualSave { step:number; solved:boolean; extraction:'idle'|'opening'|'open'; remaining:number; }
export const REQUIEM=[2,1,3] as const;
export class RitualPuzzle {
  step=0;solved=false;extraction:'idle'|'opening'|'open'='idle';remaining=0;
  ring(bell:number,powered:boolean):'unpowered'|'wrong'|'correct'|'solved'|'complete' {
    if(!powered)return 'unpowered';if(this.solved)return 'complete';
    if(bell!==REQUIEM[this.step]){this.step=0;return 'wrong';}
    this.step++;if(this.step===REQUIEM.length){this.solved=true;return 'solved';}return 'correct';
  }
  open(powered:boolean):'unpowered'|'sealed'|'started'|'opening'|'open' {
    if(!powered)return 'unpowered';if(!this.solved)return 'sealed';
    if(this.extraction==='idle'){this.extraction='opening';this.remaining=12;return 'started';}return this.extraction;
  }
  update(dt:number){if(this.extraction==='opening'){this.remaining=Math.max(0,this.remaining-Math.max(0,dt));if(this.remaining===0)this.extraction='open';}}
  snapshot():RitualSave{return {step:this.step,solved:this.solved,extraction:this.extraction,remaining:this.remaining};}
  restore(value:unknown){const s=value&&typeof value==='object'?value as Partial<RitualSave>:{};this.solved=s.solved===true;this.step=this.solved?3:Number.isInteger(s.step)?Math.max(0,Math.min(2,s.step!)):0;
    this.extraction=this.solved&&(s.extraction==='opening'||s.extraction==='open')?s.extraction:'idle';this.remaining=this.extraction==='opening'?(typeof s.remaining==='number'&&Number.isFinite(s.remaining)?Math.max(.1,Math.min(12,s.remaining)):12):0;
  }
}
export type EncounterKind='knock'|'whisper'|'apparition'|'thunder';
export interface Encounter {kind:EncounterKind;caption:string;x:number;z:number;}
export class EncounterDirector {
  fired=new Set<string>();private clock=0;private nextAmbient=30;private pending:Encounter[]=[];
  restore(ids:unknown){this.fired=new Set(Array.isArray(ids)?ids.filter((s):s is string=>typeof s==='string'&&['archive','power','chapel','ritual','corridor'].includes(s)):[]);this.clock=0;this.nextAmbient=30;this.pending=[];}
  notify(id:'archive'|'power'|'chapel'|'ritual'|'corridor'){
    if(this.fired.has(id))return;this.fired.add(id);
    const events:Record<typeof id,Encounter>={
      archive:{kind:'whisper',caption:'[A breath behind the shelves. The room is empty.]',x:-14,z:-14},
      power:{kind:'knock',caption:'[Three knocks answer from the corridor.]',x:0,z:-7},
      corridor:{kind:'apparition',caption:'[A figure ahead. It was waiting for you.]',x:0,z:-7},
      chapel:{kind:'knock',caption:'[A bell moves. Nobody is touching it.]',x:29,z:9},
      ritual:{kind:'whisper',caption:'[The walls answer the final note. The seal releases.]',x:30,z:11}
    };this.pending.push(events[id]);
  }
  update(dt:number,player:{x:number;z:number},danger:number):Encounter[]{
    this.clock+=dt;
    if(this.clock>=this.nextAmbient&&danger<.4){
      this.nextAmbient=this.clock+35+(this.fired.size%3)*8;
      this.pending.push(player.z>14?{kind:'thunder',caption:'[Thunder rolls beyond the perimeter.]',x:player.x+12,z:player.z+8}:{kind:'knock',caption:'[Something taps inside a distant wall.]',x:player.x+7,z:player.z-5});
    }
    return this.pending.splice(0);
  }
}
