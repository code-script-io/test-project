import {clampAudio,spatialMix,type AudioPoint,type AudioListenerPoint} from './audio-math';
export type AudioZone='mansion'|'lab'|'tunnel'|'forest'|'chapel';
export interface AudioState extends AudioListenerPoint { zone:AudioZone;danger:number;stamina:number;hidden:boolean;power:boolean; }
export type SoundName='shot'|'step'|'hit'|'pickup'|'reload'|'growl'|'switch'|'empty'|'win'|'decoy'|'bell'|'thunder'|'door'|'heartbeat'|'breath'|'sting'|'ritual'|'secret';
export type PositionalSound='enemy-step'|'whisper'|'creak'|'knock'|'growl'|'bell';
interface VoiceOptions { pan?:number; delay?:number; cutoff?:number; attack?:number; filter?:BiquadFilterType; q?:number; }
interface AmbientLayer { gain:GainNode; filter:BiquadFilterNode; }
/** Original procedural sound, synthesized after a permitted user gesture. No fetched recordings. */
export class AudioSystem {
  ctx:AudioContext|null=null;master:GainNode|null=null;drone:OscillatorNode|null=null;volume=.6;
  private paused=true;private noise:AudioBuffer|null=null;private pink:AudioBuffer|null=null;
  private fx:GainNode|null=null;private ambient:GainNode|null=null;private smallSend:GainNode|null=null;private largeSend:GainNode|null=null;
  private layers=new Map<string,AmbientLayer>();private threatGain:GainNode|null=null;
  private state:AudioState={x:0,z:0,yaw:0,zone:'mansion',danger:0,stamina:100,hidden:false,power:false};
  private time=0;private nextDrip=1.5;private nextBreath=.5;private nextHeart=.5;private nextDetail=5;private nextThunder=23;
  private activeVoices=0;private totalVoices=0;private spatialEvents=0;private events:Record<string,number>={};
  private profileKey='';
  private lastSpatial:{name:string;pan:number;distance:number;gain:number}|null=null;
  start(volume:number){
    this.volume=clampAudio(volume,0,1,.6);this.paused=false;
    if(this.ctx){void this.ctx.resume();this.setVolume(this.volume);return;}
    this.ctx=new AudioContext();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.volume;
    // Limit dense overlapping scares and gunshots without replacing the player's volume setting.
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.24;
    this.master.connect(limiter).connect(c.destination);
    this.fx=c.createGain();this.fx.gain.value=.85;this.fx.connect(this.master);
    this.ambient=c.createGain();this.ambient.gain.value=1;this.ambient.connect(this.master);
    this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);this.pink=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
    const white=this.noise.getChannelData(0),pink=this.pink.getChannelData(0);let slow=0;
    for(let i=0;i<white.length;i++){const sample=Math.random()*2-1;white[i]=sample*.8;slow=(slow+sample*.045)/1.035;pink[i]=slow*3.2;}
    this.smallSend=this.reverb(.75,.12);this.largeSend=this.reverb(2.6,.1);
    this.loop('wind',this.pink,330,.025,'lowpass');this.loop('rain',this.noise,4300,.015,'lowpass');
    this.loop('room',this.pink,190,.05,'lowpass');this.loop('machine',this.noise,230,.003,'bandpass');this.loop('water',this.noise,1800,.003,'bandpass');
    this.drone=c.createOscillator();this.drone.type='sine';this.drone.frequency.value=47;
    const droneGain=c.createGain();droneGain.gain.value=.022;this.drone.connect(droneGain).connect(this.ambient);this.drone.start();
    this.threatGain=c.createGain();this.threatGain.gain.value=.0001;this.threatGain.connect(this.master);
    for(const frequency of [38,57.2,76.5]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=.28;o.connect(g).connect(this.threatGain);o.start();}
    this.applyEnvironment();
  }
  setVolume(value:number){this.volume=clampAudio(value,0,1,.6);if(this.master&&this.ctx)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.06);}
  pause(){this.paused=true;void this.ctx?.suspend();}
  resume(){this.paused=false;void this.ctx?.resume();}
  private reverb(seconds:number,level:number){
    const c=this.ctx!,send=c.createGain(),convolver=c.createConvolver(),wet=c.createGain(),damp=c.createBiquadFilter();
    const impulse=c.createBuffer(2,Math.floor(c.sampleRate*seconds),c.sampleRate);
    let seed=1347;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    for(let ch=0;ch<2;ch++){const samples=impulse.getChannelData(ch);for(let i=0;i<samples.length;i++){const t=i/c.sampleRate;samples[i]=t<.014?0:(random()*2-1)*Math.pow(1-i/samples.length,seconds>1?3.4:2.5)*.22;}}
    convolver.buffer=impulse;send.gain.value=level;wet.gain.value=.72;damp.type='lowpass';damp.frequency.value=3900;
    this.fx!.connect(send).connect(convolver).connect(damp).connect(wet).connect(this.master!);return send;
  }
  private loop(name:string,buffer:AudioBuffer|null,cutoff:number,gain:number,type:BiquadFilterType){
    const c=this.ctx!,source=c.createBufferSource(),filter=c.createBiquadFilter(),volume=c.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=cutoff;filter.Q.value=.5;volume.gain.value=gain;source.connect(filter).connect(volume).connect(this.ambient!);source.start(0,Math.random());this.layers.set(name,{gain:volume,filter});
  }
  private applyEnvironment(){
    if(!this.ctx)return;const {zone,power,danger,hidden}=this.state,t=this.ctx.currentTime;const key=`${zone}:${power}:${hidden}:${Math.round(clampAudio(danger,0,1)*10)}`;if(key===this.profileKey)return;this.profileKey=key;
    const profiles:Record<AudioZone,Record<string,number>>={
      mansion:{wind:.018,rain:.017,room:.05,machine:.001,water:.001},
      lab:{wind:.008,rain:.005,room:.03,machine:power?.045:.012,water:.002},
      tunnel:{wind:.012,rain:.002,room:.038,machine:power?.012:.003,water:.015},
      forest:{wind:.095,rain:.085,room:.006,machine:0,water:.003},
      chapel:{wind:.017,rain:.012,room:.044,machine:.002,water:.001}
    };
    for(const [name,layer]of this.layers)layer.gain.gain.setTargetAtTime(profiles[zone][name]??0,t,.65);
    this.smallSend?.gain.setTargetAtTime(zone==='forest'?.025:zone==='tunnel'?.09:.15,t,.5);
    this.largeSend?.gain.setTargetAtTime(zone==='tunnel'?.34:zone==='chapel'?.25:zone==='forest'?.015:.08,t,.5);
    this.threatGain?.gain.setTargetAtTime(.0001+clampAudio(danger,0,1)*.055,t,.5);
    this.ambient?.gain.setTargetAtTime(hidden?.65:1-clampAudio(danger,0,1)*.22,t,.3);
  }
  update(dt:number,state:AudioState){
    this.state={...state,danger:clampAudio(state.danger,0,1),stamina:clampAudio(state.stamina,0,100,100),zone:['mansion','lab','tunnel','forest','chapel'].includes(state.zone)?state.zone:'mansion'};
    state=this.state;if(!this.ctx||this.paused||this.ctx.state!=='running')return;
    this.time+=clampAudio(dt,0,.25);this.applyEnvironment();
    if(this.time>this.nextHeart){if(state.danger>.2)this.play('heartbeat',.45+state.danger*.4);this.nextHeart=this.time+(1.05-state.danger*.42);}
    if(this.time>this.nextBreath){if(state.stamina<45&&!state.hidden)this.play('breath',(45-state.stamina)/45);this.nextBreath=this.time+(state.stamina<20?1.15:1.7);}
    if(this.time>this.nextDrip){if(state.zone==='tunnel'){const p=this.state;this.positional('knock',{x:p.x+3+Math.random()*4,z:p.z-3},p,.12);this.note(1100+Math.random()*450,.22,.018,'sine',800,{pan:(Math.random()-.5)*1.4});}this.nextDrip=this.time+2+Math.random()*3;}
    if(this.time>this.nextDetail){
      if(state.zone==='forest'){this.noiseVoice(.35,.012,2800,{filter:'bandpass',q:3,pan:(Math.random()-.5)*1.6});}
      else if(state.zone!=='lab'){this.positional('creak',{x:state.x+5*(Math.random()>.5?1:-1),z:state.z-5},state,.2);}
      this.nextDetail=this.time+8+Math.random()*10;
    }
    if(this.time>this.nextThunder){if(state.zone==='forest')this.play('thunder',.45);this.nextThunder=this.time+25+Math.random()*20;}
  }
  private ready(){return !!(this.ctx&&this.fx&&!this.paused&&this.ctx.state!=='closed'&&this.activeVoices<96);}
  private finish(source:AudioScheduledSourceNode,nodes:AudioNode[]){
    this.activeVoices++;this.totalVoices++;source.onended=()=>{source.disconnect();for(const node of nodes)node.disconnect();this.activeVoices=Math.max(0,this.activeVoices-1);};
  }
  private note(freq:number,duration:number,volume:number,type:OscillatorType='sine',end=freq,options:VoiceOptions={}){
    if(!this.ready())return;const c=this.ctx!,at=c.currentTime+Math.max(0,options.delay??0),length=clampAudio(duration,.025,8,.2),osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter(),pan=c.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(clampAudio(freq,12,18000,100),at);osc.frequency.exponentialRampToValueAtTime(clampAudio(end,12,18000,100),at+length);
    filter.type='lowpass';filter.frequency.value=options.cutoff??8000;pan.pan.value=clampAudio(options.pan??0,-1,1);const peak=clampAudio(volume,.0001,.8,.05),attack=Math.min(length*.3,options.attack??.008);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(peak,at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    osc.connect(filter).connect(gain).connect(pan).connect(this.fx!);this.finish(osc,[filter,gain,pan]);osc.start(at);osc.stop(at+length+.015);
  }
  private noiseVoice(duration:number,volume:number,frequency:number,options:VoiceOptions={},pink=false){
    if(!this.ready()||!this.noise)return;const c=this.ctx!,at=c.currentTime+Math.max(0,options.delay??0),length=clampAudio(duration,.02,8,.2),source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),pan=c.createStereoPanner();
    source.buffer=pink?this.pink:this.noise;source.loop=true;filter.type=options.filter??'lowpass';filter.frequency.value=clampAudio(Math.min(frequency,options.cutoff??18000),50,18000,900);filter.Q.value=options.q??.7;pan.pan.value=clampAudio(options.pan??0,-1,1);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(clampAudio(volume,.0001,.8,.05),at+Math.min(length*.35,options.attack??.006));gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    source.connect(filter).connect(gain).connect(pan).connect(this.fx!);this.finish(source,[filter,gain,pan]);source.start(at,Math.random());source.stop(at+length+.015);
  }
  tone(freq:number,duration:number,volume=.2,type:OscillatorType='sine',end=50){this.note(freq,duration,volume,type,end);}
  burst(duration:number,volume:number,frequency=1000){this.noiseVoice(duration,volume,frequency);}
  private count(name:string){this.events[name]=(this.events[name]??0)+1;}
  private bell(frequency:number,strength:number,options:VoiceOptions={}){
    for(const [ratio,gain,decay]of [[1,.15,2.8],[2.01,.07,1.7],[2.74,.035,1.25],[3.76,.018,.8],[5.4,.01,.35]])this.note(frequency*ratio,decay,gain*strength,'sine',frequency*ratio,options);
    this.noiseVoice(.025,.03*strength,6000,options);
  }
  play(name:SoundName,strength=1){
    if(!this.ready())return;this.count(name);const s=clampAudio(strength,0,1.5,1),v=Math.max(.0001,s);
    switch(name){
      case 'shot':
        this.noiseVoice(.045,.66,9200);this.noiseVoice(.19,.27,2400,{delay:.012});this.note(125,.18,.28,'triangle',38);this.noiseVoice(.8,.06,1050,{delay:.045,pan:-.28},true);this.noiseVoice(.38,.05,2200,{delay:.07,pan:.42});break;
      case 'step':{
        const outdoor=this.state.zone==='forest',metal=this.state.zone==='lab',hard=this.state.zone==='tunnel'||this.state.zone==='chapel';
        this.noiseVoice(outdoor?.18:metal?.09:.12,(outdoor?.13:.1)*v,outdoor?1900:metal?2900:hard?1400:720,{pan:(Math.random()-.5)*.16},!metal);
        this.note(metal?170:hard?95:65,.095,.055*v,'sine',35);if(metal)this.note(670,.13,.013*v,'sine',630);break;
      }
      case 'reload':this.noiseVoice(.055,.15,5300);this.noiseVoice(.08,.2,3400,{delay:.65});this.note(210,.035,.055,'triangle',100,{delay:1.18});this.noiseVoice(.045,.12,4600,{delay:1.19});break;
      case 'hit':this.noiseVoice(.16,.22,1100,{},true);this.note(85,.24,.14,'sine',30);break;
      case 'pickup':this.noiseVoice(.06,.065,1600);this.note(510,.16,.045,'sine',580);break;
      case 'switch':this.noiseVoice(.035,.14,3200);this.note(125,.07,.055,'triangle',65);break;
      case 'empty':this.noiseVoice(.025,.11,5300);this.note(750,.025,.025,'sine',350);break;
      case 'win':this.note(164.8,3,.09,'sine',164.8);this.note(246.9,3.4,.06,'sine',246.9,{delay:.12});this.note(329.6,3.8,.045,'sine',329.6,{delay:.3});break;
      case 'decoy':for(let i=0;i<5;i++)this.noiseVoice(.08+i*.025,.15/(1+i*.35),6000-i*700,{delay:i*.045,pan:(i%2?1:-1)*.35});break;
      case 'growl':this.growl(v,{});break;
      case 'bell':this.bell(330,v);break;
      case 'thunder':this.noiseVoice(2.8,.17*v,300,{attack:.16,pan:-.3},true);this.note(39,1.8,.065*v,'sine',24,{delay:.12});this.noiseVoice(1.7,.08*v,550,{delay:.45,attack:.2,pan:.4},true);break;
      case 'door':this.noiseVoice(.16,.15*v,650,{},true);this.note(75,.35,.08*v,'triangle',30);this.note(240,.6,.025*v,'sawtooth',110,{cutoff:850});break;
      case 'heartbeat':this.note(58,.13,.075*v,'sine',38);this.note(52,.11,.052*v,'sine',34,{delay:.18});break;
      case 'breath':this.noiseVoice(.64,.06*v,900,{filter:'bandpass',q:.65,attack:.11});this.noiseVoice(.7,.045*v,1400,{filter:'bandpass',q:.7,attack:.12,delay:.75});break;
      case 'sting':this.noiseVoice(.65,.14*v,2000,{filter:'bandpass',q:1.2,attack:.02});this.note(147,.7,.065*v,'sawtooth',102,{cutoff:1400});this.note(155,.8,.055*v,'sine',111);break;
      case 'ritual':for(const [i,f]of [110,164.81,220,261.63].entries())this.note(f,3,.065*v,'sine',f,{delay:i*.14});this.bell(440,.55*v,{delay:.2});break;
      case 'secret':this.bell(392,.55*v);this.bell(523.25,.4*v,{delay:.2});break;
    }
  }
  private growl(strength:number,options:VoiceOptions){this.note(66,.95,.1*strength,'sawtooth',35,{...options,cutoff:Math.min(options.cutoff??650,650),attack:.08});this.note(101,.75,.04*strength,'sine',48,{...options,delay:.04,attack:.1});this.noiseVoice(.8,.12*strength,420,{...options,filter:'bandpass',q:1,attack:.06},true);}
  positional(name:PositionalSound,position:AudioPoint,listener:AudioListenerPoint,strength=1){
    if(!this.ready())return;const mix=spatialMix(position,listener);if(mix.distance>42||mix.gain<=0)return;
    this.spatialEvents++;this.count(name);this.lastSpatial={name,...mix};const gain=mix.gain*clampAudio(strength,0,1.5,1),options:VoiceOptions={pan:mix.pan,cutoff:mix.cutoff};
    switch(name){
      case 'enemy-step':this.noiseVoice(.13,.25*gain,650,options,true);this.note(57,.15,.11*gain,'sine',28,options);break;
      case 'growl':this.growl(gain,options);break;
      case 'knock':this.noiseVoice(.045,.2*gain,1400,options);this.note(170,.12,.13*gain,'triangle',70,options);break;
      case 'creak':this.note(170,.9,.045*gain,'sawtooth',95,{...options,attack:.15,cutoff:Math.min(mix.cutoff,600)});this.noiseVoice(.7,.07*gain,650,{...options,filter:'bandpass',q:2,attack:.12},true);break;
      case 'whisper':for(const [i,f]of [1100,1800,1300].entries())this.noiseVoice(.55,.07*gain,f,{...options,delay:i*.22,filter:'bandpass',q:2,attack:.12});break;
      case 'bell':this.bell(330+Math.abs(Math.round(position.x*19+position.z*13)%3)*110,gain,options);break;
    }
  }
  debugStats(){return {state:this.ctx?.state??'not-started',paused:this.paused,zone:this.state.zone,activeVoices:this.activeVoices,totalVoices:this.totalVoices,spatialEvents:this.spatialEvents,events:{...this.events},lastSpatial:this.lastSpatial?{...this.lastSpatial}:null,procedural:true};}
}
