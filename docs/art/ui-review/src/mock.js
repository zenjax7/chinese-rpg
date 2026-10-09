const A='file:///workspace/chinese-rpg/prototype/dist/';
function sp(parent,id,x,feet,S,idx=0,extra=''){ // S = frame box size in px (feet at 0.92*S)
  const sh=document.createElement('div');sh.className='shadow';sh.style.cssText=`left:${x}px;top:${feet-11}px;width:${S*0.55}px`;parent.appendChild(sh);
  const d=document.createElement('div');d.className='sprite';
  d.style.cssText=`left:${x-S/2}px;top:${feet-0.92*S}px;width:${S}px;height:${S}px;background-image:url(${A}sprites/${id}.png);background-size:${7*S}px ${S}px;background-position:${-idx*S}px 0;${extra}`;
  parent.appendChild(d);return d;}
function el(parent,html){parent.insertAdjacentHTML('beforeend',html);}
function badge(parent,n,x,y){el(parent,`<div class="badge" style="left:${x-19}px;top:${y-19}px">${n}</div>`);}
function box(parent,x,y,w,h){el(parent,`<div class="box" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);}
function dimt(parent,t,x,y){el(parent,`<div class="dimtxt" style="left:${x}px;top:${y}px">${t}</div>`);}
function party(f,{hp=36,mhp=36,mp=12,mmp=12,fr=15}={}){
  el(f,`<div class="plate" style="left:16px;top:16px;width:380px;height:118px;padding:10px 14px 10px 104px">
   <div style="position:absolute;left:12px;top:12px;width:82px;height:82px;border-radius:50%;background:#2b4a8a url(${A}sprites/hero.png) no-repeat;background-size:${7*150}px 150px;background-position:-34px -12px;border:3px solid #ffe27a"></div>
   <div style="position:absolute;left:14px;top:92px;width:78px;text-align:center;font:800 17px Nunito;background:#ffcf4a;color:#1b1b2f;border-radius:10px">Lv 1</div>
   <div style="display:flex;align-items:center;gap:8px;font:800 20px Nunito"><span style="width:34px">HP</span><div class="bar hp" style="flex:1"><i style="width:${100*hp/mhp}%"></i></div><span style="width:66px;text-align:right">${hp}/${mhp}</span></div>
   <div style="display:flex;align-items:center;gap:8px;font:800 20px Nunito;margin-top:6px"><span style="width:34px">MP</span><div class="bar mp" style="flex:1"><i style="width:${100*mp/mmp}%"></i></div><span style="width:66px;text-align:right">${mp}/${mmp}</span></div>
   <div style="display:flex;align-items:center;gap:8px;font:800 18px Nunito;margin-top:6px"><span style="width:34px">🐲</span><div class="bar fr" style="flex:1;height:14px"><i style="width:${fr}%"></i></div><span style="width:66px;text-align:right;font-size:16px">小龙 💖</span></div></div>`);
}
function corner(f){el(f,`<div class="ico" style="left:1128px;top:16px">🔊</div><div class="ico" style="left:1200px;top:16px">⏸️</div>`);}
function foe(f,id,x,feet,S,name,hp,mhp,idx=0,extra=''){sp(f,id,x,feet,S,idx,extra);
  const col=hp/mhp>.5?'#2ecc71':hp/mhp>.25?'#f1c40f':'#e74c3c';
  el(f,`<div class="nameplate" style="left:${x}px;top:${feet-0.74*S-52}px"><div class="n" lang="zh-CN">${name}</div><div class="bar" style="border-color:#000a"><i style="width:${100*hp/mhp}%;background:${col}"></i></div></div>`);}
function notes(list){return `<div class="notes">${list.map((t,i)=>`<div class="note"><div class="b">${i+1}</div><div>${t}</div></div>`).join('')}</div>`;}
