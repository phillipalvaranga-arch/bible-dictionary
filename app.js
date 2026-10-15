/* Bible Dictionary — offline edition. Sources: KJV (1769, Strong's-tagged, eBible/CrossWire, PD); Strong's Hebrew & Greek (PD);
   Easton's (1897, PD); Smith's (1884, PD); Hitchcock's Bible Names (PD). */
const el=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const I=window.BD_INDEX, CORE=window.BD_CORE||[], BK=window.BD_BOOKS;
const CMAP={}; CORE.forEach(e=>CMAP[e.h.toLowerCase()]=e);
const KEYS=Object.keys(I).concat(CORE.map(e=>e.h.toLowerCase()).filter(k=>!I[k])).sort();
const SRCNAME={e:"Easton's Bible Dictionary",s:"Smith's Bible Dictionary",h:"Hitchcock's Bible Names",st:"Strong's Concordance",g:"KJV word glossary",f:"Strong's / Easton's (word form)",x:"KJV word list"};
/* ---------- lazy data ---------- */
const loaded={};
function load(name,global){
  if(window[global]) return Promise.resolve(window[global]);
  if(loaded[name]) return loaded[name];
  return loaded[name]=new Promise((ok,bad)=>{const s=document.createElement("script");s.src="data/"+name+".js";s.onload=()=>ok(window[global]);s.onerror=bad;document.head.appendChild(s);});
}
const loadAll=()=>Promise.all([load("dicts","BD_DICT"),load("strongs","BD_STRONGS"),load("kjv","BD_KJV")]);
/* ---------- notes ---------- */
const NK="bibledict:notes:";
const getNote=k=>{try{return localStorage.getItem(NK+k)||""}catch(e){return ""}};
const setNote=(k,v)=>{try{v.trim()?localStorage.setItem(NK+k,v):localStorage.removeItem(NK+k)}catch(e){} countNotes();};
function allNotes(){const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(NK))o[k.slice(NK.length)]=localStorage.getItem(k);}}catch(e){}return o;}
function countNotes(){el("cMine").textContent=Object.keys(allNotes()).length;}
/* ---------- verses ---------- */
function verse(ref){const [b,c,v]=ref.split(".");const K=window.BD_KJV;return K&&K[b]&&K[b][c-1]&&K[b][c-1][v-1]||"";}
const refName=ref=>{const [b,c,v]=ref.split(".");return (BK.names[b]||b)+" "+c+":"+v;};
function parseRef(s){ // "Eph 2:8-9" -> ["Eph.2.8","Eph.2.9"]
  const m=String(s).trim().match(/^([1-3]?\s?[A-Za-z][A-Za-z ]*?)\.?\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?/);
  if(!m) return [];
  const b=BK.alias[m[1].toLowerCase()]||BK.alias[m[1].toLowerCase().replace(/\s/g,"")];
  if(!b) return [];
  const a=+(m[3]||1), z=Math.min(+(m[4]||a),a+7), out=[];
  for(let v=a;v<=z;v++) out.push(`${b}.${m[2]}.${v}`);
  return out;
}
function hl(text,word){
  if(!word) return esc(text);
  const re=new RegExp("\\b("+word.replace(/[^a-z']/gi,"")+"\\w*)","gi");
  return esc(text).replace(re,"<mark>$1</mark>");
}
/* ---------- search ---------- */
let letter="", featuredOnly=false, current=null;
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];}for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length];}
function suggest(q){return KEYS.map(k=>[k,lev(q,k)]).filter(x=>x[1]<=2).sort((a,b)=>a[1]-b[1]||(I[b[0]]?I[b[0]][3]:0)-(I[a[0]]?I[a[0]][3]:0)).slice(0,8).map(x=>x[0]);}
function search(q){
  q=q.trim().toLowerCase();
  if(/^[hg]\d+$/.test(q)) return {strong:q.toUpperCase().replace(/^([HG])0*/,"$1"),list:[]};
  let list;
  if(!q){ list=featuredOnly||!letter?CORE.map(e=>e.h.toLowerCase()).sort():KEYS.filter(k=>k[0]===letter.toLowerCase()); }
  else{
    const pre=[],sub=[];
    for(const k of KEYS){ if(k.startsWith(q))pre.push(k); else if(k.includes(q))sub.push(k); }
    pre.sort((a,b)=>(a===q?-1:b===q?1:0)||a.length-b.length||a.localeCompare(b));
    list=pre.concat(sub);
    if(list.length<15){ // meaning search in short answers
      for(const k of KEYS){ if(list.length>=60)break; const e=I[k]; if(e&&!list.includes(k)&&q.length>3&&e[1].toLowerCase().includes(q)) list.push(k); }
    }
  }
  if(letter&&q) list=list.filter(k=>k[0]===letter.toLowerCase());
  return {list};
}
const disp=k=>CMAP[k]?CMAP[k].h:(I[k]?I[k][0]:k);
function catOf(k){if(CMAP[k])return CMAP[k].c;const e=I[k];if(!e)return"";return e[6].includes("h")&&!e[6].includes("e")?"Name":e[6]?"Dictionary":e[4].length?"KJV word":"KJV word";}
function drawRail(){
  const L="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  el("rail").innerHTML=`<button data-l="*" class="has${!letter?" on":""}">★ Featured</button>`+L.map(c=>`<button data-l="${c}" class="has${letter===c?" on":""}">${c}</button>`).join("");
}
function drawIndex(){
  const r=search(el("q").value);
  if(r.strong){el("index").innerHTML=`<button class="idx-item" data-s="${r.strong}">${r.strong}<span class="cat">Strong's number</span></button>`;return;}
  const list=r.list, shown=list.slice(0,300);
  el("index").innerHTML=shown.length?shown.map(k=>`<button class="idx-item${current===k?" on":""}" data-h="${esc(k)}">${esc(disp(k))}<span class="cat${CMAP[k]?" added":""}">${CMAP[k]?"★ ":""}${esc(catOf(k))}</span></button>`).join("")+(list.length>300?`<p class="idx-empty">${list.length-300} more — keep typing to narrow.</p>`:"")
    :`<p class="idx-empty">No match. Press Enter to see suggestions.</p>`;
}
/* ---------- entry ---------- */
function shortFor(k){
  const c=CMAP[k], e=I[k];
  if(c) return {t:c.d, src:"Featured entry"};
  if(e) return {t:e[1], src:SRCNAME[e[2]]||""};
  return null;
}
function strongBlock(n,cnt){
  const s=window.BD_STRONGS[n]; if(!s) return "";
  return `<div class="root"><div class="root-h"><button class="chip sn" data-s="${n}">${n}</button> <span class="lemma">${esc(s.l)}</span> <i>${esc(s.x)}</i> <span class="pron">(${esc(s.p)})</span>${cnt?` <span class="muted">— this English word renders it ${cnt}×</span>`:""}</div>
   ${s.d?`<p><b>Root:</b> ${linkStrongs(esc(s.d))}</p>`:""}${s.df?`<p><b>Meaning:</b> ${linkStrongs(esc(s.df))}</p>`:""}
   ${s.o&&s.o.length?`<ul class="outline">${s.o.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
   ${s.k?`<p><b>KJV renders it:</b> ${esc(s.k)}</p>`:""}</div>`;
}
const linkStrongs=h=>h.replace(/\b([HG])(\d{1,4})\b/g,'<button class="chip sn" data-s="$1$2">$1$2</button>');
function versesHTML(refs,word){
  return `<ul class="vlist">${refs.map(r=>{const t=verse(r);return `<li><b>${esc(refName(r))}</b> ${t?hl(t,word):'<span class="muted">(text unavailable)</span>'}</li>`}).join("")}</ul>`;
}
async function drawEntry(k){
  current=k; document.body.classList.add("reading");
  const c=CMAP[k], e=I[k], sh=shortFor(k);
  location.hash=encodeURIComponent(k);
  el("entry").innerHTML=`<button class="btn back" id="back">← All entries</button>
   <div class="entry-head"><h2>${esc(disp(k))}</h2><div class="tagline">${c?'<span class="tag mine">★ Featured</span>':""}<span class="tag">${esc(catOf(k))}</span>${e&&e[3]?`<span class="tag">KJV: ${e[3].toLocaleString()}×</span>`:""}</div></div>
   ${c&&c.o?`<p class="orig">${esc(c.o)}</p>`:""}
   <section class="short"><div class="sec-label">Short answer</div><p>${esc(sh.t)}</p><div class="src">Source: ${esc(sh.src)}</div></section>
   <details class="deep" id="deep"><summary>In-depth <span class="muted">— Hebrew/Greek roots, full dictionary articles, KJV verses</span></summary><div id="deepBody"><p class="loading">Loading<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p></div></details>
   <section class="notes"><div class="sec-label">My notes</div><textarea id="note" placeholder="Write your own notes on “${esc(disp(k))}” — saved on this computer.">${esc(getNote(k))}</textarea><div class="src" id="nsaved"></div></section>`;
  el("back").onclick=()=>{document.body.classList.remove("reading");window.scrollTo(0,0)};
  el("note").oninput=ev=>{setNote(k,ev.target.value);el("nsaved").textContent="Saved";};
  drawIndex(); window.scrollTo(0,0);
  el("deep").addEventListener("toggle",()=>{try{localStorage.setItem("bibledict:deepOpen",el("deep").open?"1":"0")}catch(x){}});
  try{ if(localStorage.getItem("bibledict:deepOpen")==="1") el("deep").open=true; }catch(x){}
  await loadAll(); if(current!==k) return;
  const D=window.BD_DICT[k]||{}, parts=[];
  const stem=e&&e[7]; const D2=(!D.e&&!D.s&&stem&&window.BD_DICT[stem])||null;
  if(c){ if(c.n) parts.push(`<div class="sec-label">Featured study note</div><p class="note">${esc(c.n)}</p>`); }
  const nums=e?e[4]:[];
  if(nums.length) parts.push(`<div class="sec-label">Hebrew &amp; Greek roots</div>`+nums.map(([n,cnt])=>strongBlock(n,cnt)).join(""));
  const art=(t,h)=>`<div class="sec-label">${t}</div><div class="article">${h}</div>`;
  if(D.e) parts.push(art("Easton's Bible Dictionary (1897)",D.e));
  if(D.s) parts.push(art("Smith's Bible Dictionary (1884)",D.s));
  if(D.h) parts.push(art("Hitchcock's Bible Names",`<p><b>${esc(disp(k))}</b> — “${esc(D.h)}”</p>`));
  if(D2){ if(D2.e)parts.push(art(`Easton's — “${esc(stem)}”`,D2.e)); else if(D2.s)parts.push(art(`Smith's — “${esc(stem)}”`,D2.s)); }
  let refs=[]; if(c) (c.r||[]).forEach(r=>refs.push(...parseRef(r)));
  refs=refs.concat((e?e[5]:[]).filter(r=>!refs.includes(r)));
  if(refs.length) parts.push(`<div class="sec-label">Scripture (KJV)${e&&e[3]>refs.length?` <span class="muted">— ${refs.length} of ${e[3].toLocaleString()} occurrences</span>`:""}</div>`+versesHTML(refs.slice(0,18),c?"":k));
  if(c&&c.s&&c.s.length) parts.push(`<div class="sec-label">See also</div><div>${c.s.map(x=>`<button class="chip" data-h="${esc(x.toLowerCase())}">${esc(x)}</button>`).join("")}</div>`);
  if(!parts.length) parts.push(`<p class="muted">No further detail in the public-domain sources for this word.</p>`);
  el("deepBody").innerHTML=parts.join("");
  wireDeep();
}
function wireDeep(){
  el("entry").querySelectorAll("a.vr").forEach(a=>{a.href="#";a.onclick=ev=>{ev.preventDefault();
    let n=a.nextElementSibling; if(n&&n.classList.contains("vpop")){n.remove();return;}
    const t=verse(a.dataset.r); const s=document.createElement("span"); s.className="vpop"; s.textContent=t?`${refName(a.dataset.r)} — ${t}`:"(verse not found)"; a.after(s);};});
}
async function drawStrong(n){
  current=null; document.body.classList.add("reading");
  el("entry").innerHTML=`<p class="loading">Loading<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>`;
  await loadAll(); const s=window.BD_STRONGS[n];
  if(!s){drawMiss(n);return;}
  location.hash=n;
  el("entry").innerHTML=`<button class="btn back" id="back">← All entries</button>
   <div class="entry-head"><h2>${esc(s.l)} <span class="muted" style="font-size:.6em">${n}</span></h2><div class="tagline"><span class="tag">${n[0]==="H"?"Hebrew":"Greek"}</span><span class="tag">KJV: ${s.n}×</span></div></div>
   <section class="short"><div class="sec-label">Short answer</div><p><i>${esc(s.x)}</i> (${esc(s.p)}): ${esc(s.df||s.o[0]||s.k)}</p><div class="src">Source: Strong's ${n[0]==="H"?"Hebrew":"Greek"} Dictionary</div></section>
   <details class="deep" open><summary>In-depth</summary>${strongBlock(n,0)}
   ${s.w.length?`<div class="sec-label">English words used for it in the KJV</div><div>${s.w.map(([w,c])=>`<button class="chip" data-h="${esc(w.split(/\s/)[0])}">${esc(w)} (${c})</button>`).join("")}</div>`:""}
   ${s.r.length?`<div class="sec-label">Scripture (KJV)</div>`+versesHTML(s.r,""):""}</details>`;
  el("back").onclick=()=>{document.body.classList.remove("reading");};
  window.scrollTo(0,0);
}
function drawMiss(word){
  current=null; document.body.classList.add("reading");
  const sg=suggest(word.toLowerCase());
  el("entry").innerHTML=`<button class="btn back" id="back">← All entries</button><div class="miss" id="miss"><h3>${esc(word)}</h3>
   <p>This word doesn't appear in the King James Bible or in Easton's, Smith's, or Hitchcock's dictionaries.</p>
   ${sg.length?`<div class="sec-label">Did you mean</div><div>${sg.map(x=>`<button class="chip" data-h="${esc(x)}">${esc(disp(x))}</button>`).join("")}</div>`:""}
   <section class="notes"><div class="sec-label">My notes</div><textarea id="note" placeholder="You can still keep your own notes on “${esc(word)}”.">${esc(getNote(word.toLowerCase()))}</textarea></section></div>`;
  el("back").onclick=()=>{document.body.classList.remove("reading");};
  el("note").oninput=ev=>setNote(word.toLowerCase(),ev.target.value);
}
function drawStart(){
  current=null; document.body.classList.remove("reading");
  el("entry").innerHTML=`<div class="placeholder"><p class="lead">Search any word in the King James Bible.</p>
   <p>Every word has a <b>short answer</b>, and an <b>In-depth</b> section with its Hebrew or Greek roots (Strong's), full articles from Easton's and Smith's dictionaries, name meanings from Hitchcock, and the KJV verses where it appears.</p>
   <p>Type a Strong's number like <b>H2617</b> or <b>G5485</b> to look up the original word. The ★ Featured entries are your original study entries. Use <b>My notes</b> on any word to keep your own thoughts.</p></div>`;
}
function open_(w){
  const q=String(w).trim(); if(!q) return; const k=q.toLowerCase();
  if(/^[hg]\d+$/i.test(q)) return drawStrong(q.toUpperCase().replace(/^([HG])0*/,"$1"));
  if(I[k]||CMAP[k]) return drawEntry(k);
  const st=[["ieth","y"],["eth",""],["est",""],["eth","e"],["ed",""],["ed","e"],["ing",""],["es",""],["s",""]];
  for(const [a,b] of st) if(k.endsWith(a)){const c=k.slice(0,-a.length)+b; if(I[c]) return drawEntry(c);}
  drawMiss(q);
}
async function exportNotes(){
  const n=allNotes(); if(!Object.keys(n).length){alert("No notes yet. Open any word and type in the My notes box.");return;}
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(n,null,2)],{type:"application/json"})); a.download="bible-dictionary-notes.json"; a.click();
}
/* ---------- wiring ---------- */
document.addEventListener("click",ev=>{
  const s=ev.target.closest("[data-s]"); if(s){ev.preventDefault();drawStrong(s.dataset.s);return;}
  const h=ev.target.closest("[data-h]"); if(h&&!h.closest("#rail")){ev.preventDefault();open_(h.dataset.h);}
});
el("rail").addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;letter=b.dataset.l==="*"?"":b.dataset.l;featuredOnly=!letter;drawRail();drawIndex();});
let tmr; el("q").addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(drawIndex,80);});
el("q").addEventListener("keydown",ev=>{if(ev.key==="Enter"){const r=search(el("q").value);const q=el("q").value.trim().toLowerCase();open_(r.list[0]===q||!r.list.length||r.strong?el("q").value:r.list[0]);}});
el("rand").onclick=()=>{const pool=Math.random()<.5?CORE.map(e=>e.h.toLowerCase()):KEYS.filter(k=>I[k]&&I[k][6]);drawEntry(pool[Math.floor(Math.random()*pool.length)]);};
el("exp").onclick=exportNotes;
drawRail(); drawIndex(); countNotes();
el("cCore").textContent=KEYS.length.toLocaleString();
const h0=decodeURIComponent(location.hash.slice(1)); if(h0) open_(h0); else drawStart();
setTimeout(()=>loadAll().catch(()=>{}),400);
window.BD_READY=performance.now();

if("serviceWorker" in navigator && location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(()=>{});
