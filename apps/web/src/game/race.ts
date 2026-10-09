import { practiceRules } from './raceRules';
import type { BoatState } from '@rapidhelm/wasm-bridge';
export interface RaceGate { id:number;x:number;z:number;yaw:number;width:number;direction:'upstream'|'downstream';progress?:number; }
export interface RaceSnapshot {phase:'ready'|'racing'|'finished';elapsed:number;penalty:number;total:number;nextId:number|null;passed:number;missed:number;message:string;outcomes:readonly ('pending'|'passed'|'missed')[];}
const plane=(p:BoatState,g:RaceGate)=>(p.x-g.x)*Math.sin(g.yaw)+(p.z-g.z)*Math.cos(g.yaw);
function crossing(a:BoatState,b:BoatState,g:RaceGate,direction:number) {
  const da=plane(a,g)*direction,db=plane(b,g)*direction;
  if(da>=0 || db<0)return null;
  const t=da/(da-db),x=a.x+(b.x-a.x)*t-g.x,z=a.z+(b.z-a.z)*t-g.z;
  return {t,lateral:x*Math.cos(g.yaw)-z*Math.sin(g.yaw)};
}
function touches(a:BoatState,b:BoatState,g:RaceGate) {
  // Swept planar capsule proxy. Athlete/paddle height judging is a future refinement.
  const travel=Math.hypot(b.x-a.x,b.z-a.z)+1.48*Math.abs(b.yaw-a.yaw),steps=Math.max(1,Math.ceil(travel/.08));
  for(let step=0;step<=steps;step++) {
    const t=step/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,yaw=a.yaw+(b.yaw-a.yaw)*t,s=Math.sin(yaw),c=Math.cos(yaw);
    for(const side of [-1,1]) {
      const px=g.x+side*(g.width+.045)/2*Math.cos(g.yaw),pz=g.z-side*(g.width+.045)/2*Math.sin(g.yaw);
      const along=Math.max(-1.48,Math.min(1.48,(px-x)*s+(pz-z)*c));
      if(Math.hypot(x+along*s-px,z+along*c-pz)<.4425+.04)return true;
    }
  }
  return false;
}
export function createRace(gates:readonly RaceGate[],finishProgress:number,rules=practiceRules) {
  let phase:RaceSnapshot['phase']='ready',start=0,elapsed=0,message='Paddle to gate 1 to start';
  const outcomes:('pending'|'passed'|'missed')[]=gates.map(()=>'pending'),penalties=gates.map(()=>0);
  const miss=(i:number)=>{if(outcomes[i]==='pending'){outcomes[i]='missed';penalties[i]=rules.missPenalty;message=`Gate ${gates[i].id} missed · +${rules.missPenalty} s`;}};
  const snapshot=():RaceSnapshot=>{const penalty=penalties.reduce((a,b)=>a+b,0);return {phase,elapsed,penalty,total:elapsed+penalty,nextId:gates[outcomes.indexOf('pending')]?.id??null,passed:outcomes.filter(s=>s==='passed').length,missed:outcomes.filter(s=>s==='missed').length,message,outcomes:[...outcomes]};};
  return {
    reset(){phase='ready';start=0;elapsed=0;message='Paddle to gate 1 to start';outcomes.fill('pending');penalties.fill(0);},
    snapshot,
    step(a:BoatState,b:BoatState,time:number,dt:number,progress:number){
      if(phase==='finished' || !gates.length)return;
      if(phase==='ready') {const c=crossing(a,b,gates[0],1);if(!c)return;phase='racing';start=time-dt+c.t*dt;message='Run started';}
      elapsed=Math.max(0,time-start);
      for(let i=0;i<gates.length;i++) {
        if(outcomes[i]==='missed')continue;
        const da=plane(a,gates[i]),db=plane(b,gates[i]);
        if(!penalties[i] && (Math.min(Math.abs(da),Math.abs(db))<4 || da*db<=0) && touches(a,b,gates[i])) {penalties[i]=rules.touchPenalty;message=`Gate ${gates[i].id} touched · +${rules.touchPenalty} s`;}
        if(outcomes[i]!=='pending')continue;
        const direction=gates[i].direction==='upstream' ? -1:1;
        const wrong=crossing(a,b,gates[i],-direction);
        if(wrong && Math.abs(wrong.lateral)<gates[i].width/2) {miss(i);continue;}
        const c=crossing(a,b,gates[i],direction);
        if(c && Math.abs(c.lateral)<gates[i].width/2) {
          // Negotiating a later gate closes earlier pending gates, preserving sequence.
          for(let earlier=0;earlier<i;earlier++)miss(earlier);
          outcomes[i]='passed';message=`Gate ${gates[i].id} complete${penalties[i] ? ` · +${rules.touchPenalty} s` : ' · clean'}`;
        }
      }
      for(let i=0;i<gates.length;i++)if(outcomes[i]==='pending' && gates[i].progress!==undefined && progress>gates[i].progress!+rules.recoveryDistance)miss(i);
      if(progress>=finishProgress){for(let i=0;i<gates.length;i++)miss(i);phase='finished';message='Run finished';}
    },
  };
}
