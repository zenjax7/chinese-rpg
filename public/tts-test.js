
var L=document.getElementById('log'),S=document.getElementById('st'),B=document.getElementById('big'),t0=Date.now(),sy=window.speechSynthesis;
function st(){try{return sy?'['+(sy.speaking?'speaking ':'')+(sy.pending?'pending ':'')+(sy.paused?'paused ':'')+(!sy.speaking&&!sy.pending&&!sy.paused?'idle':'')+']':'[no synth]'}catch(e){return '[st err '+e+']'}}
function log(m){if(!L)L=document.getElementById('log');if(L.value.indexOf('(JS has not run')===0)L.value='';var l=((Date.now()-t0)/1000).toFixed(2)+'s '+m+' '+st();L.value+=l+'\n';L.scrollTop=1e9;}
function big(m,c){B.style.display='block';B.style.background=c||'#a22';B.textContent=m;}
window.onerror=function(m,s,l,c){log('JS ERROR '+m+' @'+l+':'+c);};
window.addEventListener('unhandledrejection',function(e){log('REJECTION '+(e.reason&&e.reason.message||e.reason));});
log('page JS alive (tts-test.js v4)');document.addEventListener('DOMContentLoaded',function(){log('DOMContentLoaded — page JS alive')});
log('UA '+navigator.userAgent);
log('secureContext '+window.isSecureContext+' · clipboard '+(!!(navigator.clipboard&&navigator.clipboard.writeText))+' · share '+(!!navigator.share));
log('speechSynthesis '+(sy&&typeof sy.speak==='function'?'yes':'NO')+' · Utterance '+(typeof SpeechSynthesisUtterance)+' · audioSession '+(navigator.audioSession?navigator.audioSession.type:'n/a'));
if(!sy||typeof SpeechSynthesisUtterance==='undefined'){big('❌ speechSynthesis NOT AVAILABLE in this browser');}
var V=[];
function pick(l){var re=new RegExp('^'+l.replace('-','[-_]'),'i');for(var i=0;i<V.length;i++)if(re.test(V[i].lang))return V[i];for(i=0;i<V.length;i++)if(V[i].lang.toLowerCase().indexOf(l.slice(0,2))===0)return V[i];return null;}
function lv(why){try{V=sy?sy.getVoices():[]}catch(e){V=[];log('getVoices threw '+e)}var z=pick('zh-CN'),e=pick('en-US');
 log('voices('+why+') '+V.length+' · zh pick '+(z?z.name+' '+z.lang:'none')+' · en pick '+(e?e.name+' '+e.lang:'none'));
 if(sy&&V.length===0)big('⚠️ 0 voices reported ('+why+'). Speech may still work with default voice — try the "no voice set" buttons.','#a60');else if(V.length)B.style.display='none';}
if(sy){lv('load');try{sy.addEventListener('voiceschanged',function(){lv('voiceschanged')})}catch(e){sy.onvoiceschanged=function(){lv('voiceschanged')}}setTimeout(function(){lv('+1s')},1000);setTimeout(function(){lv('+3s')},3000);}
var keep=[],n=0;
// Called synchronously in the click handler — no await/timeout before sy.speak (iOS user-gesture rule).
function speak(text,lang,useVoice){var id=++n;
 if(!sy){log('#'+id+' NO speechSynthesis');big('❌ no speechSynthesis');return;}
 try{
  log('#'+id+' tap '+lang+' useVoice='+useVoice+' gesture '+(navigator.userActivation?navigator.userActivation.isActive:'?'));
  if(sy.speaking||sy.pending){sy.cancel();log('#'+id+' cancel() (was busy)');}
  if(document.getElementById('resume').checked){sy.resume();log('#'+id+' resume()');}
  var u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=0.9;u.volume=1;u.pitch=1;
  var v=useVoice?pick(lang):null;if(v)u.voice=v;keep.push(u);
  var started=false;
  u.onstart=function(){started=true;log('#'+id+' START ✅');};
  u.onend=function(){log('#'+id+' END');};
  u.onerror=function(e){log('#'+id+' ERROR '+e.error);big('❌ utterance error: '+e.error);};
  sy.speak(u);
  log('#'+id+' speak("'+text+'") voice '+(v?v.name+' '+v.lang:'default'));
  setTimeout(function(){if(!started){log('#'+id+' ⚠️ no onstart after 2s');big('⚠️ #'+id+' never started. If MP3 also silent → check ringer/volume. If MP3 plays → speech engine issue.','#a60');}},2000);
 }catch(e){log('#'+id+' THREW '+e.name+': '+e.message);big('❌ speak threw: '+e.message);}
}
function on(i,f){document.getElementById(i).addEventListener('click',function(ev){log('tap ['+i+'] audioSession '+(navigator.audioSession?navigator.audioSession.type:'n/a'));try{f(ev)}catch(e){log(i+' THREW '+e.message)}});}
on('zh',function(){speak('苹果','zh-CN',true)});on('zhn',function(){speak('你好','zh-CN',false)});
on('en',function(){speak('apple','en-US',true)});on('enn',function(){speak('hello','en-US',false)});
on('cancel',function(){sy.cancel();log('cancel()')});
on('sess',function(){if(navigator.audioSession){navigator.audioSession.type='playback';log('audioSession='+navigator.audioSession.type)}else log('no audioSession API')});
on('voices',function(){lv('button');V.forEach(function(v){if(/^(zh|en)/i.test(v.lang))log('  '+v.lang+' '+v.name+(v.default?' default':'')+(v.localService?' local':''))})});
on('mp3',function(){var a=new Audio('audio/sfx/sfx_correct.mp3');a.onplaying=function(){log('mp3 playing')};a.onerror=function(){log('mp3 error '+(a.error&&a.error.code))};var p=a.play();if(p&&p.then)p.then(function(){log('mp3 play() ok')},function(e){log('mp3 play() rejected '+e.name)});});
function selAll(){L.focus();L.select();try{L.setSelectionRange(0,L.value.length)}catch(e){}}
on('sel',function(){selAll();S.textContent='Selected — long-press in the box → Copy';});
on('copy',function(){var txt=L.value,ok=false;
 selAll();try{ok=document.execCommand('copy')}catch(e){log('execCommand threw '+e.message)}
 log('execCommand copy → '+(ok?'OK':'FAILED'));
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){log('clipboard.writeText → OK');S.textContent='✅ Copied';},function(e){log('clipboard.writeText → FAILED '+e.name);if(!ok)S.textContent='❌ Copy failed — log is selected, long-press → Copy, or use Share';});}
 else S.textContent=ok?'✅ Copied (execCommand)':'❌ Copy failed — long-press selected text → Copy, or use Share';});
on('share',function(){if(!navigator.share){log('no Web Share API');S.textContent='No Share on this browser — use Select all / Email';return;}
 navigator.share({title:'TTS log',text:L.value}).then(function(){log('share OK')},function(e){log('share failed '+e.name)});});
on('mail',function(){var b=L.value;if(b.length>1800)b='...(truncated)\n'+b.slice(-1800);location.href='mailto:?subject='+encodeURIComponent('TTS test log')+'&body='+encodeURIComponent(b);});
on('clr',function(){L.value='';S.textContent='';});
// v4: iOS silent switch — on the first tap set audioSession 'playback' (+ silent <audio> play), never an empty utterance
var primed=false,optOut=/[?&]ttssession=0/.test(location.search);
function asType(){return navigator.audioSession?navigator.audioSession.type:'n/a'}
function prime(why){if(primed)return;primed=true;var b=asType();
 if(optOut){log('audioSession '+b+' (?ttssession=0: NOT setting playback — voice will follow the ringer)');return;}
 try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){log('audioSession set threw '+e)}
 log('first tap ('+why+'): audioSession '+b+' → '+asType());
 try{var a=new Audio('data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA');a.volume=0;a.playsInline=true;var p=a.play();if(p&&p.then)p.then(function(){log('silent <audio> play() ok')},function(e){log('silent <audio> play() rejected '+e.name)});}catch(e){log('silent audio threw '+e)}}
['touchend','click','keydown'].forEach(function(t){document.addEventListener(t,function(ev){prime(t)},true)});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&primed&&!optOut&&navigator.audioSession&&navigator.audioSession.type!=='playback'){navigator.audioSession.type='playback';log('visible again: audioSession → '+asType())}});
