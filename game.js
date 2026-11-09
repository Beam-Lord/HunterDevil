(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width, H = canvas.height, FLOOR = 226, WORLD = 1780;
  const $ = (id) => document.getElementById(id);
  const ui = { start: $('start-overlay'), result: $('result-overlay'), controls: $('virtual-controls'), boss: $('boss-bar'), bossMeter: $('boss-meter'), hearts: $('hearts'), health: $('health-text'), debt: $('debt-value'), debtMeter: $('debt-meter'), kills: $('kill-count'), cash: $('cash-value'), objKills: $('objective-count'), objDebt: $('objective-debt'), toast: $('toast'), flash: $('hit-flash'), zone: $('zone-label'), contractMenu: $('contract-menu'), pause: $('pause-overlay') };
  const keys = new Set();
  let stickDirection = 0;
  let paused = false, contractMenuOpen = false;
  const platforms = [{x:220,y:183,w:105},{x:430,y:169,w:96},{x:670,y:185,w:105},{x:895,y:165,w:110},{x:1120,y:182,w:105},{x:1370,y:169,w:110}];
  const mobSpots = [270, 490, 710, 940, 1170, 1390];
  let player, enemies, bullets, particles, camera, active, lastTime, elapsed, kills, cash, debt, chosenContract, weapon, cooldown, contractCooldown, toastTimer, soundOn, audio, bossSpawned, bossDead, shake, gameWon;
  let best = Number(localStorage.getItem('debtCollectorBest') || 0);
  const enemyColors = ['#7a4d54','#64737c','#8b6048','#565c75'];
  function freshGame() {
    player = {x:54,y:FLOOR-32,w:20,h:32,vx:0,vy:0,hp:4,maxHp:4,face:1,ground:true,inv:0,anim:0, attack:0, slash:false, future:0, dash:0};
    enemies = mobSpots.map((x,i)=>({x,y:FLOOR-24,w:21,h:24,hp:2,maxHp:2,alive:true,boss:false,kind:i%4,dir:-1,hit:0,attack:Math.random()*1.5,anim:0}));
    bullets=[]; particles=[]; camera=0; kills=0;cash=0;debt=8400;elapsed=0;cooldown=0;contractCooldown=0;toastTimer=0;bossSpawned=false;bossDead=false;shake=0;gameWon=false;weapon=1;chosenContract='fox';active=false;paused=false;contractMenuOpen=false;
    document.querySelectorAll('.weapon-item').forEach((el,i)=>{el.classList.toggle('active',i===0);el.querySelector('.weapon-status').textContent=i===0?'EQUIPPED':i===1?'UNLOCKED':'UNLOCKED';});
    document.querySelectorAll('.contract-card').forEach((el,i)=>el.classList.toggle('selected',i===0));
    ui.start.classList.remove('hidden');ui.result.classList.add('hidden');ui.controls.classList.remove('enabled');ui.boss.classList.add('hidden');ui.contractMenu.classList.add('hidden');ui.pause.classList.add('hidden');ui.zone.textContent='ZONE 01 — THE UNDERPASS';
    renderUI();
  }
  function money(n){return '¥ '+Math.max(0,Math.floor(n)).toLocaleString('en-US');}
  function renderUI(){
    ui.hearts.innerHTML='';for(let i=0;i<player.maxHp;i++){const h=document.createElement('span');h.className='heart'+(i>=player.hp?' empty':'');h.textContent='♥';ui.hearts.appendChild(h)}
    ui.hearts.setAttribute('aria-label',`${player.hp} of ${player.maxHp} health`);ui.health.textContent=`0${player.hp} / 0${player.maxHp}`;
    ui.debt.textContent=money(debt);ui.debtMeter.style.width=`${Math.max(0,debt/8400*100)}%`;ui.kills.innerHTML=`${String(Math.min(kills,8)).padStart(2,'0')} <small>/ 08</small>`;ui.cash.textContent=money(cash);ui.objKills.textContent=`${Math.min(kills,8)} / 8`;ui.objDebt.textContent=Math.floor(debt).toLocaleString('en-US');
    const boss=enemies.find(e=>e.boss&&e.alive);if(boss){ui.boss.classList.remove('hidden');ui.bossMeter.style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`}else ui.boss.classList.add('hidden');
  }
  function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');toastTimer=1.5;}
  function startGame(){if(active)return;active=true;paused=false;ui.start.classList.add('hidden');ui.controls.classList.add('enabled');lastTime=performance.now();audioUnlock();showToast('CONTRACT ACCEPTED — GO TO WORK');}
  function startResult(won){active=false;paused=false;contractMenuOpen=false;gameWon=won;ui.controls.classList.remove('enabled');ui.pause.classList.add('hidden');ui.contractMenu.classList.add('hidden');ui.result.classList.remove('hidden');$('result-kicker').textContent=won?'MISSION COMPLETE':'CONTRACT TERMINATED';$('result-title').innerHTML=won?'NICE WORK,<br>HUNTER.':'YOU OWE<br>THEM MORE.';$('result-copy').textContent=won?'You survived the shift. Barely.':`You exorcised ${kills} devil${kills===1?'':'s'} before clocking out.`;$('result-kills').textContent=String(kills).padStart(2,'0');$('result-cash').textContent=money(cash);if(won&&cash>best){best=cash;localStorage.setItem('debtCollectorBest',best)}playTone(won?520:130,.18,'triangle');}
  function audioUnlock(){if(!soundOn)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch(e){}}
  function playTone(freq,duration=.08,type='square'){if(!soundOn)return;try{audioUnlock();if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}}
  function puff(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*95,vy:(Math.random()-.8)*90,life:.25+Math.random()*.42,color,size:2+Math.random()*3});}
  function hitPlayer(damage){if(player.inv>0||player.future>0||!active)return;player.hp=Math.max(0,player.hp-damage);player.inv=1.15;shake=5;ui.flash.classList.remove('active');void ui.flash.offsetWidth;ui.flash.classList.add('active');puff(player.x+10,player.y+13,'#ed5a4b',11);playTone(90,.18,'sawtooth');renderUI();if(player.hp<=0)startResult(false)}
  function hurtEnemy(e,damage){if(!e.alive)return;e.hp-=damage;e.hit=.18;puff(e.x+e.w/2,e.y+e.h/2,e.boss?'#e35248':'#efb179',8);playTone(e.boss?150:210,.08);if(e.hp<=0){e.alive=false;const payout=e.boss?4500:650;cash+=payout;debt=Math.max(0,debt-payout);kills+=e.boss?2:1;puff(e.x+e.w/2,e.y+e.h/2,'#f3d37a',15);showToast(`${e.boss?'BAT DEVIL':'DEVIL'} EXORCISED  +${money(payout)}`);if(e.boss){bossDead=true;ui.zone.textContent='ZONE CLEAR — DEBT COLLECTED';}renderUI();if(kills>=8&&e.boss)startResult(true);else if(kills>=2&&!document.querySelector('[data-weapon="2"]').dataset.ready){document.querySelector('[data-weapon="2"]').dataset.ready='1';document.querySelector('[data-weapon="2"] .weapon-status').textContent='READY';showToast('LOADOUT UPDATED — NAIL SWORD READY')}if(kills>=4&&!document.querySelector('[data-weapon="3"]').dataset.ready){document.querySelector('[data-weapon="3"]').dataset.ready='1';document.querySelector('[data-weapon="3"] .weapon-status').textContent='READY';showToast('LOADOUT UPDATED — SERVICE PISTOL READY')}}}
  function tryAttack(){if(!active||cooldown>0)return;cooldown=weapon===2?.55:weapon===3?.38:.38;player.attack=weapon===3?.14:.24;player.slash=true;const px=player.x+player.w/2,range=weapon===2?65:weapon===1?52:0;let hit=false;if(weapon===3){const bx=player.x+player.w/2+player.face*11;bullets.push({x:bx,y:player.y+13,vx:player.face*300,life:1});playTone(330,.07,'triangle');return}
    for(const e of enemies){if(!e.alive)continue;const dx=(e.x+e.w/2)-px;if(Math.abs(dx)<=range+(e.boss?16:0)&&Math.abs((e.y+e.h/2)-(player.y+player.h/2))<36&&Math.sign(dx||1)===player.face){hurtEnemy(e,weapon===2?2:1);hit=true}}
    if(hit){playTone(180,.07,'sawtooth');shake=2}else playTone(100,.05,'sawtooth');
  }
  function useContract(){if(!active||contractCooldown>0)return;const contract=chosenContract;
    if(contract==='future'){player.future=2.8;player.inv=Math.max(player.inv,.35);contractCooldown=5;showToast('FUTURE SIGHT — DODGE WINDOW');playTone(650,.2,'sine');return}
    if(player.hp<=1){showToast('INSUFFICIENT BLOOD — CONTRACT DENIED');return}player.hp--;player.inv=Math.max(player.inv,.45);contractCooldown=4.5;renderUI();
    if(contract==='fox'){const target=enemies.filter(e=>e.alive&&Math.abs((e.x+e.w/2)-(player.x+player.w/2))<145&&Math.sign((e.x+e.w/2)-(player.x+player.w/2)||1)===player.face).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0];if(target)hurtEnemy(target,2);else showToast('FOX DEVIL: NOTHING IN RANGE');puff(player.x+player.w/2+player.face*25,player.y+12,'#f1d8ae',12);playTone(380,.2,'sawtooth');}
    else{for(const e of enemies){if(e.alive&&Math.abs((e.x+e.w/2)-(player.x+player.w/2))<118)hurtEnemy(e,2)}puff(player.x+10,player.y+10,'#c74345',18);playTone(240,.2,'sawtooth');showToast('BLOOD REAPER — PAID IN BLOOD')}
  }
  function selectWeapon(n){const el=document.querySelector(`[data-weapon="${n}"]`);if(n>1&&el.dataset.ready!=='1'){showToast(`WEAPON ${String(n).padStart(2,'0')} NOT YET AUTHORIZED`);return}weapon=n;document.querySelectorAll('.weapon-item').forEach(x=>x.classList.toggle('active',x===el));const names={1:'CHAINSAW EQUIPPED',2:'NAIL SWORD EQUIPPED',3:'SERVICE PISTOL EQUIPPED'};showToast(names[n]);}
  function cycleWeapon(){for(let step=1;step<=3;step++){const next=(weapon-1+step)%3+1,el=document.querySelector(`[data-weapon="${next}"]`);if(next===1||el.dataset.ready==='1'){selectWeapon(next);return}}}
  function dash(){if(!active||paused||contractMenuOpen||player.dash>0||player.dashCooldown>0)return;player.dash=.17;player.dashCooldown=1.05;player.inv=Math.max(player.inv,.24);player.dashDirection=player.vx?Math.sign(player.vx):player.face;playTone(260,.06,'triangle');}
  function interact(){if(!active||paused||contractMenuOpen)return;const target=enemies.filter(e=>e.alive&&Math.abs((e.x+e.w/2)-(player.x+player.w/2))<82).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0];if(target)showToast(`${target.boss?'BAT DEVIL':'DEVIL'} — ${Math.max(0,target.hp)} VITALITY`);else showToast('NO INTERACTION IN RANGE');}
  function toggleContractMenu(){if(!active)return;if(paused)return;contractMenuOpen=!contractMenuOpen;ui.contractMenu.classList.toggle('hidden',!contractMenuOpen);if(contractMenuOpen)showToast('CONTRACT TERMINAL — SELECT A DEVIL');}
  function togglePause(){if(!active)return;if(contractMenuOpen){contractMenuOpen=false;ui.contractMenu.classList.add('hidden');return}paused=!paused;ui.pause.classList.toggle('hidden',!paused);if(!paused)lastTime=performance.now();}
  function update(dt){if(!active||paused||contractMenuOpen)return;elapsed+=dt;cooldown=Math.max(0,cooldown-dt);contractCooldown=Math.max(0,contractCooldown-dt);player.inv=Math.max(0,player.inv-dt);player.future=Math.max(0,player.future-dt);player.attack=Math.max(0,player.attack-dt);player.dash=Math.max(0,player.dash-dt);player.dashCooldown=Math.max(0,(player.dashCooldown||0)-dt);if(toastTimer>0&&(toastTimer-=dt)<=0)ui.toast.classList.remove('show');if(shake>0)shake=Math.max(0,shake-dt*18);
    const left=keys.has('ArrowLeft')||keys.has('a')||keys.has('A'),right=keys.has('ArrowRight')||keys.has('d')||keys.has('D');player.vx=Math.max(-1,Math.min(1,(right?1:0)-(left?1:0)+stickDirection));if(player.vx)player.face=Math.sign(player.vx);const moveX=player.dash>0?player.dashDirection*360:player.vx*112;player.x=Math.max(0,Math.min(WORLD-player.w,player.x+moveX*dt));player.anim+=dt*Math.abs(player.vx)*9;
    player.vy+=480*dt;player.y+=player.vy*dt;player.ground=false;if(player.y+player.h>=FLOOR){player.y=FLOOR-player.h;player.vy=0;player.ground=true}
    for(const p of platforms){const oldY=player.y+player.h-player.vy*dt;if(player.vy>=0&&oldY<=p.y&&player.y+player.h>=p.y&&player.x+player.w>p.x&&player.x<p.x+p.w){player.y=p.y-player.h;player.vy=0;player.ground=true}}
    if(!bossSpawned&&kills>=6){bossSpawned=true;enemies.push({x:1552,y:FLOOR-43,w:40,h:43,hp:12,maxHp:12,alive:true,boss:true,kind:0,dir:-1,hit:0,attack:1.2,anim:0});ui.zone.textContent='ZONE 02 — BAT DEVIL';showToast('WARNING: SPECIAL GRADE DEVIL');}
    camera=Math.max(0,Math.min(WORLD-W,player.x-W*.36));
    for(const e of enemies){if(!e.alive)continue;e.anim+=dt*4;e.hit=Math.max(0,e.hit-dt);e.attack-=dt;const dist=(player.x+player.w/2)-(e.x+e.w/2),abs=Math.abs(dist);if(abs>24){e.dir=Math.sign(dist);const speed=e.boss?32:22;e.x+=e.dir*speed*dt}if(e.attack<=0&&abs<(e.boss?58:35)){e.attack=e.boss?1.45:1.15;if(player.inv<=0&&player.future<=0)hitPlayer(e.boss?1:1);if(e.boss){const bx=e.x+e.w/2;bullets.push({x:bx,y:e.y+20,vx:Math.sign(dist||1)*120,hostile:true,life:2});}}
      if(e.alive&&abs<player.w/2+e.w/2+2&&Math.abs((player.y+player.h/2)-(e.y+e.h/2))<24&&e.attack>.75&&player.inv<=0)hitPlayer(1);
    }
    for(const b of bullets){b.x+=b.vx*dt;b.life-=dt;if(b.hostile){if(Math.abs(b.x-(player.x+player.w/2))<12&&Math.abs((player.y+15)-b.y)<22){b.life=0;hitPlayer(1)}}else for(const e of enemies){if(e.alive&&b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h){b.life=0;hurtEnemy(e,1);break}}}bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<WORLD+30);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);if(Math.floor(elapsed/15)!==Math.floor((elapsed-dt)/15))renderUI();
  }
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function drawBackground(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c202b');g.addColorStop(.52,'#343441');g.addColorStop(1,'#28252b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // distant city silhouettes
    for(let i=0;i<12;i++){const x=((i*57-camera*.16)%660+660)%660-90;const h=55+(i*37%70);rect(x,120-h,34,h,'#252630');for(let wy=130-h;wy<115;wy+=12)for(let wx=x+5;wx<x+30;wx+=9)if((wx+i+wy)%3)rect(wx,wy,3,4,i%3?'#d18b57':'#68798c')}
    rect(0,118,W,5,'#50505a');rect(0,123,W,2,'#191a21');
    for(let i=0;i<5;i++){let x=((i*131-camera*.42)%670+670)%670-60;rect(x,135,58,66,'#29282f');rect(x+5,141,48,3,'#45414a');rect(x+9,150,40,25,'#36323b');rect(x+12,154,33,2,i%2?'#a8443e':'#d18c56');rect(x+8,183,43,16,'#222127')}
    // overhead tunnel beams
    rect(0,0,W,12,'#222128');for(let x=-((camera*.7)%96);x<W;x+=96){rect(x,12,5,45,'#29282f');rect(x+6,47,45,2,'#765047');rect(x+10,51,3,10,'#d45142')}
    // tunnel pipes
    rect(0,74,W,5,'#4a4650');rect(0,80,W,2,'#15161b');for(let x=-((camera*.8)%80);x<W;x+=80){rect(x,79,2,13,'#68616a');rect(x+3,88,9,2,'#b24b40')}
    // floor and tiles
    rect(0,FLOOR,W,H-FLOOR,'#25242a');rect(0,FLOOR,W,3,'#827168');rect(0,FLOOR+4,W,2,'#39373b');for(let x=-Math.floor(camera%32);x<W;x+=32){rect(x,FLOOR+9,1,39,'#343238');rect(x+13,FLOOR+28,7,2,'#50464a')}rect(0,258,W,12,'#19191e');
    // puddles
    for(let i=0;i<8;i++){const x=((i*79-camera*.92)%540+540)%540;rect(x,247,24+(i%3)*7,2,'#3c4753');rect(x+7,251,12,1,'#8a4743')}
    // red wayfinding signs and lamps
    for(let i=0;i<4;i++){const x=((i*173-camera*.92)%620+620)%620;rect(x+6,103,30,16,'#873a39');rect(x+9,107,24,2,'#e1765b');rect(x+10,112,18,2,'#d8b49a');rect(x+3,99,36,3,'#a94b44')}
  }
  function drawPlayer(){const x=Math.round(player.x-camera),y=Math.round(player.y),face=player.face;if(x<-35||x>W+35)return;ctx.save();if(player.inv>0&&Math.floor(player.inv*14)%2===0)ctx.globalAlpha=.48;
    const bob=player.ground&&Math.abs(player.vx)>.1?Math.sin(player.anim*2)*1:0; // suit and tie
    rect(x+5,y+9+bob,11,15,'#34343d');rect(x+6,y+9+bob,9,2,'#dad0c1');rect(x+9,y+10+bob,3,9,'#a63836');rect(x+3,y+21+bob,7,9,'#25252c');rect(x+12,y+21+bob,7,9,'#25252c');rect(x+2,y+29+bob,9,3,'#121318');rect(x+12,y+29+bob,9,3,'#121318');
    // head and hair
    rect(x+6,y+2+bob,11,10,'#d2a27f');rect(x+4,y+1+bob,14,4,'#27262b');rect(x+4,y+4+bob,3,5,'#302b2d');rect(x+8,y+7+bob,2,1,'#202027');rect(x+14,y+7+bob,2,1,'#202027');
    if(weapon===1){const motorx=face>0?x+16:x-1;rect(motorx,y+12+bob,7,6,'#ad3d35');rect(motorx+(face>0?5:-4),y+13+bob,5,3,'#d4c8ae');rect(motorx+(face>0?8:-6),y+13+bob,4,2,'#f0e2c1');rect(x+(face>0?15:0),y+18+bob,3,6,'#77747a')}
    else if(weapon===2){rect(x+(face>0?16:-7),y+14+bob,11,2,'#d4d0c4');rect(x+(face>0?24:-8),y+13+bob,2,4,'#ece8db');rect(x+(face>0?14:3),y+13+bob,3,5,'#59413c')}
    else{rect(x+(face>0?17:-6),y+14+bob,9,4,'#44444a');rect(x+(face>0?23:-8),y+15+bob,4,2,'#c7c4b8')}
    if(player.attack>0&&weapon!==3){ctx.globalAlpha=.72;ctx.fillStyle=weapon===1?'#efe6c5':'#e98d74';ctx.beginPath();ctx.arc(x+10+face*27,y+17,weapon===2?27:21,face===1?-.8:Math.PI-.8,face===1?.8:Math.PI+.8);ctx.lineWidth=3;ctx.strokeStyle=ctx.fillStyle;ctx.stroke();ctx.globalAlpha=1}
    if(player.future>0){rect(x-5,y-3,30,2,'#7bd5d0');rect(x-5,y+34,30,2,'#7bd5d0')}
    ctx.restore();}
  function drawDevil(e){const x=Math.round(e.x-camera),y=Math.round(e.y);if(x<-60||x>W+60)return;const c=e.hit>0?'#fff':enemyColors[e.kind||0];if(e.boss){
      // bat devil silhouette with broad wings
      const flap=Math.sin(e.anim*3)*4;rect(x+12,y+9,17,26,c);rect(x+17,y+2,12,11,'#bc8f82');rect(x+18,y+8,3,2,'#f3d783');rect(x+26,y+8,3,2,'#f3d783');rect(x+19,y+13,11,3,'#472e35');
      rect(x-8,y+8+flap,23,5,'#62434c');rect(x-14,y+12+flap,11,4,'#62434c');rect(x-18,y+16+flap,9,3,'#62434c');rect(x+26,y+8-flap,22,5,'#62434c');rect(x+42,y+12-flap,10,4,'#62434c');rect(x+48,y+16-flap,8,3,'#62434c');rect(x+14,y+33,7,10,'#392b34');rect(x+25,y+33,7,10,'#392b34');rect(x+10,y+41,13,3,'#d1bcb0');rect(x+24,y+41,13,3,'#d1bcb0');
    }else{
      const bob=Math.sin(e.anim*3)*1.5;rect(x+4,y+5+bob,13,15,c);rect(x+2,y+9+bob,4,10,c);rect(x+16,y+10+bob,5,8,c);rect(x+5,y+2+bob,4,6,c);rect(x+13,y+1+bob,4,6,c);rect(x+5,y+19+bob,5,5,'#3d3338');rect(x+13,y+19+bob,5,5,'#3d3338');rect(x+7,y+10+bob,2,2,'#f5d477');rect(x+14,y+10+bob,2,2,'#f5d477');rect(x+10,y+15+bob,5,1,'#241d24');}
    if(e.hp<e.maxHp){rect(x,y-5,e.w,2,'#30252a');rect(x,y-5,e.w*(e.hp/e.maxHp),2,e.boss?'#ed5445':'#e4b760')}
  }
  function draw(){ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground();for(const p of platforms){const x=Math.round(p.x-camera);rect(x,p.y,p.w,4,'#998174');rect(x,p.y+4,p.w,3,'#49444a');for(let tx=x+6;tx<x+p.w;tx+=16)rect(tx,p.y+9,2,5,'#53505a')}
    for(const b of bullets){const x=b.x-camera;rect(x,b.y,b.hostile?5:7,3,b.hostile?'#eb6153':'#f1d89b');if(!b.hostile)rect(x+2,b.y-1,4,1,'#fff0c1')}
    for(const e of enemies)if(e.alive)drawDevil(e);drawPlayer();for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);rect(p.x-camera,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
    // screen vignette and pixel grain
    const vg=ctx.createLinearGradient(0,0,0,H);vg.addColorStop(0,'rgba(9,10,17,.08)');vg.addColorStop(1,'rgba(8,8,12,.25)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore();requestAnimationFrame(loop);}
  function loop(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;update(dt);draw()}
  function jump(){if(active&&player.ground){player.vy=-205;player.ground=false;playTone(180,.04,'triangle')}}
  document.addEventListener('keydown',e=>{const key=e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Tab'].includes(key))e.preventDefault();keys.add(key);if(e.repeat)return;if(key==='Escape'){togglePause();return}if(key==='Tab'){toggleContractMenu();return}if(e.target.closest('.virtual-controls'))return;if(key===' '||key==='ArrowUp'||key==='w'||key==='W')jump();if(key==='Shift')dash();if(key==='e'||key==='E')interact();if(key==='j'||key==='J'||key==='z'||key==='Z')tryAttack();if(key==='k'||key==='K')useContract();if(key==='q'||key==='Q')cycleWeapon();if(['1','2','3'].includes(key))selectWeapon(Number(key));if(key==='Enter'&&!active&&!ui.result.classList.contains('hidden')){freshGame();startGame()}});document.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();releaseStick();if(active&&!paused)togglePause()});
  $('start-button').addEventListener('click',startGame);$('restart-button').addEventListener('click',()=>{freshGame();startGame()});
  document.querySelectorAll('.contract-card').forEach(el=>el.addEventListener('click',()=>{chosenContract=el.dataset.contract;document.querySelectorAll('.contract-card').forEach(c=>c.classList.toggle('selected',c===el));showToast(`${chosenContract.toUpperCase()} DEVIL CONTRACT SELECTED`)}));
  document.querySelectorAll('.weapon-item').forEach(el=>el.addEventListener('click',()=>selectWeapon(Number(el.dataset.weapon))));
  $('sound-toggle').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.setAttribute('aria-pressed',String(soundOn));e.currentTarget.querySelector('span').textContent=soundOn?'SOUND ON':'SOUND OFF';if(soundOn){audioUnlock();playTone(440,.07,'sine')}});
  document.querySelectorAll('.quick-contract').forEach(el=>el.addEventListener('click',()=>{const card=document.querySelector(`[data-contract="${el.dataset.quickContract}"]`);if(card)card.click();contractMenuOpen=false;ui.contractMenu.classList.add('hidden')}));
  $('close-contract-menu').addEventListener('click',()=>{contractMenuOpen=false;ui.contractMenu.classList.add('hidden')});
  $('resume-button').addEventListener('click',togglePause);
  const stick=$('virtual-stick'),thumb=$('stick-thumb');
  function releaseStick(){stickDirection=0;if(thumb){thumb.style.transform='translateX(0px)';stick.setAttribute('aria-valuenow','0')}if(stick)stick.classList.remove('engaged')}
  function moveStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),travel=Math.max(1,(r.width-thumb.getBoundingClientRect().width)/2-5),offset=Math.max(-travel,Math.min(travel,dx));stickDirection=Math.abs(offset)<7?0:offset/travel;thumb.style.transform=`translateX(${offset}px)`;stick.setAttribute('aria-valuenow',String(Math.round(stickDirection*100)/100))}
  stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);stick.classList.add('engaged');moveStick(e)});
  stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))moveStick(e)});
  stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
  stick.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stickDirection=e.key==='ArrowLeft'?-1:1;thumb.style.transform=`translateX(${stickDirection*24}px)`;stick.setAttribute('aria-valuenow',String(stickDirection))}});
  stick.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')releaseStick()});
  const bindTouchAction=(id,action)=>{const button=$(id);button.addEventListener('pointerdown',e=>{e.preventDefault();if(e.button===undefined||e.button===0)action()});button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}})};
  bindTouchAction('touch-jump',jump);bindTouchAction('touch-dash',dash);bindTouchAction('touch-attack',tryAttack);bindTouchAction('touch-weapon',cycleWeapon);bindTouchAction('touch-interact',interact);bindTouchAction('touch-contract',toggleContractMenu);bindTouchAction('touch-pause',togglePause);
  freshGame();lastTime=performance.now();requestAnimationFrame(loop);
})();
