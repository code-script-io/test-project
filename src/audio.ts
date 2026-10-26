export class AudioSystem {
  ctx:AudioContext|null=null; master:GainNode|null=null; drone:OscillatorNode|null=null; volume=.6; private noise:AudioBuffer|null=null;
  start(volume:number){
    this.volume=volume;
    if(this.ctx){void this.ctx.resume();this.setVolume(volume);return;}
    this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=volume;this.master.connect(this.ctx.destination);
    this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);const data=this.noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.08)/1.02;data[i]=last;}
    this.drone=this.ctx.createOscillator();this.drone.type='sine';this.drone.frequency.value=43;
    const g=this.ctx.createGain();g.gain.value=.07;this.drone.connect(g).connect(this.master);this.drone.start();
    const wind=this.ctx.createBufferSource();wind.buffer=this.noise;wind.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;const wg=this.ctx.createGain();wg.gain.value=.13;wind.connect(filter).connect(wg).connect(this.master);wind.start();
  }
  setVolume(v:number){this.volume=v;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.1);}
  pause(){void this.ctx?.suspend();}
  resume(){void this.ctx?.resume();}
  tone(freq:number,duration:number,volume=.2,type:OscillatorType='sine',end=50){if(!this.ctx||!this.master)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(this.master);o.start();o.stop(t+duration);}
  burst(duration:number,volume:number,frequency=1000){if(!this.ctx||!this.master||!this.noise)return;const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter(),t=this.ctx.currentTime;s.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(f).connect(g).connect(this.master);s.start();s.stop(t+duration);}
  play(name:'shot'|'step'|'hit'|'pickup'|'reload'|'growl'|'switch'|'empty'|'win'|'decoy',strength=1){
    switch(name){case 'shot':this.burst(.24,.95,6000);this.tone(110,.16,.25,'triangle',38);break;
      case 'step':this.burst(.11,.2*strength,500);break;case 'hit':this.tone(90,.3,.3,'sawtooth',24);this.burst(.25,.3);break;
      case 'pickup':this.tone(540,.22,.15,'sine',860);break;case 'reload':this.burst(.15,.3,2200);break;
      case 'growl':this.tone(85,.8,.22*strength,'sawtooth',33);break;case 'switch':this.tone(180,.15,.15,'square',95);break;
      case 'empty':this.tone(300,.04,.1,'square',120);break;case 'win':this.tone(220,1.7,.22,'sine',660);break;case 'decoy':this.burst(.4,.5,3200);break;}
  }
}
