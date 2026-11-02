"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store={get(k,d){try{return localStorage.getItem(k)??d}catch{return d}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const S={g:store.get("g","men"),cache:{}};
const COMP={IPL:"IPL",WPL:"WPL",IND:"India T20Is"},PHASE=["All overs","Powerplay, 1-6","Middle, 7-15","Death, 16-20"];
const R={p:0,c:1,y:2,ph:3,inn:4,runs:5,balls:6,f4:7,f6:8,dots:9,outs:10,binn:11,legal:12,conc:13,wk:14,bdot:15,bb:16};
const get=async u=>{if(u in S.cache)return S.cache[u];const r=await fetch(u);if(!r.ok)throw new Error(u+" returned "+r.status);return S.cache[u]=await r.json()};
const D=f=>get(`data/${S.g}/${f}`);
const num=(a,b,m=1,d=1)=>b?(m*a/b).toFixed(d):"–";
const overs=b=>Math.floor(b/6)+(b%6?"."+b%6:"");
const cr=v=>v==null?"–":v>=1?"₹"+(+v.toFixed(2))+" cr":"₹"+Math.round(v*100)+" lakh";
const fdate=s=>s?new Date(s.length>10?s:s+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"–";
const opt=(v,l,sel)=>`<option value="${esc(v)}"${String(v)===String(sel)?" selected":""}>${esc(l)}</option>`;
const conf=b=>b<30?'<span class="warn">Exploratory, under 30 balls</span>':b<100?"Some evidence, 30-99 balls":'<span class="ok">Stronger sample, 100+ balls</span>';
const table=(cols,rows,opts={})=>rows.length?`<div class="tw"><table><thead><tr>${cols.map((c,i)=>`<th scope="col"${c.l?' class="l"':""}>${opts.sort?`<button data-sort="${i}">${esc(c.t)}${opts.sort.i===i?(opts.sort.d>0?" ▲":" ▼"):""}</button>`:esc(c.t)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map((c,i)=>`<td${c.l?' class="l"':""}>${c.h?c.h(r):esc(c.v(r))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<div class="tw"><p class="empty">${esc(opts.empty||"No records match these filters. Widen the season, phase or minimum balls.")}</p></div>`;
function csv(name,cols,rows){const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;const t=[cols.map(c=>q(c.t)).join(","),...rows.map(r=>cols.map(c=>q(c.v(r))).join(","))].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/csv"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function sum(rows){const o={inn:0,runs:0,balls:0,f4:0,f6:0,dots:0,outs:0,binn:0,legal:0,conc:0,wk:0,bdot:0,bb:0};for(const r of rows)for(const k in o)o[k]+=r[R[k]];return o}
const compsOf=()=>S.g==="men"?["IPL","IND"]:["WPL","IND"];
const pl=(p)=>`<a href="#/player/${p.id}">${esc(p.n)}</a>`;
const set=(h)=>{$("#main").innerHTML=h};

async function home(){
  const [ms,news,meta,au,pp,rw]=await Promise.all([D("matches.json"),get("data/news.json").catch(()=>null),get("data/meta.json"),get("data/auction.json"),D("players.json"),D("rows.json")]);
  const m=ms[0],lg=compsOf()[0],yr=Math.max(...rw.rows.filter(r=>r[1]===lg).map(r=>r[2]));
  const g=new Map();for(const r of rw.rows)if(r[1]===lg&&r[2]===yr&&r[3]===0)g.set(r[0],r);
  const topB=[...g.values()].filter(r=>r[6]>0).sort((a,b)=>b[5]-a[5]).slice(0,5),topW=[...g.values()].filter(r=>r[12]>0).sort((a,b)=>b[14]-a[14]||a[13]-b[13]).slice(0,5);
  const side=i=>{const t=[...String(i.runs)].map(c=>`<span class="tile">${c}</span>`).join("");return `<div class="side"><b>${esc(i.team)}</b><div class="tiles">${t}<span class="tile sep">/</span><span class="tile">${i.wkts}</span><span class="ov">${overs(i.balls)} ov</span></div></div>`};
  const ev=au.events.filter(e=>e.date>=new Date().toISOString().slice(0,10)&&(S.g==="men"?e.league==="IPL":e.league==="WPL"));
  const rs=resultText(m);
  set(`<h1 class="sr" style="margin-bottom:12px">${S.g==="men"?"Men's":"Women's"} cricket, ball by ball</h1>
  ${m?`<section class="board" aria-label="Latest match"><div class="head"><span>${esc(m.event||COMP[m.comp])}${m.stage?", "+esc(m.stage):""}</span><span>${fdate(m.date)}, ${esc(m.venue)}</span></div>${m.inn.map(side).join("")}<p class="res">${esc(rs)}</p></section>`:""}
  ${ev.length?`<p class="call"><b>Next:</b> ${ev.map(e=>`${esc(e.league)} ${esc(e.event)} on ${fdate(e.date)}${e.venue?" in "+esc(e.venue):""}`).join("; ")}. <a href="#/auction">See auction data</a></p>`:""}
  <div class="grid two"><section><h2>${lg} ${yr} most runs</h2>${table([{t:"Batter",l:1,h:r=>pl(pp[r[0]])},{t:"Runs",v:r=>r[5]},{t:"Balls",v:r=>r[6]},{t:"SR",v:r=>num(r[5],r[6],100)}],topB)}
  <h2>${lg} ${yr} most wickets</h2>${table([{t:"Bowler",l:1,h:r=>pl(pp[r[0]])},{t:"Wkts",v:r=>r[14]},{t:"Overs",v:r=>overs(r[12])},{t:"Econ",v:r=>num(r[13],r[12],6,2)}],topW)}</section>
  <section><h2>Recent matches</h2><ul class="list">${ms.slice(1,6).map(x=>`<li><b>${esc(x.teams.join(" v "))}</b><br><small>${fdate(x.date)}, ${esc(COMP[x.comp])}: ${esc(resultText(x))}</small></li>`).join("")}</ul>
  <h2>Latest headlines</h2>${news&&news[S.g]?.length?newsList(news[S.g].slice(0,5)):'<p class="mut">Headlines appear after the next data refresh.</p>'}</section></div>`);
}
function resultText(m){if(!m)return"";if(m.winner){const b=m.by||{},k=Object.keys(b)[0];return `${m.winner} won${k?` by ${b[k]} ${k}`:""}${m.method?` (${m.method})`:""}`}return m.result?m.result[0].toUpperCase()+m.result.slice(1):"Result not recorded"}
const newsList=a=>`<ul class="list">${a.map(n=>`<li><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a><br><small><span class="tag">${esc(n.tag)}</span>${esc(n.source)}, ${fdate(n.at)}</small></li>`).join("")}</ul>`;

const F={comp:"",year:"",ph:"0",kind:"bat",min:"60",q:"",si:null,sd:-1};
async function players(){
  const [pp,rw]=await Promise.all([D("players.json"),D("rows.json")]);
  if(!compsOf().includes(F.comp))F.comp=compsOf()[0],F.year="";
  const years=[...new Set(rw.rows.filter(r=>r[1]===F.comp).map(r=>r[2]))].sort((a,b)=>b-a);
  const g=new Map();
  for(const r of rw.rows){if(r[1]!==F.comp||r[3]!=F.ph||(F.year&&r[2]!=F.year))continue;(g.get(r[0])||g.set(r[0],[]).get(r[0])).push(r)}
  const q=F.q.toLowerCase(),min=+F.min||0;let rows=[...g].map(([i,x])=>({p:pp[i],...sum(x)})).filter(r=>!q||r.p.n.toLowerCase().includes(q));
  const bat=F.kind==="bat";rows=rows.filter(r=>(bat?r.balls:r.legal)>=min);
  const cols=bat?[{t:"Player",l:1,h:r=>pl(r.p),v:r=>r.p.n},{t:"Team",l:1,v:r=>r.p.t},{t:"Inns",v:r=>r.inn},{t:"Runs",v:r=>r.runs},{t:"Balls",v:r=>r.balls},{t:"SR",v:r=>num(r.runs,r.balls,100)},{t:"Avg",v:r=>num(r.runs,r.outs,1,2)},{t:"4s",v:r=>r.f4},{t:"6s",v:r=>r.f6},{t:"Dot %",v:r=>num(r.dots,r.balls,100)}]:
  [{t:"Player",l:1,h:r=>pl(r.p),v:r=>r.p.n},{t:"Team",l:1,v:r=>r.p.t},{t:"Inns",v:r=>r.binn},{t:"Overs",v:r=>overs(r.legal)},{t:"Wkts",v:r=>r.wk},{t:"Econ",v:r=>num(r.conc,r.legal,6,2)},{t:"Avg",v:r=>num(r.conc,r.wk,1,2)},{t:"SR",v:r=>num(r.legal,r.wk,1)},{t:"Dot %",v:r=>num(r.bdot,r.legal,100)},{t:"Bdry %",v:r=>num(r.bb,r.legal,100)}];
  const si=F.si??(bat?3:4);const c=cols[si];const nv=r=>{const v=c.v(r),n=parseFloat(v);return isNaN(n)?(c.l?v:-Infinity):n};
  rows.sort((a,b)=>{const x=nv(a),y=nv(b);return (x>y?1:x<y?-1:0)*F.sd});
  S.exp=()=>csv(`pitchxi-${S.g}-${F.comp}-${F.year||"all"}-${F.kind}.csv`,cols,rows);
  set(`<h1>Players</h1><p class="lede">${rows.length} players match. Figures use ${esc(PHASE[F.ph].toLowerCase())}${F.year?` in ${F.year}`:", all seasons"}.</p>
  <div class="filters"><label>Competition<select data-f="comp">${compsOf().map(c=>opt(c,COMP[c],F.comp))}</select></label>
  <label>Season<select data-f="year">${opt("","All seasons",F.year)}${years.map(y=>opt(y,y,F.year))}</select></label>
  <label>Overs<select data-f="ph">${PHASE.map((l,i)=>opt(i,l,F.ph))}</select></label>
  <label>Skill<select data-f="kind">${opt("bat","Batting",F.kind)}${opt("bowl","Bowling",F.kind)}</select></label>
  <label>Minimum balls<input data-f="min" type="number" min="0" step="10" value="${esc(F.min)}" style="width:90px"></label>
  <label>Find a player<input data-f="q" type="search" value="${esc(F.q)}" placeholder="e.g. Kohli or Mandhana"></label>
  <button class="btn" id="exp">Download CSV</button></div>${table(cols,rows.slice(0,150),{sort:{i:si,d:F.sd}})}${rows.length>150?`<p class="mut">Showing the top 150. The CSV has all ${rows.length}.</p>`:""}`);
  $("#exp").onclick=S.exp;
  $$("[data-f]").forEach(e=>e.addEventListener(e.tagName==="INPUT"?"change":"change",()=>{F[e.dataset.f]=e.value;if(e.dataset.f==="kind"||e.dataset.f==="comp"){F.si=null;if(e.dataset.f==="comp")F.year=""}players()}));
  $$("[data-sort]").forEach(b=>b.onclick=()=>{const i=+b.dataset.sort;if(F.si===i||(F.si==null&&si===i))F.sd=-F.sd;else F.sd=-1;F.si=i;players()});
}
function ribbon(rows,kind){
  const parts=[1,2,3].map(i=>sum(rows.filter(r=>r[3]===i)));
  const val=p=>kind==="bat"?(p.balls?100*p.runs/p.balls:null):(p.legal?6*p.conc/p.legal:null);
  const vs=parts.map(val),mx=Math.max(...vs.filter(v=>v!=null),1);
  return `<div class="ribbon" role="img" aria-label="${kind==="bat"?"Strike rate":"Economy"} by phase: ${vs.map((v,i)=>PHASE[i+1]+" "+(v==null?"no data":v.toFixed(kind==="bat"?0:2))).join(", ")}">${parts.map((p,i)=>{const v=vs[i],n=kind==="bat"?p.balls:p.legal;return `<div class="rib ${kind==="bat"?"":"bowl"} ${v==null?"none":""}"><b>${v==null?"–":v.toFixed(kind==="bat"?0:2)}</b><i style="height:${v==null?4:Math.max(6,70*v/mx)}%"></i><span>${["1-6","7-15","16-20"][i]}: ${n} balls</span></div>`}).join("")}</div>`;
}
async function player(id){
  const [pp,rw,au]=await Promise.all([D("players.json"),D("rows.json"),get("data/auction.json")]);
  const i=pp.findIndex(p=>p.id===id);if(i<0)return set(`<h1>Player not found</h1><p class="lede">This player isn't in the ${S.g==="men"?"men's":"women's"} data. Switch using the toggle above, or <a href="#/players">browse players</a>.</p>`);
  const p=pp[i],x=await D(`p/${id}.json`),mine=rw.rows.filter(r=>r[0]===i),comps=compsOf().filter(c=>mine.some(r=>r[1]===c));
  const c=S.pc&&comps.includes(S.pc)?S.pc:comps[0],rs=mine.filter(r=>r[1]===c),all=sum(rs.filter(r=>r[3]===0));
  const seasons=[...new Set(rs.map(r=>r[2]))].sort((a,b)=>b-a).map(y=>({y,...sum(rs.filter(r=>r[2]===y&&r[3]===0))}));
  const mapp=(k)=>x[k].filter(v=>v[0]===c).map(v=>({o:pp[v[1]],balls:v[2],runs:v[3],outs:v[4],y0:v[7],y1:v[8]})).filter(v=>v.balls>0).sort((a,b)=>b.balls-a.balls).slice(0,10);
  const vcols=[{t:"Opponent",l:1,h:r=>pl(r.o)},{t:"Balls",v:r=>r.balls},{t:"Runs",v:r=>r.runs},{t:"SR",v:r=>num(r.runs,r.balls,100)},{t:"Outs",v:r=>r.outs},{t:"Years",v:r=>r.y0===r.y1?r.y0:r.y0+"-"+r.y1},{t:"Evidence",l:1,h:r=>conf(r.balls)}];
  const auc=au.sold.filter(a=>a.pid===id);
  const ven=x.venues.filter(v=>v[0]===c).sort((a,b)=>(b[2]+b[6]/6)-(a[2]+a[6]/6)).slice(0,8);
  S.exp=()=>csv(`pitchxi-${p.n}-${c}.csv`,[{t:"Season",v:r=>r.y},{t:"Runs",v:r=>r.runs},{t:"Balls",v:r=>r.balls},{t:"Dismissals",v:r=>r.outs},{t:"Legal balls bowled",v:r=>r.legal},{t:"Runs conceded",v:r=>r.conc},{t:"Wickets",v:r=>r.wk}],seasons);
  set(`<h1>${esc(p.n)}</h1><p class="lede">${esc(p.t)}. Last match in this data ${fdate(p.d)}.</p>
  <div class="filters">${comps.length>1?`<label>Competition<select id="pc">${comps.map(k=>opt(k,COMP[k],c))}</select></label>`:""}<a class="btn" href="#/compare/${id}">Compare this player</a><button class="btn" id="exp">Download CSV</button></div>
  <div class="stats"><div><b>${p.m[c]||0}</b><span>Matches</span></div>${all.balls?`<div><b>${all.runs}</b><span>Runs</span></div><div><b>${num(all.runs,all.balls,100)}</b><span>Strike rate</span></div><div><b>${num(all.runs,all.outs,1,2)}</b><span>Average</span></div><div><b>${p.hs[c]??"–"}</b><span>Highest</span></div>`:""}${all.legal?`<div><b>${all.wk}</b><span>Wickets</span></div><div><b>${num(all.conc,all.legal,6,2)}</b><span>Economy</span></div>`:""}</div>
  <div class="grid two">${all.balls?`<section><h2>Strike rate across the 20 overs</h2>${ribbon(rs,"bat")}</section>`:""}${all.legal?`<section><h2>Economy across the 20 overs</h2>${ribbon(rs,"bowl")}</section>`:""}</div>
  <h2>By season</h2>${table([{t:"Season",v:r=>r.y},{t:"Runs",v:r=>r.runs},{t:"Balls",v:r=>r.balls},{t:"SR",v:r=>num(r.runs,r.balls,100)},{t:"Avg",v:r=>num(r.runs,r.outs,1,2)},{t:"Overs",v:r=>overs(r.legal)},{t:"Wkts",v:r=>r.wk},{t:"Econ",v:r=>num(r.conc,r.legal,6,2)}],seasons)}
  ${auc.length?`<h2>Auction history</h2>${table([{t:"Season",v:r=>r.league+" "+r.season},{t:"Team",l:1,v:r=>r.team},{t:"Base",v:r=>cr(r.base_cr)},{t:"Sold",v:r=>cr(r.price_cr)}],auc)}`:""}
  ${all.balls?`<h2>Most-faced bowlers</h2>${table(vcols,mapp("bat"))}`:""}${all.legal?`<h2>Most-bowled-to batters</h2>${table(vcols,mapp("bowl"))}`:""}
  <h2>Venues</h2>${table([{t:"Venue",l:1,v:v=>v[1]},{t:"Runs",v:v=>v[3]},{t:"SR",v:v=>num(v[3],v[4],100)},{t:"Overs",v:v=>overs(v[6])},{t:"Wkts",v:v=>v[8]},{t:"Econ",v:v=>num(v[7],v[6],6,2)}],ven)}
  <h2>Recent innings</h2>${table([{t:"Date",v:l=>fdate(l[0])},{t:"Competition",l:1,v:l=>COMP[l[1]]},{t:"Against",l:1,v:l=>l[2]},{t:"Performance",l:1,v:l=>l[3]==="bat"?`${l[4]}${l[6]?"":"*"} (${l[5]})`:`${l[4]}/${l[5]} in ${overs(l[6])}`}],x.log.slice(0,10))}`);
  $("#exp").onclick=S.exp;const s=$("#pc");if(s)s.onchange=()=>{S.pc=s.value;player(id)};
}
function picker(id,label,pp,val){return `<label>${label}<input id="${id}" list="pl" value="${esc(pp.find(p=>p.id===val)?.n||"")}" placeholder="Type a name"></label>`}
const dl=pp=>`<datalist id="pl">${pp.slice().sort((a,b)=>b.d.localeCompare(a.d)).map(p=>`<option value="${esc(p.n)}">`).join("")}</datalist>`;
const byName=(pp,n)=>pp.filter(p=>p.n===n).sort((a,b)=>b.d.localeCompare(a.d))[0];
async function compare(a){
  const [pp,rw]=await Promise.all([D("players.json"),D("rows.json")]);
  if(a)S.ca=a;const C=S.cmp=S.cmp||{ph:"0",comp:compsOf()[0]};if(!compsOf().includes(C.comp))C.comp=compsOf()[0];
  const ids=[S.ca,S.cb].filter(Boolean),P=ids.map(id=>pp.findIndex(p=>p.id===id)).filter(i=>i>=0);
  const rows=P.map(i=>rw.rows.filter(r=>r[0]===i&&r[1]===C.comp));
  const met=[["Innings batted",s=>s.inn],["Runs",s=>s.runs],["Balls faced",s=>s.balls],["Strike rate",s=>num(s.runs,s.balls,100)],["Average",s=>num(s.runs,s.outs,1,2)],["Dot %",s=>num(s.dots,s.balls,100)],["Boundary %",s=>num(s.f4+s.f6,s.balls,100)],["Overs bowled",s=>overs(s.legal)],["Wickets",s=>s.wk],["Economy",s=>num(s.conc,s.legal,6,2)],["Bowling SR",s=>num(s.legal,s.wk,1)]];
  const ss=rows.map(r=>sum(r.filter(x=>x[3]==C.ph)));
  set(`<h1>Compare</h1><p class="lede">Put two players side by side in the same competition and overs.</p>${dl(pp)}
  <div class="filters">${picker("ca","First player",pp,S.ca)}${picker("cb","Second player",pp,S.cb)}
  <label>Competition<select id="cc">${compsOf().map(c=>opt(c,COMP[c],C.comp))}</select></label><label>Overs<select id="cp">${PHASE.map((l,i)=>opt(i,l,C.ph))}</select></label></div>
  ${P.length?table([{t:"Measure",l:1,v:m=>m[0]},...P.map((i,k)=>({t:pp[i].n,v:m=>m[1](ss[k])}))],met):`<div class="tw"><p class="empty">Choose a player to start.</p></div>`}
  ${P.length?`<div class="grid two">${P.map((i,k)=>`<section><h2>${esc(pp[i].n)}</h2>${ss[k].balls?ribbon(rows[k],"bat"):""}${ss[k].legal?ribbon(rows[k],"bowl"):""}</section>`).join("")}</div>`:""}`);
  const on=()=>{const x=byName(pp,$("#ca").value),y=byName(pp,$("#cb").value);S.ca=x?.id;S.cb=y?.id;C.comp=$("#cc").value;C.ph=$("#cp").value;compare()};
  $$("#ca,#cb,#cc,#cp").forEach(e=>e.onchange=on);
}
async function matchups(){
  const pp=await D("players.json");S.mu=S.mu||{};const M=S.mu;let body=`<div class="tw"><p class="empty">Choose a batter and a bowler to see their record.</p></div>`;
  const b=pp.find(p=>p.id===M.b),w=pp.find(p=>p.id===M.w);
  if(b&&w){const x=await D(`p/${b.id}.json`),wi=pp.indexOf(w),hits=x.bat.filter(v=>v[1]===wi);
    if(!hits.length)body=`<div class="tw"><p class="empty">${esc(b.n)} has not faced ${esc(w.n)} in this data.</p></div>`;
    else body=hits.map(v=>{const[c,,bl,r,o,d,bd,y0,y1]=v;return `<section class="call"><h3>${esc(COMP[c])}</h3><div class="stats"><div><b>${bl}</b><span>Balls</span></div><div><b>${r}</b><span>Runs</span></div><div><b>${o}</b><span>Dismissals</span></div><div><b>${num(r,bl,100)}</b><span>Strike rate</span></div><div><b>${num(d,bl,100)}</b><span>Dot %</span></div><div><b>${num(bd,bl,100)}</b><span>Boundary %</span></div></div><p>${conf(bl)}. Seen ${y0===y1?y0:y0+" to "+y1}.</p></section>`}).join("");}
  set(`<h1>Matchups</h1><p class="lede">Batter against bowler, with the sample size beside every number. A short record is a question for the coach, not a plan.</p>${dl(pp)}<div class="filters">${picker("mb","Batter",pp,M.b)}${picker("mw","Bowler",pp,M.w)}</div>${body}`);
  $$("#mb,#mw").forEach(e=>e.onchange=()=>{M.b=byName(pp,$("#mb").value)?.id;M.w=byName(pp,$("#mw").value)?.id;matchups()});
}
async function venues(){
  const vs=await D("venues.json");S.vc=compsOf().includes(S.vc)?S.vc:compsOf()[0];const rows=vs.filter(v=>v.c===S.vc);
  const sel=rows.find(v=>v.v===S.vv)||rows[0];const ys=sel?Object.entries(sel.s).slice(-10):[],mx=Math.max(1,...ys.map(y=>y[1][1]));
  set(`<h1>Venues</h1><p class="lede">Completed 20-over games only. Rain-revised and no-result games are left out, so a range is shown instead of a single par score.</p>
  <div class="filters"><label>Competition<select id="vc">${compsOf().map(c=>opt(c,COMP[c],S.vc))}</select></label>${rows.length?`<label>Venue<select id="vv">${rows.map(v=>opt(v.v,v.v,sel.v))}</select></label>`:""}</div>
  ${sel?`<div class="grid two"><section><h2>${esc(sel.v)}</h2><div class="stats"><div><b>${sel.n}</b><span>Matches</span></div><div><b>${sel.med}</b><span>Median first innings</span></div><div><b>${sel.lo}-${sel.hi}</b><span>Range</span></div><div><b>${num(sel.cw,sel.cn,100,0)}%</b><span>Chases won</span></div></div></section><section><h2>Median first innings by season</h2>${ys.map(([y,[n,m]])=>`<div class="bar"><span>${y}</span><i style="width:${100*m/mx}%"></i><span>${m} (${n})</span></div>`).join("")}</section></div>`:""}
  <h2>All venues</h2>${table([{t:"Venue",l:1,v:v=>v.v},{t:"Matches",v:v=>v.n},{t:"Median",v:v=>v.med},{t:"Lowest",v:v=>v.lo},{t:"Highest",v:v=>v.hi},{t:"Chases won",v:v=>num(v.cw,v.cn,100,0)+"%"},{t:"Last game",v:v=>fdate(v.last)}],rows)}`);
  $("#vc").onchange=e=>{S.vc=e.target.value;S.vv=null;venues()};const v=$("#vv");if(v)v.onchange=()=>{S.vv=v.value;venues()};
}
async function auction(){
  const [a,pp]=await Promise.all([get("data/auction.json"),D("players.json")]);const lg=S.g==="men"?"IPL":"WPL";
  const sold=a.sold.filter(r=>r.league===lg),seasons=[...new Set(sold.map(r=>r.season))].sort((x,y)=>y-x);S.as=seasons.includes(+S.as)?+S.as:seasons[0];S.at=S.at||"";
  const rows=sold.filter(r=>r.season===S.as),tot=rows.reduce((s,r)=>s+r.price_cr,0),teams=[...new Set(rows.map(r=>r.team))].map(t=>({t,s:rows.filter(r=>r.team===t).reduce((x,r)=>x+r.price_cr,0),n:rows.filter(r=>r.team===t).length})).sort((x,y)=>y.s-x.s);
  const show=rows.filter(r=>!S.at||r.team===S.at).sort((x,y)=>y.price_cr-x.price_cr),mx=teams[0]?.s||1,ev=a.events.filter(e=>e.league===lg&&e.date>=new Date().toISOString().slice(0,10));
  const after=r=>{const f=r.after||{};if(!f.m)return "–";const b=f.balls?`${f.runs} runs, SR ${num(f.runs,f.balls,100)}`:"",w=f.legal?`${f.wkts} wkts, econ ${num(f.conceded,f.legal,6,2)}`:"";return `${f.m} matches${b?"; "+b:""}${w?"; "+w:""}`};
  const cols=[{t:"Player",l:1,h:r=>r.pid&&pp.some(p=>p.id===r.pid)?`<a href="#/player/${r.pid}">${esc(r.player)}</a>`:esc(r.player),v:r=>r.player},{t:"Team",l:1,v:r=>r.team},{t:"Base",v:r=>cr(r.base_cr)},{t:"Sold",v:r=>cr(r.price_cr)+(r.rtm?" RTM":"")},{t:"Times base",v:r=>r.base_cr?(r.price_cr/r.base_cr).toFixed(1)+"x":"–"},{t:`${lg} ${S.as} output`,l:1,v:after}];
  S.exp=()=>csv(`pitchxi-${lg}-${S.as}-auction.csv`,cols,show);
  set(`<h1>Auction</h1><p class="lede">${rows.length} players sold for ${cr(tot)} at ${esc(lg)} ${S.as}, ${esc(rows[0]?.venue)}, ${fdate(rows[0]?.auction_date)}.</p>
  ${ev.map(e=>`<p class="call"><b>Upcoming:</b> ${esc(e.league)} ${esc(e.season)} ${esc(e.event)} on ${fdate(e.date)}${e.venue?" in "+esc(e.venue):""}.</p>`).join("")}
  <div class="filters"><label>Season<select id="as">${seasons.map(s=>opt(s,lg+" "+s,S.as))}</select></label><label>Team<select id="at">${opt("","All teams",S.at)}${teams.map(t=>opt(t.t,t.t,S.at))}</select></label><button class="btn" id="exp">Download CSV</button></div>
  <h2>Spent by team</h2>${teams.map(t=>`<div class="bar" style="grid-template-columns:64px 1fr 130px"><span>${esc(t.t)}</span><i style="width:${100*t.s/mx}%"></i><span>${cr(t.s)}, ${t.n} players</span></div>`).join("")}
  <h2>Players sold</h2>${table(cols,show)}<p class="mut">Output covers ${esc(lg)} ${S.as} from ball-by-ball data and stays blank until the season is played or the player can be matched to it with certainty. <a href="${esc(rows[0]?.source)}" target="_blank" rel="noopener">Price source</a>. Fees are auction bids; league rules can change what a player is actually paid.</p>`);
  $("#exp").onclick=S.exp;$("#as").onchange=e=>{S.as=e.target.value;S.at="";auction()};$("#at").onchange=e=>{S.at=e.target.value;auction()};
}
async function news(){
  const n=await get("data/news.json").catch(()=>null),items=n?.[S.g]||[],tags=[...new Set(items.map(i=>i.tag))];if(!tags.includes(S.nt))S.nt="";
  set(`<h1>News</h1><p class="lede">${n?`Headlines checked ${fdate(n.at)}. Each one opens at its publisher.`:""}</p>
  <div class="filters"><label>Topic<select id="nt">${opt("","All topics",S.nt)}${tags.map(t=>opt(t,t,S.nt))}</select></label></div>
  ${items.length?newsList(items.filter(i=>!S.nt||i.tag===S.nt)):'<div class="tw"><p class="empty">No headlines yet. They load with the next data refresh.</p></div>'}`);
  const s=$("#nt");if(s)s.onchange=()=>{S.nt=s.value;news()};
}
async function method(){
  const m=await get("data/meta.json");
  set(`<h1>Method</h1><p class="lede">Every number here can be rebuilt from public files. This is an independent portfolio project, not an official IPL, WPL or BCCI product.</p>
  <h2>Definitions</h2>${table([{t:"Measure",l:1,v:r=>r[0]},{t:"Rule",l:1,v:r=>r[1]}],[["Balls faced","All deliveries except wides. No-balls count."],["Average","Runs divided by dismissals. Retired hurt and retired not out are not dismissals."],["Legal balls","Exclude wides and no-balls."],["Economy","Six times bat runs, wides and no-balls, divided by legal balls. Byes, leg-byes and penalties are not charged."],["Bowler wickets","Bowled, caught, caught and bowled, lbw, stumped and hit wicket. Run-outs don't count."],["Phases","Fixed overs 1-6, 7-15 and 16-20. Shortened games aren't re-binned."],["Super overs","Excluded from all player figures."],["Auction links","A sale links to a player only when one Cricsheet record fits the name. Unsure names stay unlinked."]])}
  <h2>Data in this build</h2>${table([{t:"Source",l:1,v:s=>s.url},{t:"Matches",v:s=>s.matches},{t:"SHA-256",l:1,v:s=>s.sha256.slice(0,16)+"…"}],m.sources)}
  <p class="mut">Built ${fdate(m.built)}. Men: ${m.summary.men.matches} matches to ${fdate(m.summary.men.latest)}. Women: ${m.summary.women.matches} matches to ${fdate(m.summary.women.latest)}. India T20I files include India's matches only.</p>
  <h2>What this data can't show</h2><p>Public ball-by-ball records have no line, length, shot location, field placement, ball tracking, fitness or injury information. Nothing on this site guesses those. New matches appear when Cricsheet publishes them, usually a few days after play, so this isn't live scoring.</p>`);
}
async function route(){
  const h=location.hash.replace(/^#\/?/,"").split("/");
  $$("nav a").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#/"+h[0]));
  $$(".seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.g===S.g));
  try{await({"":home,players,player:()=>player(h[1]),compare:()=>compare(h[1]),matchups,venues,auction,news,method}[h[0]]||home)()}
  catch(e){console.error(e);set(`<h1>This page couldn't load</h1><p class="lede">${esc(e.message)}. Reload the page, or check the <a href="#/method">data status</a>.</p>`)}
  window.scrollTo(0,0);
}
$$(".seg button").forEach(b=>b.onclick=()=>{S.g=b.dataset.g;store.set("g",S.g);S.ca=S.cb=null;S.mu=null;if(location.hash.startsWith("#/player/"))location.hash="#/players";else route()});
addEventListener("hashchange",route);
(async()=>{route();try{const m=await get("data/meta.json");if(m.demo)$("#banner").textContent="Test data only. These matches are made up for checking the app.";
$("#foot").innerHTML=`Match data from <a href="https://cricsheet.org" target="_blank" rel="noopener">Cricsheet</a>. Updated ${fdate(m.built)}. Independent project, not affiliated with the IPL, WPL or BCCI.`}catch{}})();
