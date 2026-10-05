const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
const NATURAL=['C','D','E','F','G','A','B'];
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const styleAdd={worship:['maj9','m9','13'],gospel:['maj9','m9','13','7'],rnb:['maj9','m9','13','7'],jazz:['maj9','m9','13','7','7b9'],rich:['maj9','m9','13','7']};
const app={progression:document.getElementById('progression'),style:document.getElementById('style'),level:document.getElementById('level'),result:document.getElementById('result'),selectedName:document.getElementById('selectedName'),notes:document.getElementById('notes'),left:document.getElementById('leftHand'),right:document.getElementById('rightHand'),keyboard:document.getElementById('keyboard'),saved:document.getElementById('saved'),resultTitle:document.getElementById('resultTitle')};
let current=[];let selected=0;let sequence=[];
function parseChord(s){s=s.trim();const m=s.match(/^([A-Ga-g])([#b]?)(.*)$/);if(!m)return null;const root=m[1].toUpperCase()+m[2];if(PC[root]===undefined)return null;let q=m[3].trim().toLowerCase();if(q==='maj7')q='';return {root,pc:PC[root],quality:q};}
function rootTriad(c){const q=c.quality.startsWith('m')?'m':c.quality==='dim'?'dim':c.quality==='aug'?'aug':'';return {m:[0,3,7],'': [0,4,7],dim:[0,3,6],aug:[0,4,8]}[q]||[0,4,7];}
function preferFlats(c){return ['F','Bb','Eb','Ab','Db','Gb'].includes(c.root)||c.root.endsWith('b')||c.root==='Dm'||c.root==='Gm'||c.root==='Cm';}
function noteName(pc,c){return (preferFlats(c)?FLAT:SHARP)[((pc%12)+12)%12];}
function intervalSet(name){return name==='maj9'?[0,4,7,11,14]:name==='m9'?[0,3,7,10,14]:name==='13'?[0,4,7,10,14,21]:name==='7'?[0,4,7,10]:name==='7b9'?[0,4,7,10,13]:rootTriad({quality:name});}
function chooseName(c,index){const names=styleAdd[app.style.value]||styleAdd.gospel;let n=names[index%names.length];if(c.quality.startsWith('m')&&n==='maj9')n='m9';if(c.quality==='dim')return 'dim';return n;}
function degreeIntervals(name){if(name==='maj9')return [0,4,7,11,14];if(name==='m9')return [0,3,7,10,14];if(name==='13')return [0,4,7,10,14,21];if(name==='7b9')return [0,4,7,10,13];if(name==='7')return [0,4,7,10];return rootTriad({quality:name});}
function pitchNear(pc,target){let n=pc;while(n<target-6)n+=12;while(n>target+6)n-=12;return n;}
function makeVoice(c,name,prev){
  const ints=degreeIntervals(name);
  const pcs=ints.map(i=>(c.pc+i)%12);
  const bass=[c.pc,(c.pc+7)%12];
  const rightPcs=pcs.slice(name==='13'?1:1);
  const targets=prev?.right||null;
  let right=[];
  if(targets){
    const used=new Set();
    rightPcs.forEach(pc=>{let best=null;for(let o=3;o<=5;o++){const cand=pc+12*o;if(used.has(cand))continue;const t=targets.reduce((a,b)=>Math.abs(b-cand)<Math.abs(b-a)?b:a,targets[0]);const dist=Math.abs(cand-t);if(!best||dist<best.dist)best={cand,dist};}if(best){right.push(best.cand);used.add(best.cand)}});
    right.sort((a,b)=>a-b);
    const min=Math.min(...right);while(right[right.length-1]-min>11){right[right.length-1]-=12;right.sort((a,b)=>a-b);}
  } else {
    let base=60+c.pc%12;right=rightPcs.map((pc,i)=>pitchNear(pc,60+i*2));right.sort((a,b)=>a-b);
  }
  const lhRoot=prev?.left?.[0]!=null?pitchNear(c.pc,prev.left[0]):48+c.pc%12;
  const lhFifth= pitchNear((c.pc+7)%12,lhRoot+7);
  return {left:[lhRoot,lhFifth],right};
}
function makePassing(a,b){
  const delta=(b.pc-a.pc+12)%12;
  if(delta===2)return {root:'A',pc:9,quality:'7',name:'A13',why:'A13 creates forward pull into the next chord.'};
  if(delta===5)return {root:'D',pc:2,quality:'',name:'D7',why:'D7 adds dominant tension before the next chord.'};
  if(delta===7)return {root:'A',pc:9,quality:'',name:'A7',why:'A7 creates a strong dominant color.'};
  if(delta===10)return {root:'C#',pc:1,quality:'',name:'C#7',why:'C#7 acts as a dominant-style connector.'};
  return null;
}
function buildSequence(){
  const seq=[];let prev=null;
  current.forEach((x,i)=>{
    const v=makeVoice(x.chord,x.name,prev);seq.push({...x,type:'main',voice:v,why:'Main chord'});prev=v;
    if(i<current.length-1){const p=makePassing(x.chord,current[i+1].chord);if(p){const pv=makeVoice(p,p.name,prev);seq.push({base:'',chord:p,name:p.name,type:'passing',voice:pv,why:p.why});prev=pv;}}
  });
  sequence=seq;
}
function formatPitch(n,c){return noteName(n%12,c)+Math.floor(n/12);}
function inversionLabel(x){const rootPc=x.chord.pc;const bass=x.voice.left[0]%12; if(bass===rootPc)return 'Root position'; const names=degreeIntervals(x.name);let label='Inversion';const idx=names.findIndex(i=>(rootPc+i)%12===bass);if(idx===1)label='1st inversion';else if(idx===2)label='2nd inversion';else if(idx===3)label='3rd inversion';return label;}
function generate(){
  const raw=app.progression.value.split(/[ ,→-]+/).map(x=>x.trim()).filter(Boolean);const parsed=raw.map(parseChord);
  if(!raw.length||parsed.some(x=>!x)){app.result.innerHTML='<div class="hint">Enter chords like G, C, D, G. Supported roots: A–G with # or b.</div>';return;}
  current=parsed.map((c,i)=>({base:raw[i],chord:c,name:chooseName(c,i)}));selected=0;buildSequence();renderResult();renderSelected();
}
function renderResult(){
  const styleName=app.style.options[app.style.selectedIndex].text;app.resultTitle.textContent=`${styleName} · ${app.level.options[app.level.selectedIndex].text}`;
  const wrap=document.createElement('div');wrap.className='sequence-wrap';
  sequence.forEach((x,i)=>{
    const b=document.createElement('button');b.type='button';b.className='sequence-card '+(x.type==='passing'?'passing-card':'main-card')+(i===selected?' selected':'');
    b.innerHTML=`<span class="sequence-kind">${x.type==='passing'?'PASSING':'YOUR CHORD'}</span><strong>${x.chord.root}${x.name}</strong><small>${inversionLabel(x)}</small>`;
    b.addEventListener('click',()=>{selected=i;renderResult();renderSelected();});wrap.appendChild(b);
    if(i<sequence.length-1){const arrow=document.createElement('span');arrow.className='sequence-arrow';arrow.textContent='→';wrap.appendChild(arrow);}
  });
  app.result.innerHTML='';app.result.appendChild(wrap);
  const tip=document.createElement('div');tip.className='hint';tip.innerHTML='<b>Passing chords are purple.</b> Tap any card—including a purple passing chord—to see its exact notes and keyboard position.';app.result.appendChild(tip);
}
function renderSelected(){
  const x=sequence[selected];if(!x)return;const ns=[...x.voice.left,...x.voice.right];
  app.selectedName.textContent=x.chord.root+x.name+(x.type==='passing'?' · Passing':'');
  app.notes.innerHTML='';ns.forEach(n=>{const e=document.createElement('span');e.className='note';e.textContent=formatPitch(n,x.chord);app.notes.appendChild(e)});
  app.left.textContent=x.voice.left.map(n=>formatPitch(n,x.chord)).join(' ');
  app.right.textContent=x.voice.right.map(n=>formatPitch(n,x.chord)).join(' ');
  const inv=document.getElementById('inversion');if(inv)inv.textContent=inversionLabel(x)+' · closest-position voice leading';
  const why=document.getElementById('why');if(why)why.textContent=x.type==='passing'?x.why:'The voicing is chosen to keep your right hand close to the previous chord.';
  drawKeyboard(ns,x.chord);
}
function drawKeyboard(ns,c){
  app.keyboard.innerHTML='';const min=48,max=72;const active=new Set(ns);const whites=[];
  for(let p=min;p<=max;p++){if(![1,3,6,8,10].includes(p%12))whites.push(p);}
  whites.forEach((p,i)=>{const w=document.createElement('div');w.className='white'+(active.has(p)?' active':'');w.innerHTML=`<span>${noteName(p,c)}</span>`;app.keyboard.appendChild(w);});
  whites.forEach((p,i)=>{const next=p+1;if(next>max||![1,3,6,8,10].includes(next%12))return;const b=document.createElement('div');b.className='black'+(active.has(next)?' active':'');b.style.left=(i*38+25)+'px';b.textContent=active.has(next)?noteName(next,c):'';app.keyboard.appendChild(b);});
}
function save(){const value=app.progression.value.trim();if(!value)return;const arr=JSON.parse(localStorage.getItem('chordpilot_saved')||'[]');if(!arr.includes(value))arr.unshift(value);localStorage.setItem('chordpilot_saved',JSON.stringify(arr.slice(0,20)));renderSaved();}
function renderSaved(){const arr=JSON.parse(localStorage.getItem('chordpilot_saved')||'[]');app.saved.innerHTML='';if(!arr.length){app.saved.innerHTML='<div class="hint">Nothing saved yet.</div>';return;}arr.forEach(v=>{const d=document.createElement('div');d.className='saved-item';const t=document.createElement('span');t.textContent=v;const b=document.createElement('button');b.type='button';b.textContent='Load';b.onclick=()=>{app.progression.value=v;generate();};d.append(t,b);app.saved.appendChild(d);});}
async function play(){
  const x=sequence[selected];if(!x)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();const now=ctx.currentTime;
  [...x.voice.left,...x.voice.right].forEach((n,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=440*Math.pow(2,(n-69)/12);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.03+i*.015);g.gain.exponentialRampToValueAtTime(.0001,now+1.8);o.connect(g).connect(ctx.destination);o.start(now);o.stop(now+1.9);});
}
document.getElementById('generateBtn').onclick=generate;document.getElementById('saveBtn').onclick=save;document.getElementById('playBtn').onclick=play;document.getElementById('style').onchange=generate;document.getElementById('level').onchange=generate;document.getElementById('clearSavedBtn').onclick=()=>{localStorage.removeItem('chordpilot_saved');renderSaved();};renderSaved();generate();
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.getElementById('installBtn').classList.remove('hidden');});document.getElementById('installBtn').onclick=async()=>{if(!deferred)return;deferred.prompt();deferred=null;};if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
