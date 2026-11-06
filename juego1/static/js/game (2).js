'use strict';
/* ===== VÓLEY ARENA — juego 2.5D en canvas ===== */
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),$=id=>document.getElementById(id);
const W=1280,H=720;cv.width=W;cv.height=H;
const P=62,G=9,NET=2.43,R=.21,HALF=9,GY=540,SKIN='#f0c8a0';
const CF={
 6:{SL:{1:8,6:6.8,5:5.5,4:1.8,3:2.8,2:3.8},LN:{1:1,6:0,5:-1,4:-1,3:0,2:1},NX:{2:1,1:5,5:4,4:3,3:2},FR:[2,3,4],
    R:['Colocador','Atacante','Central','Opuesto','Central','Líbero'],S:[2,4,3,1,5,6],N:[7,9,4,12,5,1]},
 3:{SL:{1:7.5,3:5,2:2.5},LN:{1:1,3:0,2:-1},NX:{2:1,1:3,3:2},FR:[2,3],R:['Colocador','Atacante','Defensor'],S:[2,3,1],N:[7,9,5]}};
const ABR={Colocador:'CO',Atacante:'AT',Central:'CE',Opuesto:'OP',Líbero:'LI',Defensor:'DE'};
const MODES={quick:{n:6,target:15,label:'Partido rápido'},v3:{n:3,target:25,label:'3 contra 3'},v6:{n:6,target:25,label:'6 contra 6'},
 tour:{n:6,target:15,label:'Torneo'},train:{n:3,target:0,train:1,label:'Entrenamiento'}};
const OPP=[{n:'Tigres',c:'#e8403f',a:'#ffd23f'},{n:'Halcones',c:'#1faa59',a:'#fff'},{n:'Dragones',c:'#8e44ec',a:'#ffe08a'}];
const KM={KeyZ:'bump',KeyJ:'bump',KeyX:'set',KeyK:'set',KeyC:'spike',KeyL:'spike',KeyV:'block',KeyB:'block'};
const keys={},cfg={auto:true,paused:false},cam={x:0,z:1.05,shake:0,flash:0};
let S=null,cur='quick',tour=null,parts=[],last=0,tt=0;
const crowd=[];for(let r=0;r<7;r++)for(let i=0;i<60;i++)crowd.push({x:i*21.7+(r%2)*10,r,c:`hsl(${Math.random()*360|0},60%,${40+Math.random()*25|0}%)`,ph:Math.random()*6});

/* ---------- utilidades ---------- */
let AC;function snd(f,d=.1,t='sine',v=.12){try{AC=AC||new AudioContext();const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}
const D=()=>S.o.diff,hp=t=>t.players[t.ctrl],opp=t=>S.teams[t===S.teams[0]?1:0],home=p=>p.t.side*p.t.c.SL[p.slot];
function aim(x0,y0,tx,ty,T0,clr){let T=T0,vx,vy;for(;T<3.5;T+=.05){vx=(tx-x0)/T;vy=(ty-y0+.5*G*T*T)/T;if(!clr||x0*tx>=0)break;const tn=-x0/vx;if(tn<=0||tn>=T)break;if(y0+vy*tn-.5*G*tn*tn>NET+R+.2)break}return[vx,vy]}
function pred(b,y){const d=b.vy*b.vy+2*G*(b.y-y),t=d<0?Math.max(0,b.vy/G):(b.vy+Math.sqrt(d))/G;return{x:b.x+b.vx*t,t}}
function fx(x,y,n,c,sp=4,life=.6){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=Math.random()*sp;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s+1,l:life*(.5+Math.random()),L:life,c,s:2+Math.random()*3})}}
function toast(m,t=1.4){S.msg=m;S.msgT=t}
function hitPt(p,k){const f=-p.t.side;
 if(k==='bump')return{x:p.x+f*.35,y:p.y+.75,r:.85};
 if(k==='set')return{x:p.x+f*.12,y:p.y+2.15,r:.75};
 if(k==='spike')return{x:p.x+f*.3,y:p.y+2.6,r:.95};
 return{x:p.x+f*.15,y:p.y+2.7,r:1.05}}

/* ---------- equipos y partido ---------- */
function mkTeam(side,n,color,alt,name,human){
 const c=CF[n],t={side,n,c,color,alt,name,human,pts:0,touches:0,ctrl:0,players:[],hitter:null,blocker:null,chK:-1,blockK:-1,chaser:null,bj:null,react:0,lx:0};
 c.R.forEach((r,i)=>t.players.push({t,role:r,slot:c.S[i],num:c.N[i],x:0,y:0,vy:0,vx:0,sp:0,act:null,actT:0,actD:1,cool:0,anim:Math.random()*6,dk:0}));
 return t}
function startMatch(o){
 const t0=mkTeam(-1,o.n,'#2f6df6','#ffd23f','Tú',true),t1=mkTeam(1,o.n,o.opp.c,o.opp.a,o.opp.n,false);
 if(o.train)t1.players=[];
 S={o,teams:[t0,t1],ball:{x:0,y:2,vx:0,vy:0,team:null,lastP:null,rot:0,state:'held',trail:[],fire:false},phase:'ready',server:t0,time:0,msg:'',msgT:0,freeze:0,timer:0,rally:0,ok:0,err:0,over:false,hitId:0,cheer:0};
 $('menu').classList.add('hidden');$('ov').classList.add('hidden');$('hud').classList.remove('hidden');
 $('n0').textContent=o.train?'Aciertos':'Tú';$('n1').textContent=o.train?'Errores':o.opp.n;
 $('info').textContent=o.label+(o.train?'':' · a '+o.target);
 newRally()}
function newRally(){
 const b=S.ball;S.phase='ready';S.timer=0;S.rally=0;
 S.teams.forEach(t=>{t.touches=0;t.hitter=t.blocker=t.chaser=null;t.chK=t.blockK=-1;t.bj=null;t.players.forEach(p=>{p.act=null;p.y=p.vy=p.vx=0;p.cool=0;p.x=home(p)})});
 b.team=b.lastP=null;b.vx=b.vy=0;b.state='held';b.trail=[];b.fire=false;
 if(S.o.train){S.phase='feed';S.timer=1.2;b.x=-30;b.y=-5;return}
 const t=S.server,sp=t.players.find(p=>p.slot===1);sp.x=t.side*(HALF+1.5);t.srv=sp;
 if(t.human)t.ctrl=t.players.indexOf(sp);
 toast(t.human?'¡Tu saque!':'Saca '+t.name,1.2)}
function rotate(t){t.players.forEach(p=>{if(p.role!=='Líbero')p.slot=t.c.NX[p.slot]})}
function feed(){const b=S.ball,tx=-(2+Math.random()*6.5);b.x=10.5;b.y=3.2;[b.vx,b.vy]=aim(b.x,b.y,tx,0,1.5,true);b.team=S.teams[1];b.state='live';S.phase='play';S.hitId++}

/* ---------- reglas ---------- */
function point(w,why){
 if(S.phase!=='play')return;
 S.phase='point';S.timer=2.2;S.cheer=1;S.freeze=0;toast(why,2.1);snd(900,.45,'square',.08);
 const l=opp(w);
 if(S.o.train){w===S.teams[0]?S.ok++:S.err++;S.timer=1.5;return}
 w.pts++;if(w!==S.server){rotate(w);S.server=w;S.msg+=' · rotación'}
 if(w===S.teams[0])for(let i=0;i<5;i++)fx(Math.random()*12-6,6,14,['#ffd23f','#fff','#2f6df6','#ff5a5a'][i%4],3,1.6);
 if(w.pts>=S.o.target&&w.pts-l.pts>=2){S.over=true;S.winner=w}}
function fault(t,m){point(opp(t),'Falta: '+m)}
function land(){
 const b=S.ball;snd(120,.15,'triangle',.25);fx(b.x,.1,10,'#d9b98a',2.5,.5);cam.shake=Math.max(cam.shake,3);
 if(S.phase!=='play')return;
 const inn=Math.abs(b.x)<=HALF+R*.6;
 if(inn){const w=S.teams[b.x<0?1:0];point(w,b.team===opp(w)&&b.x*b.team.side>0?'Balón no cruza la red':'¡Punto!')}
 else point(b.team?opp(b.team):opp(S.server),'¡Pelota fuera!')}

/* ---------- golpes ---------- */
const dirKey=p=>{const h=((keys.ArrowRight||keys.KeyD)?1:0)-((keys.ArrowLeft||keys.KeyA)?1:0);return h===0?0:(h===-p.t.side?1:-1)};
function begin(p,k){p.act=k;p.actD=p.actT=(k==='spike'||k==='block')?.55:.32}
function jump(p){if(p.y<=0&&p.vy===0)p.vy=6.4}
function humanAct(k){
 if(!S||S.over||cfg.paused||S.phase==='point'||S.phase==='feed')return;
 const t=S.teams[0],p=hp(t);if(!p)return;
 if(S.phase==='ready'){if(k==='spike'&&S.server===t&&p===t.srv){p.dk=dirKey(p);serveStart(p)}return}
 if(p.act||p.cool>0)return;p.dk=dirKey(p);
 if(k==='spike'||k==='block')jump(p);begin(p,k)}
function serveStart(p){
 const b=S.ball,t=p.t;if(S.phase!=='ready'||t!==S.server||p!==t.srv)return;
 S.phase='play';b.state='toss';b.team=null;b.x=p.x-t.side*.3;b.y=1.5;b.vx=0;b.vy=6.2;p.act='serve';p.actT=p.actD=1;S.hitId++;snd(500,.08)}
function serveHit(){
 const t=S.server,p=t.srv,b=S.ball;
 const d=(p.dk>0?2.6:p.dk<0?8:5.2)+(Math.random()-.5)*(2.4-D()*.8),e=Math.random();let tx=-t.side*d,clr=true;
 if(e<.05)tx=-t.side*(HALF+1.4);else if(e<.09)clr=false,tx=-t.side*2;
 [b.vx,b.vy]=aim(b.x,b.y,tx,0,.8,clr);
 b.state='live';b.team=t;b.lastP=p;b.fire=false;t.touches=0;p.act=null;p.cool=.4;S.hitId++;fx(b.x,b.y,8,'#fff',3);snd(260,.12,'square',.15)}
function bestSpot(o){let best=5,bd=-1;[2,3.5,5,6.5,8].forEach(d=>{let m=9;o.players.forEach(q=>m=Math.min(m,Math.abs(Math.abs(q.x)-d)));m+=Math.random()*1.5;if(m>bd){bd=m;best=d}});return best}
function pickHitter(t,p){
 const c=t.players.filter(q=>q!==p&&q.role!=='Líbero'&&(t.n===3||t.c.FR.includes(q.slot)));
 if(!c.length)return p;const pref=p.dk>0?'Central':p.dk<0?'Opuesto':null;
 return(pref&&c.find(q=>q.role===pref))||c[Math.random()*c.length|0]}
function doHit(p,k,dist){
 const t=p.t,b=S.ball,o=opp(t),s=t.side,hu=t.human&&p===hp(t);
 if((k==='spike'||k==='block')&&Math.abs(p.x)<.62)return fault(t,'toque de red');
 if(k==='block'){
  b.vx=-s*(2.5+Math.abs(b.vx)*.5);b.vy=-Math.abs(b.vy)*.5-1.5;b.x=-s*.35;b.y=Math.max(b.y,NET+R+.1);
  b.team=t;b.lastP=null;t.touches=0;o.touches=0;b.fire=false;p.act=null;p.cool=.3;S.hitId++;
  fx(b.x,b.y,22,'#9fe8ff',7);S.freeze=.08;cam.shake=12;cam.flash=.4;S.cheer=Math.max(S.cheer,.7);toast('¡BLOQUEO!',1);snd(90,.25,'sawtooth',.22);return}
 if(b.team!==t)t.touches=0;
 if(b.lastP===p)return fault(t,'doble toque');
 const n=++t.touches;if(n>3)return fault(t,'cuatro toques');
 let err=(hu?.35:1.25-.45*D())*(.5+dist);
 if((k==='bump'&&n===2)||(k==='set'&&n===1))err*=1.5;if(k==='set'&&n===2)err*=.7;
 const J=a=>(Math.random()-.5)*a*err;let tx,ty=0,T=1,clr=false;
 if(k==='spike'){tx=-s*(hu?(p.dk>0?2.4:p.dk<0?8:5.2):bestSpot(o))+J(1.2);T=b.y>2.4?.38:.65;clr=true}
 else if(n===1){tx=s*(1.9+(hu&&p.dk<0?1.6:0))+J(1.4);ty=2.7;T=.9+Math.abs(tx-b.x)*.05}
 else if(n===2){const h=pickHitter(t,p);t.hitter=h;tx=s*({Central:1.1,Atacante:1.8,Opuesto:2.5}[h.role]||1.7)+J(.9);ty=3.3;T=.85+Math.abs(tx-b.x)*.05}
 else{tx=-s*(2.8+Math.random()*3.5)+J(1);T=1.1;clr=true}
 [b.vx,b.vy]=aim(b.x,b.y,tx,ty,T,clr);
 b.team=t;b.lastP=p;b.fire=k==='spike';p.act=null;p.cool=.25;S.hitId++;S.rally++;
 fx(b.x,b.y,k==='spike'?20:6,k==='spike'?'#ffb020':'#fff',k==='spike'?8:3);
 if(k==='spike'){S.freeze=.06;cam.shake=9;cam.flash=.3;S.cheer=Math.max(S.cheer,.5);snd(150,.2,'sawtooth',.2);if(S.rally>6)toast('¡Rally de '+S.rally+'!',1)}
 else snd(k==='set'?420:300,.09,'triangle',.15)}

/* ---------- control humano e IA ---------- */
function human(t){
 const p=hp(t);if(!p||S.phase==='ready')return 0;
 if((keys.Space||keys.ArrowUp||keys.KeyW)&&!p.act)jump(p);
 return(((keys.ArrowRight||keys.KeyD)?1:0)-((keys.ArrowLeft||keys.KeyA)?1:0))*5.6}
function ai(t,dt){
 const b=S.ball,o=opp(t),f=-t.side,own=b.x*t.side>0,n=t.touches;let hu=t.human?hp(t):null;
 const live=S.phase==='play'&&b.state==='live';
 const mine=live&&((b.team!==t&&(own||b.vx*t.side>.1))||(b.team===t&&n<3&&own&&b.lastP));
 if(t.human&&S.phase==='play'&&b.state==='toss'&&S.server!==t){}
 if(mine&&t.chK!==S.hitId){
  t.chK=S.hitId;const y=n===0?.9:n===1?2.1:3.4,pr=pred(b,y);t.lx=pr.x;
  let c=t.players.filter(p=>p!==b.lastP);
  if(n===1){const s=c.filter(p=>p.role==='Colocador');if(s.length&&Math.abs(s[0].x-pr.x)<4)c=s}
  if(n===2&&t.hitter&&t.hitter!==b.lastP)c=[t.hitter];
  t.chaser=c.sort((a,z)=>Math.abs(a.x-pr.x)-Math.abs(z.x-pr.x))[0]||null;
  if(n===0&&Math.abs(pr.x)>HALF+.8)t.chaser=null;
  t.react=S.time+(.3-.12*D());
  if(t.human&&cfg.auto&&t.chaser&&!(hu&&hu.act))t.ctrl=t.players.indexOf(t.chaser);hu=hp(t)}
 if(live&&b.team===o&&o.touches===2&&t.blockK!==S.hitId&&Math.abs(b.x)<5){
  t.blockK=S.hitId;t.bj=null;
  const fr=t.players.filter(p=>p.role!=='Líbero'&&t.c.FR.includes(p.slot)&&p!==hu).sort((a,z)=>Math.abs(a.x-t.side*.95)-Math.abs(z.x-t.side*.95));
  t.blocker=Math.random()<.35+.3*D()?fr[0]||null:null}
 const bl=t.blocker;
 if(bl&&live&&b.team===o&&o.hitter&&o.hitter.y>.4){if(!t.bj)t.bj=S.time+.1+(1.2-D())*.12;if(S.time>=t.bj)jump(bl)}
 if(bl&&bl.y>.3&&!bl.act&&live&&b.team===o){const h=hitPt(bl,'block');if(Math.hypot(b.x-h.x,b.y-h.y)<h.r+.4)begin(bl,'block')}
 const c=t.chaser;
 if(c&&mine&&!c.act&&c.cool<=0&&c!==hu){
  const near=k=>{const h=hitPt(c,k);return Math.hypot(b.x-h.x,b.y-h.y)<h.r+.45};
  if(n===0){if(near('bump')&&b.vy<1)begin(c,'bump')}
  else if(n===1){if(b.y<1.5&&near('bump'))begin(c,'bump');else if(near('set'))begin(c,'set')}
  else{
   if(near('spike')&&c.y>.15)begin(c,'spike');
   else{const pr=pred(b,3.5);if(c.y<=0&&pr.t<.5&&pr.t>.15&&Math.abs(pr.x-c.x)<1.6&&b.vy<.5)jump(c)}
   if(!c.act&&b.y<1.7&&near('bump'))begin(c,'bump')}}
 t.players.forEach(p=>{
  let v=0;
  if(p===hu)v=human(t);
  else if(S.phase!=='ready'){
   let tx=home(p),sp=3.6+1.5*D();
   if(p===t.chaser&&mine&&S.time>=t.react){tx=t.lx-f*(n===2?.3:n===1?.15:.35);sp+=1.3}
   else if(p===bl&&live&&b.team===o)tx=t.side*.95;
   else if(p.role==='Colocador'&&live&&(b.team!==t||n<2)&&(own||b.vx*t.side>0))tx=t.side*1.9;
   else if(live&&!mine)tx+=Math.max(-1.2,Math.min(1.2,(b.x-tx)*.1));
   v=Math.max(-sp,Math.min(sp,(tx-p.x)*6))}
  phys(p,dt,v)})}
function phys(p,dt,v){
 const t=p.t;if(p.act==='serve')v=0;if(p.y>0||p.vy>0)v*=.7;
 p.vx+=(v-p.vx)*Math.min(1,dt*14);p.x+=p.vx*dt;const lim=HALF+2.5;
 p.x=t.side>0?Math.min(lim,Math.max(.5,p.x)):Math.max(-lim,Math.min(-.5,p.x));
 p.sp=Math.min(1,Math.abs(p.vx)/5);p.anim+=Math.abs(p.vx)*dt*1.8;
 if(p.vy!==0||p.y>0){p.vy-=15*dt;p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0}}
 if(p.act&&p.act!=='serve'){p.actT-=dt;if(p.actT<=0)p.act=null}
 p.cool=Math.max(0,p.cool-dt)}

/* ---------- pelota ---------- */
function ballStep(dt){
 const b=S.ball;
 if(b.state==='held'){const t=S.server;if(t&&t.srv){b.x=t.srv.x-t.side*.3;b.y=1.3}return}
 const px=b.x;b.vy-=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=1-.04*dt;b.rot+=b.vx*dt*2;
 if(b.state==='toss'&&b.vy<0&&b.y<2.55)serveHit();
 if(b.y<NET+R&&(Math.abs(b.x)<R||px*b.x<0)&&S.phase!=='point'){
  if(b.y>NET-.15){b.vy=Math.abs(b.vy)*.5+1;b.vx*=.5}
  else{const s=px<0?-1:1;b.x=s*(R+.01);b.vx=-b.vx*.3;b.vy*=.6}
  snd(200,.08,'square',.08)}
 if(b.y<=R){b.y=R;if(S.phase==='play')land();b.vy=Math.abs(b.vy)>1?Math.abs(b.vy)*.5:0;b.vx*=.75;b.fire=false}
 if(Math.hypot(b.vx,b.vy)>7){b.trail.push({x:b.x,y:b.y});if(b.trail.length>12)b.trail.shift()}else if(b.trail.length)b.trail.shift()}
function contacts(){
 const b=S.ball;if(S.phase!=='play'||b.state!=='live')return;
 for(const t of S.teams)for(const p of t.players){
  if(!p.act||p.act==='serve'||p.cool>0)continue;
  const h=hitPt(p,p.act),d=Math.hypot(b.x-h.x,b.y-h.y);if(d>h.r)continue;
  if(p.act==='block'){if(b.team===t||Math.abs(b.x)>2.6)continue}
  else if(b.x*t.side<-.15)continue;
  doHit(p,p.act,d/h.r);return}}

/* ---------- bucle ---------- */
function update(dt){
 if(!S||cfg.paused)return;
 cam.shake*=.9;cam.flash=Math.max(0,cam.flash-dt*2);S.cheer=Math.max(0,S.cheer-dt*.25);
 parts.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy-=9*dt;q.l-=dt});parts=parts.filter(q=>q.l>0);
 if(S.msgT>0){S.msgT-=dt;if(S.msgT<=0)$('toast').classList.remove('on')}
 if(S.freeze>0){S.freeze-=dt;return}
 S.time+=dt;
 if(S.phase==='ready'){S.timer+=dt;if(!S.server.human&&S.timer>1.3){S.server.srv.dk=[1,0,-1][Math.random()*3|0];serveStart(S.server.srv)}}
 if(S.phase==='feed'){S.timer-=dt;if(S.timer<=0)feed()}
 if(S.phase==='point'){S.timer-=dt;if(S.timer<=0){if(S.over){S.phase='end';endMatch()}else newRally()}}
 S.teams.forEach(t=>{if(t.players.length)ai(t,dt)});
 if(S.phase!=='end'){ballStep(dt);contacts()}
 const hs=S.teams[0].srv;
 if(S.phase==='ready'&&S.server.human&&hs&&hs.act!=='serve')hs.dk=dirKey(hs);
 if(S.phase==='play'&&S.ball.state==='toss'&&S.server.human)S.server.srv.dk=dirKey(S.server.srv)}
function endMatch(){
 const won=S.winner===S.teams[0],sc=S.teams[0].pts+' - '+S.teams[1].pts;
 if(cur==='tour'){
  if(won&&tour.stage<2)ov('¡Victoria! '+sc,'Siguiente rival: '+OPP[tour.stage+1].n,[['Continuar',()=>go('tour',tour.stage+1)],['Salir al menú',menu]]);
  else if(won)ov('🏆 ¡CAMPEÓN DEL TORNEO!','Final ganada '+sc,[['Jugar de nuevo',()=>go('tour',0)],['Menú',menu]]);
  else ov('Eliminado '+sc,'Cayste ante '+S.teams[1].name,[['Reintentar torneo',()=>go('tour',0)],['Menú',menu]])}
 else ov(won?'🏆 ¡Ganaste! '+sc:'Derrota '+sc,won?'¡Gran partido!':'Inténtalo otra vez',[['Revancha',()=>go(cur)],['Menú',menu]])}

/* ---------- render ---------- */
function arena(){
 const g=ctx.createLinearGradient(0,0,0,GY);g.addColorStop(0,'#090d1c');g.addColorStop(1,'#1d2a4a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const sh=-cam.x*P*.05,ch=S?S.cheer:0;
 for(let r=0;r<7;r++){ctx.fillStyle=r%2?'#202a48':'#2a3560';ctx.fillRect(0,50+r*38,W,38)}
 crowd.forEach(c=>{const bob=Math.sin(tt*4+c.ph)*(1.2+ch*8),x=((c.x+sh)%W+W)%W,y=80+c.r*38+bob;ctx.fillStyle=c.c;ctx.fillRect(x-7,y+5,14,16);ctx.fillStyle='#e8bd95';ctx.beginPath();ctx.arc(x,y,7,0,7);ctx.fill()});
 ctx.fillStyle='#0c1020';ctx.fillRect(0,326,W,200);
 const ad=ctx.createLinearGradient(0,400,0,470);ad.addColorStop(0,'#1a2a6c');ad.addColorStop(1,'#0d1740');ctx.fillStyle=ad;ctx.fillRect(0,400,W,70);
 ctx.fillStyle='#fff';ctx.font='900 26px Segoe UI';ctx.textAlign='left';
 for(let i=-1;i<6;i++){const x=((i*260+sh*2)%1560+1560)%1560-260;ctx.fillStyle=i%2?'#ffcf33':'#fff';ctx.fillText(i%2?'★ ARENA':'VÓLEY',x,445)}
 [[0,'#2f6df6'],[W,'#ff5a5a']].forEach(([x,c])=>{const r=ctx.createRadialGradient(x,0,10,x,0,520);r.addColorStop(0,c+'66');r.addColorStop(1,'#0000');ctx.fillStyle=r;ctx.fillRect(0,0,W,H)})}
function lerp(a,b,t){return a+(b-a)*t}
function net(){
 const nx=10,fx_=-10,ny=46,fy=-44,nh=NET*P*1.04,fh=NET*P*.93;
 ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(nx,ny);ctx.lineTo(nx,ny-nh);ctx.lineTo(fx_,fy-fh);ctx.lineTo(fx_,fy);ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1;ctx.beginPath();
 for(let k=0;k<=10;k++){const t=k/10,x=lerp(nx,fx_,t),y=lerp(ny,fy,t),h=lerp(nh,fh,t);ctx.moveTo(x,y);ctx.lineTo(x,y-h)}
 for(let j=0;j<=9;j++){const t=j/9;ctx.moveTo(nx,ny-nh*t);ctx.lineTo(fx_,fy-fh*t)}ctx.stroke();
 ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(nx,ny-nh);ctx.lineTo(fx_,fy-fh);ctx.stroke();
 ctx.strokeStyle='#bbb';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(nx,ny);ctx.lineTo(nx,ny-nh-8);ctx.moveTo(fx_,fy);ctx.lineTo(fx_,fy-fh-8);ctx.stroke()}
function court(){
 let g=ctx.createLinearGradient(0,-46,0,300);g.addColorStop(0,'#b97a3e');g.addColorStop(1,'#7d5226');ctx.fillStyle=g;ctx.fillRect(-2600,-46,5200,700);
 const A=HALF*P,fs=.93,fy=-44,ny=46;
 const poly=(x0,x1,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x0*fs,fy);ctx.lineTo(x1*fs,fy);ctx.lineTo(x1,ny);ctx.lineTo(x0,ny);ctx.fill()};
 poly(-A,A,'#2b6fc0');poly(-3*P,3*P,'#3a85d6');
 ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();
 ctx.moveTo(-A*fs,fy);ctx.lineTo(A*fs,fy);ctx.lineTo(A,ny);ctx.lineTo(-A,ny);ctx.closePath();
 ctx.moveTo(0,fy);ctx.lineTo(0,ny);[-3,3].forEach(m=>{ctx.moveTo(m*P*fs,fy);ctx.lineTo(m*P,ny)});ctx.stroke();
 ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=1;ctx.beginPath();for(let i=-40;i<=40;i++){ctx.moveTo(i*70*fs,fy);ctx.lineTo(i*70,ny)}ctx.stroke()}
function drawP(p){
 const t=p.t,f=-t.side,lane=t.c.LN[p.slot],gy=lane*16,x=p.x*P,y=gy-p.y*P,air=p.y>.05;
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,gy+2,17-p.y*5,5,0,0,7);ctx.fill();
 ctx.save();ctx.translate(x,y);ctx.scale(f,1);ctx.lineCap='round';ctx.lineJoin='round';
 const jc=p.role==='Líbero'?t.alt:t.color,tc=p.role==='Líbero'?'#111':'#fff';
 [-1,1].forEach(i=>{
  const ph=p.anim+(i>0?0:3.14),fxp=i*4+(air?i*5:Math.sin(ph)*14*p.sp),fyp=air?-8-(i>0?10:0):-Math.max(0,Math.cos(ph))*8*p.sp;
  ctx.strokeStyle=SKIN;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(i*4,-52);ctx.quadraticCurveTo(fxp*.5+(air?10:3),-26,fxp,fyp);ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(fxp+3,fyp,7,3.5,0,0,7);ctx.fill()});
 ctx.fillStyle=t.human?'#14213d':'#1b1b1b';ctx.fillRect(-10,-60,20,14);
 ctx.fillStyle=jc;ctx.beginPath();ctx.roundRect(-12,-102,24,46,5);ctx.fill();
 ctx.fillStyle=tc;ctx.font='bold 13px Segoe UI';ctx.textAlign='center';ctx.scale(f,1);ctx.fillText(p.num,0,-76);ctx.scale(f,1);
 ctx.fillStyle=SKIN;ctx.beginPath();ctx.arc(3,-113,11,0,7);ctx.fill();
 ctx.fillStyle='#3b2412';ctx.beginPath();ctx.arc(2,-115,11.5,3.3,6.1);ctx.fill();
 const arm=(ax,ay,hx,hy)=>{ctx.strokeStyle=SKIN;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(hx,hy);ctx.stroke()},a=p.act,pr=1-p.actT/p.actD,sy=-94;
 if(a==='bump'){arm(0,sy,24,-62);arm(2,sy,26,-60)}
 else if(a==='set'){arm(0,sy,10,-132);arm(3,sy,16,-130)}
 else if(a==='spike'){arm(0,sy,-14+pr*44,-142+(pr>.45?(pr-.45)*90:0));arm(2,sy,16,-124)}
 else if(a==='block'){arm(0,sy,14,-150);arm(3,sy,20,-148)}
 else if(a==='serve'){arm(0,sy,10,-146);arm(2,sy,18,-108)}
 else if(air){arm(0,sy,12,-118);arm(2,sy,16,-112)}
 else{const sw=Math.sin(p.anim)*14*p.sp;arm(0,sy,sw+2,-62);arm(2,sy,-sw+2,-62)}
 ctx.restore();
 if(t.human&&p===hp(t)){const by=Math.sin(tt*8)*3;ctx.fillStyle='#ffcf33';ctx.beginPath();ctx.moveTo(x,y-142+by);ctx.lineTo(x-8,y-156+by);ctx.lineTo(x+8,y-156+by);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 11px Segoe UI';ctx.textAlign='center';ctx.fillText(ABR[p.role],x,y-160+by)}}
function drawBall(b){
 if(b.x<-20)return;const x=b.x*P,y=-b.y*P,r=R*P+1;
 ctx.fillStyle='rgba(0,0,0,'+Math.max(.1,.35-b.y*.04)+')';ctx.beginPath();ctx.ellipse(x,0,r*Math.max(.5,1-b.y*.06),4,0,0,7);ctx.fill();
 b.trail.forEach((q,i)=>{ctx.globalAlpha=i/b.trail.length*.4;ctx.fillStyle=b.fire?'#ff8a1f':'#fff';ctx.beginPath();ctx.arc(q.x*P,-q.y*P,r*(.4+i/b.trail.length*.5),0,7);ctx.fill()});ctx.globalAlpha=1;
 ctx.save();ctx.translate(x,y);ctx.rotate(b.rot);
 const g=ctx.createRadialGradient(-4,-4,2,0,0,r);g.addColorStop(0,'#fff6b0');g.addColorStop(1,'#dfae1c');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
 ctx.strokeStyle='#2a63c8';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(-r*.9,0,r*.95,-1,1);ctx.stroke();ctx.beginPath();ctx.arc(r*.9,0,r*.95,Math.PI-1,Math.PI+1);ctx.stroke();ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.stroke();
 ctx.strokeStyle='#222';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();ctx.restore();
 const top=-(GY-26)/cam.z;if(y<top){ctx.fillStyle='#ffcf33';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x-9,top+16);ctx.lineTo(x+9,top+16);ctx.fill()}}
function draw(){
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;arena();
 if(S){const b=S.ball;cam.x+=(Math.max(-6.8,Math.min(6.8,b.x*.55))-cam.x)*.06;
  const tz=S.freeze>0?1.2:(S.phase==='ready'?1.12:1.04);cam.z+=(tz-cam.z)*.08}
 const sx=(Math.random()-.5)*cam.shake,sy=(Math.random()-.5)*cam.shake;
 ctx.save();ctx.translate(W/2+sx,GY+sy);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x*P,0);
 court();
 if(S){
  const all=[...S.teams[0].players,...S.teams[1].players].sort((a,z)=>a.t.c.LN[a.slot]-z.t.c.LN[z.slot]);
  all.forEach(drawP);net();drawBall(S.ball);
  parts.forEach(q=>{ctx.globalAlpha=Math.max(0,q.l/q.L);ctx.fillStyle=q.c;ctx.fillRect(q.x*P,-q.y*P,q.s,q.s)});ctx.globalAlpha=1}
 else net();
 ctx.restore();
 if(cam.flash>0){ctx.fillStyle='rgba(255,255,255,'+cam.flash*.5+')';ctx.fillRect(0,0,W,H)}
 if(cfg.paused){ctx.fillStyle='#000a';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='900 64px Segoe UI';ctx.textAlign='center';ctx.fillText('PAUSA',W/2,H/2)}}
function hud(){
 if(!S)return;const[a,b]=S.teams,tr=S.o.train;
 $('p0').textContent=tr?S.ok:a.pts;$('p1').textContent=tr?S.err:b.pts;
 const pip=t=>S.ball.team===t&&S.phase==='play'?'●'.repeat(t.touches)+'○'.repeat(Math.max(0,3-t.touches)):'○○○';
 $('pips0').textContent=pip(a);$('pips1').textContent=pip(b);
 $('hint').textContent=S.phase==='ready'&&S.server.human?'Pulsa C para sacar (←/→ = corto/largo)':'←→ mover · Espacio saltar · Z recibir · X colocar · C rematar · V bloquear · Q cambiar';
 if(S.msgT>0){$('toast').textContent=S.msg;$('toast').classList.add('on')}}
function loop(ts){const dt=Math.min(.033,(ts-last)/1000||0);last=ts;tt+=dt;
 try{update(dt);draw();hud()}catch(e){console.error(e);let el=$('err');if(!el){el=document.createElement('div');el.id='err';el.style.cssText='position:fixed;bottom:50px;left:10px;right:10px;background:#900c;color:#fff;padding:8px;font:12px monospace;z-index:99';document.body.appendChild(el)}el.textContent='Error: '+e.message}
 requestAnimationFrame(loop)}

/* ---------- menús y entrada ---------- */
function ov(t,p,btns){$('ovT').textContent=t;$('ovP').textContent=p;const B=$('ovB');B.innerHTML='';btns.forEach(([l,fn])=>{const e=document.createElement('button');e.textContent=l;e.onclick=fn;B.appendChild(e)});$('ov').classList.remove('hidden')}
function menu(){S=null;parts=[];cfg.paused=false;$('ov').classList.add('hidden');$('hud').classList.add('hidden');$('menu').classList.remove('hidden')}
function go(m,stage=0){
 cur=m;tour=m==='tour'?{stage}:null;const M=MODES[m];cfg.diff=+$('diff').value;cfg.auto=$('auto').checked;cfg.paused=false;
 const o={...M,mode:m,opp:OPP[m==='tour'?stage:Math.random()*3|0],diff:cfg.diff*(m==='tour'?[.85,1,1.15][stage]:1)};
 if(m==='tour'){o.target=stage===2?25:15;o.label='Torneo · '+['Cuartos','Semifinal','Final'][stage]}
 startMatch(o)}
function sw(mode){const t=S&&S.teams[0];if(!t||S.phase==='ready'||S.phase==='feed')return;
 if(mode==='near'){const b=S.ball;let bi=-1,bd=1e9;t.players.forEach((p,i)=>{if(i===t.ctrl)return;const d=Math.abs(p.x-b.x);if(d<bd){bd=d;bi=i}});if(bi>=0)t.ctrl=bi}
 else t.ctrl=(t.ctrl+1)%t.players.length}
document.querySelectorAll('[data-m]').forEach(e=>e.onclick=()=>go(e.dataset.m));
$('auto').onchange=()=>cfg.auto=$('auto').checked;
$('btnMenu').onclick=()=>{if(!S)return;cfg.paused=true;ov('Pausa','',[['Continuar',()=>{cfg.paused=false;$('ov').classList.add('hidden')}],['Reiniciar',()=>go(cur,tour?tour.stage:0)],['Menú principal',menu]])};
addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
 if(e.repeat)return;keys[e.code]=true;
 if(KM[e.code])humanAct(KM[e.code]);
 else if(e.code==='KeyQ')sw('near');else if(e.code==='Tab')sw('next');
 else if(e.code==='KeyP'&&S&&S.phase!=='end'&&$('ov').classList.contains('hidden'))cfg.paused=!cfg.paused});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
document.querySelectorAll('[data-h]').forEach(e=>{const k=e.dataset.h;e.onpointerdown=ev=>{ev.preventDefault();keys[k]=true};['pointerup','pointerleave','pointercancel'].forEach(n=>e['on'+n]=()=>keys[k]=false)});
document.querySelectorAll('[data-a]').forEach(e=>e.onpointerdown=ev=>{ev.preventDefault();e.dataset.a==='sw'?sw('near'):humanAct(e.dataset.a)});
if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
addEventListener('touchstart',()=>document.body.classList.add('touch'),{once:true});
addEventListener('click',e=>e.target.blur&&e.target.blur());
requestAnimationFrame(loop);
