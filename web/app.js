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
const set=(h)=>{killCharts();$("#main").innerHTML=h};

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
function picker(id,label,pp,val){return `<label>${label}<input id="${id}" list="pl" value="${esc(pp.find(p=>p.id===val)?.n||"")}" placeholder="Type a name"></label>`}
const dl=pp=>`<datalist id="pl">${pp.slice().sort((a,b)=>b.d.localeCompare(a.d)).map(p=>`<option value="${esc(p.n)}">`).join("")}</datalist>`;
const byName=(pp,n)=>pp.filter(p=>p.n===n).sort((a,b)=>b.d.localeCompare(a.d))[0];
async function method(){
  const m=await get("data/meta.json");
  set(`<h1>Method</h1><p class="lede">Every number here can be rebuilt from public files. This is an independent portfolio project, not an official IPL, WPL or BCCI product.</p>
  <h2>Definitions</h2>${table([{t:"Measure",l:1,v:r=>r[0]},{t:"Rule",l:1,v:r=>r[1]}],[["Balls faced","All deliveries except wides. No-balls count."],["Average","Runs divided by dismissals. Retired hurt and retired not out are not dismissals."],["Legal balls","Exclude wides and no-balls."],["Economy","Six times bat runs, wides and no-balls, divided by legal balls. Byes, leg-byes and penalties are not charged."],["Bowler wickets","Bowled, caught, caught and bowled, lbw, stumped and hit wicket. Run-outs don't count."],["Phases","Fixed overs 1-6, 7-15 and 16-20. Shortened games aren't re-binned."],["Super overs","Excluded from all player figures."],["Auction links","A sale links to a player only when one Cricsheet record fits the name, or one candidate played for the buying team. Unsure names stay unlinked."]])}
  <h2>Data in this build</h2>${table([{t:"Source",l:1,v:s=>s.url},{t:"Matches",v:s=>s.matches},{t:"SHA-256",l:1,v:s=>s.sha256.slice(0,16)+"…"}],m.sources)}
  <p class="mut">Built ${fdate(m.built)}. Men: ${m.summary.men.matches} matches to ${fdate(m.summary.men.latest)}. Women: ${m.summary.women.matches} matches to ${fdate(m.summary.women.latest)}. India T20I files include India's matches only.</p>
  <h2>What this data can't show</h2><p>Public ball-by-ball records have no line, length, shot location, field placement, ball tracking, fitness or injury information. Nothing on this site guesses those. Analysis uses Cricsheet, which publishes matches a few days after play. Live scores come from a separate feed and aren't included in player statistics.</p>`);
}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const SL=i=>css("--s"+i),PH=()=>[SL(1),SL(2),SL(3)],PHN=["Powerplay 1-6","Middle 7-15","Death 16-20"];
const TEAMC={CSK:"#eda100",MI:"#2a78d6",RCB:"#e34948",KKR:"#6250d6",SRH:"#eb6834",RR:"#e87ba4",DC:"#1f5fbf",GT:"#4a6a8a",LSG:"#1baf7a",PBKS:"#c2255c",GG:"#eb6834",UPW:"#6250d6"};
let CH=[];function killCharts(){CH.forEach(c=>c.destroy());CH=[]}
const panel=(id,title,take,o={})=>`<figure class="panel ${o.wide?"wide":""}"><h2>${esc(title)}</h2>${take?`<p class="take">${esc(take)}</p>`:""}<div class="cv ${o.size||""}"><canvas id="${id}" role="img" aria-label="${esc(title+". "+(take||""))}"></canvas></div></figure>`;
function draw(id,cfg){const el=document.getElementById(id);if(!el)return;const ink=css("--soft"),grid=css("--line");Chart.defaults.font.family="Barlow,system-ui,sans-serif";Chart.defaults.color=ink;
 const o=cfg.options=cfg.options||{};o.responsive=true;o.maintainAspectRatio=false;o.animation=false;o.plugins=o.plugins||{};o.plugins.legend=o.plugins.legend||{display:(cfg.data.datasets.length>1&&cfg.type!=="doughnut")||cfg.type==="doughnut",position:"bottom",labels:{boxWidth:12,usePointStyle:true}};
 if(cfg.type!=="doughnut"&&cfg.type!=="radar"){o.scales=o.scales||{};for(const k of["x","y"]){o.scales[k]=o.scales[k]||{};o.scales[k].grid=Object.assign({color:grid+"88",drawTicks:false},o.scales[k].grid);o.scales[k].border={display:false};o.scales[k].ticks=Object.assign({color:ink},o.scales[k].ticks)}}
 if(cfg.type==="radar")o.scales={r:{min:0,max:100,ticks:{display:false,stepSize:25},grid:{color:grid},angleLines:{color:grid},pointLabels:{color:ink,font:{size:12}}}};
 for(const d of cfg.data.datasets){if(cfg.type==="bar"){d.borderRadius=d.borderRadius??4;d.borderSkipped="start"}if(cfg.type==="line"||d.type==="line"){d.borderWidth=2;d.pointRadius=d.pointRadius??3;d.tension=0;d.spanGaps=true;d.pointBackgroundColor=d.borderColor}}
 CH.push(new Chart(el,cfg))}
const line=(id,labels,series,yt,o={})=>draw(id,{type:"line",data:{labels,datasets:series.map(s=>({label:s.l,data:s.d,borderColor:s.c,backgroundColor:s.c,borderDash:s.dash}))},options:{interaction:{mode:"index",intersect:false},scales:{x:{grid:{display:false}},y:{title:{display:true,text:yt},...o.y}}}});
const hbar=(id,labels,vals,c,xt)=>draw(id,{type:"bar",data:{labels,datasets:[{label:xt,data:vals,backgroundColor:c,barPercentage:.8,categoryPercentage:.85}]},options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,title:{display:true,text:xt}},y:{grid:{display:false},ticks:{autoSkip:false}}}}});
const vbar=(id,labels,vals,c,yt)=>draw(id,{type:"bar",data:{labels,datasets:[{label:yt,data:vals,backgroundColor:c}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:yt}}}}});
const donut=(id,labels,vals,cols)=>draw(id,{type:"doughnut",data:{labels,datasets:[{data:vals,backgroundColor:cols,borderColor:css("--card"),borderWidth:2}]},options:{cutout:"62%"}});
const scatter=(id,sets,xt,yt)=>draw(id,{type:"scatter",data:{datasets:sets.map(s=>({label:s.l,data:s.d,backgroundColor:s.c+"cc",borderColor:css("--card"),borderWidth:1,pointRadius:s.r||6,pointHoverRadius:(s.r||6)+2}))},options:{plugins:{legend:{display:sets.length>1,position:"bottom"},tooltip:{callbacks:{label:c=>c.raw.t||`${c.raw.x}, ${c.raw.y}`}}},scales:{x:{title:{display:true,text:xt}},y:{title:{display:true,text:yt}}}}});
const bubble=(id,d,c,xt,yt)=>draw(id,{type:"bubble",data:{datasets:[{data:d,backgroundColor:c+"aa",borderColor:c}]},options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>x.raw.t}}},scales:{x:{title:{display:true,text:xt}},y:{title:{display:true,text:yt}}}}});
function league(rows,comp,ph){const m=new Map();for(const r of rows){if(r[1]!==comp||r[3]!==ph)continue;(m.get(r[2])||m.set(r[2],[]).get(r[2])).push(r)}const o={};for(const[y,x]of m)o[y]=sum(x);return o}
const lead=(s,k)=>s?.[k]??"";
async function home(){
  const [ms,news,meta,au,pp,rw]=await Promise.all([D("matches.json"),get("data/news.json").catch(()=>null),get("data/meta.json"),get("data/auction.json"),D("players.json"),D("rows.json")]);
  const H=S.h=S.h||{};if(!compsOf().includes(H.c))H.c=compsOf()[0],H.y="";const lg=H.c,years=[...new Set(rw.rows.filter(r=>r[1]===lg).map(r=>r[2]))].sort((a,b)=>a-b),yr=+H.y||years.at(-1);
  const g=rw.rows.filter(r=>r[1]===lg&&r[2]===yr&&r[3]===0),sm=meta.summary[S.g],all=league(rw.rows,lg,0);
  const topB=g.filter(r=>r[6]>0).sort((a,b)=>b[5]-a[5]).slice(0,10),topW=g.filter(r=>r[12]>0).sort((a,b)=>b[14]-a[14]||a[13]-b[13]).slice(0,10);
  const P=[1,2,3].map(p=>league(rw.rows,lg,p)),rr=(s)=>s&&s.balls?+(6*s.runs/s.balls).toFixed(2):null,lastY=years.at(-1),firstY=years[0],cur=all[yr];
  const sc=g.filter(r=>r[6]>=(lg==="IND"?60:100)&&r[10]>=2);
  const side=i=>{const t=[...String(i.runs)].map(c=>`<span class="tile">${c}</span>`).join("");return `<div class="side"><b>${esc(i.team)}</b><div class="tiles">${t}<span class="tile sep">/</span><span class="tile">${i.wkts}</span><span class="ov">${overs(i.balls)} ov</span></div></div>`};
  const ev=au.events.filter(e=>e.date>=new Date().toISOString().slice(0,10)&&e.league===(S.g==="men"?"IPL":"WPL"));
  const dp=P[2][lastY],pp0=P[0][lastY];
  set(`${railShell()}<h1>${S.g==="men"?"Men's":"Women's"} dashboard</h1>
  <div class="filters"><label>Competition<select id="hc">${compsOf().map(c=>opt(c,COMP[c],lg))}</select></label><label>Season<select id="hy">${years.slice().reverse().map(y=>opt(y,y,yr))}</select></label></div>
  <div class="kpis"><div class="kpi" style="--c:${SL(1)}"><b>${sm.matches.toLocaleString("en-IN")}</b><span>Matches in data</span></div><div class="kpi" style="--c:${SL(2)}"><b>${sm.deliveries.toLocaleString("en-IN")}</b><span>Balls recorded</span></div><div class="kpi" style="--c:${SL(3)}"><b>${num(cur.runs,cur.balls,6,2)}</b><span>Bat runs per over, ${yr}</span></div><div class="kpi" style="--c:${SL(4)}"><b>${num(cur.f6,cur.balls,100,1)}%</b><span>Balls hit for six, ${yr}</span></div><div class="kpi" style="--c:${SL(7)}"><b>${fdate(sm.latest)}</b><span>Latest match</span></div></div>
  ${ev.length?`<p class="call"><b>Next:</b> ${ev.map(e=>`${esc(e.league)} ${esc(e.event)} on ${fdate(e.date)}${e.venue?" in "+esc(e.venue):""}`).join("; ")}. <a href="#/auction">See auction data</a></p>`:""}
  <div class="dash">
  ${panel("c1","Scoring rate by phase",`${COMP[lg]}, ${firstY} to ${lastY}. In ${lastY}: ${pp0?(rr(pp0)+" in the powerplay, "):""}${dp?rr(dp)+" at the death":""} (bat runs per over).`,{wide:1})}
  ${panel("c2",`Most runs, ${yr}`,topB[0]?`${pp[topB[0][0]].n} leads with ${topB[0][5]} off ${topB[0][6]} balls.`:"",{size:"tall"})}
  ${panel("c3",`Most wickets, ${yr}`,topW[0]?`${pp[topW[0][0]].n} leads with ${topW[0][14]}, economy ${num(topW[0][13],topW[0][12],6,2)}.`:"",{size:"tall"})}
  ${panel("c4",`Speed against reliability, ${yr}`,`Each dot is a batter with ${lg==="IND"?60:100}+ balls. Top right scores fast and stays in.`)}
  ${panel("c5","Fours and sixes per season","Share of balls faced that reach the rope.")}
  <section class="panel"><h2>Recent matches</h2><ul class="list">${ms.slice(0,6).map(x=>`<li><a href="#/match/${esc(x.id)}"><b>${esc(x.teams.join(" v "))}</b></a><br><small>${fdate(x.date)}, ${esc(COMP[x.comp])}: ${esc(resultText(x))}</small></li>`).join("")}</ul></section>
  <section class="panel"><h2>Latest headlines</h2>${news&&news[S.g]?.length?newsList(news[S.g].slice(0,5)):'<p class="mut">Headlines appear after the next data refresh.</p>'}</section></div>`);
  line("c1",years,[0,1,2].map(i=>({l:PHN[i],d:years.map(y=>rr(P[i][y])),c:PH()[i]})),"Bat runs per over");
  hbar("c2",topB.map(r=>pp[r[0]].n),topB.map(r=>r[5]),SL(1),"Runs");hbar("c3",topW.map(r=>pp[r[0]].n),topW.map(r=>r[14]),SL(8),"Wickets");
  scatter("c4",[{l:"Batters",c:SL(3),d:sc.map(r=>({x:+(r[5]/r[10]).toFixed(1),y:+(100*r[5]/r[6]).toFixed(1),t:`${pp[r[0]].n}: avg ${(r[5]/r[10]).toFixed(1)}, SR ${(100*r[5]/r[6]).toFixed(1)}`}))}],"Batting average","Strike rate");
  line("c5",years,[{l:"Fours %",d:years.map(y=>+num(all[y].f4,all[y].balls,100,2)),c:SL(1)},{l:"Sixes %",d:years.map(y=>+num(all[y].f6,all[y].balls,100,2)),c:SL(2)}],"% of balls faced");
  rail(ms);
  $("#hc").onchange=e=>{H.c=e.target.value;H.y="";home()};$("#hy").onchange=e=>{H.y=e.target.value;home()};
}
async function player(id){
  const [pp,rw,au]=await Promise.all([D("players.json"),D("rows.json"),get("data/auction.json")]);
  const i=pp.findIndex(p=>p.id===id);if(i<0)return set(`<h1>Player not found</h1><p class="lede">This player isn't in the ${S.g==="men"?"men's":"women's"} data. Switch using the toggle, or <a href="#/players">browse players</a>.</p>`);
  const p=pp[i],x=await D(`p/${id}.json`),mine=rw.rows.filter(r=>r[0]===i),comps=compsOf().filter(c=>mine.some(r=>r[1]===c));
  const c=S.pc&&comps.includes(S.pc)?S.pc:comps[0],rs=mine.filter(r=>r[1]===c),all=sum(rs.filter(r=>r[3]===0));
  const seasons=[...new Set(rs.map(r=>r[2]))].sort((a,b)=>a-b).map(y=>({y,...sum(rs.filter(r=>r[2]===y&&r[3]===0))}));
  const lg0=league(rw.rows,c,0),phs=[1,2,3].map(n=>sum(rs.filter(r=>r[3]===n))),lgp=[1,2,3].map(n=>{const o=league(rw.rows,c,n),v=Object.keys(o).filter(y=>seasons.some(s=>s.y==y)).map(y=>o[y]);return v.reduce((a,s)=>{for(const k in s)a[k]=(a[k]||0)+s[k];return a},{})});
  const f=(v,d=1)=>isFinite(v)?+v.toFixed(d):null,bat=all.balls>0,bowl=all.legal>0;
  const mapp=k=>x[k].filter(v=>v[0]===c).map(v=>({o:pp[v[1]],balls:v[2],runs:v[3],outs:v[4],y0:v[7],y1:v[8]})).filter(v=>v.balls>0).sort((a,b)=>b.balls-a.balls).slice(0,10);
  const vcols=[{t:"Opponent",l:1,h:r=>pl(r.o)},{t:"Balls",v:r=>r.balls},{t:"Runs",v:r=>r.runs},{t:"SR",v:r=>num(r.runs,r.balls,100)},{t:"Outs",v:r=>r.outs},{t:"Years",v:r=>r.y0===r.y1?r.y0:r.y0+"-"+r.y1},{t:"Evidence",l:1,h:r=>conf(r.balls)}];
  const auc=au.sold.filter(a=>a.pid===id),ven=x.venues.filter(v=>v[0]===c).sort((a,b)=>(b[2]+b[6]/6)-(a[2]+a[6]/6)).slice(0,8);
  const log=x.log.filter(l=>l[1]===c&&l[3]==="bat").slice(0,12).reverse();
  const srDiff=bat?100*all.runs/all.balls-100*(Object.values(lgp).reduce((a,s)=>a+(s.runs||0),0))/(Object.values(lgp).reduce((a,s)=>a+(s.balls||0),0)):0;
  S.exp=()=>csv(`pitchxi-${p.n}-${c}.csv`,[{t:"Season",v:r=>r.y},{t:"Runs",v:r=>r.runs},{t:"Balls",v:r=>r.balls},{t:"Dismissals",v:r=>r.outs},{t:"Legal balls bowled",v:r=>r.legal},{t:"Runs conceded",v:r=>r.conc},{t:"Wickets",v:r=>r.wk}],seasons);
  const k=(c2,b,t)=>`<div class="kpi" style="--c:${SL(c2)}"><b>${b}</b><span>${t}</span></div>`;
  const other=all.runs-4*all.f4-6*all.f6;
  set(`<h1>${esc(p.n)}</h1><p class="lede">${esc(p.t)}. Last match in this data ${fdate(p.d)}.</p>
  <div class="filters">${comps.length>1?`<label>Competition<select id="pc">${comps.map(q=>opt(q,COMP[q],c))}</select></label>`:""}<a class="btn" href="#/compare/${id}">Compare this player</a><button class="btn" id="exp">Download CSV</button></div>
  <div class="kpis">${k(1,p.m[c]||0,"Matches")}${bat?k(3,all.runs,"Runs")+k(2,num(all.runs,all.balls,100),"Strike rate")+k(4,num(all.runs,all.outs,1,2),"Average")+k(7,p.hs[c]??"–","Highest"):""}${bowl?k(8,all.wk,"Wickets")+k(5,num(all.conc,all.legal,6,2),"Economy"):""}</div>
  <div class="dash">
  ${bat?panel("p1","Runs by season",seasons.length>1?`Best season ${seasons.slice().sort((a,b)=>b.runs-a.runs)[0].y} with ${Math.max(...seasons.map(s=>s.runs))} runs.`:""):""}
  ${bat?panel("p2","Strike rate against the league",`${Math.abs(srDiff).toFixed(1)} ${srDiff>=0?"above":"below"} the league rate across these seasons.`):""}
  ${bat?panel("p3","Strike rate by phase","Compared with the league in the same seasons."):""}
  ${bat?panel("p4","Where the runs come from",`${num(4*all.f4+6*all.f6,all.runs,100,0)}% of runs in boundaries.`):""}
  ${log.length>1?panel("p5","Recent innings",`Last ${log.length} innings in ${COMP[c]}, oldest first.`,{wide:1,size:"short"}):""}
  ${bowl?panel("p6","Economy against the league","Lower is better."):""}
  ${bowl?panel("p7","Wickets by phase","When this bowler takes wickets."):""}
  </div>
  <h2>By season</h2>${table([{t:"Season",v:r=>r.y},{t:"Runs",v:r=>r.runs},{t:"Balls",v:r=>r.balls},{t:"SR",v:r=>num(r.runs,r.balls,100)},{t:"Avg",v:r=>num(r.runs,r.outs,1,2)},{t:"Overs",v:r=>overs(r.legal)},{t:"Wkts",v:r=>r.wk},{t:"Econ",v:r=>num(r.conc,r.legal,6,2)}],seasons.slice().reverse())}
  ${auc.length?`<h2>Auction history</h2>${table([{t:"Season",v:r=>r.league+" "+r.season},{t:"Team",l:1,v:r=>r.team},{t:"Base",v:r=>cr(r.base_cr)},{t:"Sold",v:r=>cr(r.price_cr)}],auc)}`:""}
  ${bat?`<h2>Most-faced bowlers</h2>${table(vcols,mapp("bat"))}`:""}${bowl?`<h2>Most-bowled-to batters</h2>${table(vcols,mapp("bowl"))}`:""}
  <h2>Venues</h2>${table([{t:"Venue",l:1,v:v=>v[1]},{t:"Runs",v:v=>v[3]},{t:"SR",v:v=>num(v[3],v[4],100)},{t:"Overs",v:v=>overs(v[6])},{t:"Wkts",v:v=>v[8]},{t:"Econ",v:v=>num(v[7],v[6],6,2)}],ven)}`);
  const Y=seasons.map(s=>s.y);
  if(bat){vbar("p1",Y,seasons.map(s=>s.runs),SL(1),"Runs");
   line("p2",Y,[{l:p.n,d:seasons.map(s=>s.balls?f(100*s.runs/s.balls):null),c:SL(2)},{l:"League",d:Y.map(y=>f(100*lg0[y].runs/lg0[y].balls)),c:css("--soft"),dash:[5,4]}],"Strike rate");
   draw("p3",{type:"bar",data:{labels:PHN,datasets:[{label:p.n,data:phs.map(s=>s.balls?f(100*s.runs/s.balls):null),backgroundColor:SL(2)},{label:"League",data:lgp.map(s=>f(100*s.runs/s.balls)),backgroundColor:css("--soft")+"88"}]},options:{scales:{x:{grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:"Strike rate"}}}}});
   donut("p4",["Fours","Sixes","Running"],[4*all.f4,6*all.f6,other],[SL(1),SL(2),SL(3)])}
  if(log.length>1)vbar("p5",log.map(l=>fdate(l[0])),log.map(l=>l[4]),log.map(l=>l[6]?SL(1):SL(3)),"Runs");
  if(bowl){const B=seasons.filter(s=>s.legal);line("p6",B.map(s=>s.y),[{l:p.n,d:B.map(s=>f(6*s.conc/s.legal,2)),c:SL(8)},{l:"League",d:B.map(s=>f(6*lg0[s.y].conc/lg0[s.y].legal,2)),c:css("--soft"),dash:[5,4]}],"Economy");
   donut("p7",PHN,phs.map(s=>s.wk),PH())}
  $("#exp").onclick=S.exp;const s=$("#pc");if(s)s.onchange=()=>{S.pc=s.value;player(id)};
}
function pctls(rw,comp){const k=comp+S.g;S.pct=S.pct||{};if(S.pct[k])return S.pct[k];const m=new Map();for(const r of rw.rows){if(r[1]!==comp||r[3]!==0)continue;(m.get(r[0])||m.set(r[0],[]).get(r[0])).push(r)}
 const a=[...m.values()].map(sum),B=a.filter(s=>s.balls>=200),W=a.filter(s=>s.legal>=200);const sort=(l,f)=>l.map(f).filter(isFinite).sort((x,y)=>x-y);
 return S.pct[k]={sr:sort(B,s=>s.runs/s.balls),avg:sort(B,s=>s.runs/(s.outs||1)),bd:sort(B,s=>(s.f4+s.f6)/s.balls),dot:sort(B,s=>-s.dots/s.balls),eco:sort(W,s=>-s.conc/s.legal),wsr:sort(W,s=>-s.legal/(s.wk||1)),bdot:sort(W,s=>s.bdot/s.legal)}}
const rank=(l,v)=>{if(!l.length||!isFinite(v))return 0;let n=0;for(const x of l)if(x<=v)n++;return Math.round(100*n/l.length)};
async function compare(a){
  const [pp,rw]=await Promise.all([D("players.json"),D("rows.json")]);
  if(a)S.ca=a;const C=S.cmp=S.cmp||{ph:"0",comp:compsOf()[0]};if(!compsOf().includes(C.comp))C.comp=compsOf()[0];
  const ids=[S.ca,S.cb].filter(Boolean),P=ids.map(id=>pp.findIndex(p=>p.id===id)).filter(i=>i>=0);
  const rows=P.map(i=>rw.rows.filter(r=>r[0]===i&&r[1]===C.comp)),ss=rows.map(r=>sum(r.filter(x=>x[3]==C.ph))),t=rows.map(r=>sum(r.filter(x=>x[3]===0)));
  const met=[["Innings batted",s=>s.inn],["Runs",s=>s.runs],["Balls faced",s=>s.balls],["Strike rate",s=>num(s.runs,s.balls,100)],["Average",s=>num(s.runs,s.outs,1,2)],["Dot %",s=>num(s.dots,s.balls,100)],["Boundary %",s=>num(s.f4+s.f6,s.balls,100)],["Overs bowled",s=>overs(s.legal)],["Wickets",s=>s.wk],["Economy",s=>num(s.conc,s.legal,6,2)],["Bowling SR",s=>num(s.legal,s.wk,1)]];
  const pc=pctls(rw,C.comp),cols=[SL(1),SL(2)],anyB=t.some(s=>s.balls>0),anyW=t.some(s=>s.legal>0);
  set(`<h1>Compare</h1><p class="lede">Put two players side by side in the same competition and overs.</p>${dl(pp)}
  <div class="filters">${picker("ca","First player",pp,S.ca)}${picker("cb","Second player",pp,S.cb)}
  <label>Competition<select id="cc">${compsOf().map(c=>opt(c,COMP[c],C.comp))}</select></label><label>Overs<select id="cp">${PHASE.map((l,i)=>opt(i,l,C.ph))}</select></label></div>
  ${P.length?`<div class="dash">${anyB?panel("r1","Batting percentile","Against batters with 200+ balls in this competition. Further out is better.",{size:"tall"}):""}${anyW?panel("r2","Bowling percentile","Against bowlers with 200+ legal balls. Further out is better.",{size:"tall"}):""}${anyB?panel("r3","Strike rate by phase","Same overs, same competition."):""}${anyB?panel("r4","Runs by season",""):""}</div>${table([{t:"Measure",l:1,v:m=>m[0]},...P.map((i,k)=>({t:pp[i].n,v:m=>m[1](ss[k])}))],met)}`:`<div class="tw"><p class="empty">Choose a player to start.</p></div>`}`);
  const ds=fn=>P.map((i,k)=>({label:pp[i].n,data:fn(k),borderColor:cols[k],backgroundColor:cols[k]+"33",borderWidth:2,pointRadius:3,pointBackgroundColor:cols[k]}));
  if(P.length&&anyB)draw("r1",{type:"radar",data:{labels:["Strike rate","Average","Boundary %","Fewer dots"],datasets:ds(k=>{const s=t[k];return s.balls?[rank(pc.sr,s.runs/s.balls),rank(pc.avg,s.runs/(s.outs||1)),rank(pc.bd,(s.f4+s.f6)/s.balls),rank(pc.dot,-s.dots/s.balls)]:[0,0,0,0]})},options:{plugins:{legend:{display:true,position:"bottom"}}}});
  if(P.length&&anyW)draw("r2",{type:"radar",data:{labels:["Economy","Strike rate","Dot %"],datasets:ds(k=>{const s=t[k];return s.legal?[rank(pc.eco,-s.conc/s.legal),rank(pc.wsr,-s.legal/(s.wk||1)),rank(pc.bdot,s.bdot/s.legal)]:[0,0,0]})},options:{plugins:{legend:{display:true,position:"bottom"}}}});
  if(P.length&&anyB){draw("r3",{type:"bar",data:{labels:PHN,datasets:P.map((i,k)=>({label:pp[i].n,backgroundColor:cols[k],data:[1,2,3].map(n=>{const s=sum(rows[k].filter(r=>r[3]===n));return s.balls?+(100*s.runs/s.balls).toFixed(1):null})}))},options:{plugins:{legend:{display:true,position:"bottom"}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:"Strike rate"}}}}});
   const Y=[...new Set(rows.flat().map(r=>r[2]))].sort((a,b)=>a-b);line("r4",Y,P.map((i,k)=>({l:pp[i].n,c:cols[k],d:Y.map(y=>{const s=rows[k].find(r=>r[2]===y&&r[3]===0);return s?s[5]:null})})),"Runs")}
  const on=()=>{const x=byName(pp,$("#ca").value),y=byName(pp,$("#cb").value);S.ca=x?.id;S.cb=y?.id;C.comp=$("#cc").value;C.ph=$("#cp").value;compare()};
  $$("#ca,#cb,#cc,#cp").forEach(e=>e.onchange=on);
}
async function matchups(){
  const pp=await D("players.json");S.mu=S.mu||{};const M=S.mu;let body=`<div class="tw"><p class="empty">Choose a batter and a bowler to see their record.</p></div>`,after=null;
  const b=pp.find(p=>p.id===M.b),w=pp.find(p=>p.id===M.w);
  if(b){const x=await D(`p/${b.id}.json`),wi=w?pp.indexOf(w):-1,hits=x.bat.filter(v=>v[1]===wi);
    const top=x.bat.filter(v=>v[2]>=12).map(v=>({n:pp[v[1]].n,b:v[2],r:v[3],o:v[4],c:v[0]})).sort((a,c)=>c.b-a.b).slice(0,40);
    let parts=w?(hits.length?hits.map((v,i)=>{const[c,,bl,r,o,d,bd,y0,y1]=v;return `<section class="panel"><h2>${esc(COMP[c])}</h2><div class="kpis"><div class="kpi" style="--c:${SL(1)}"><b>${bl}</b><span>Balls</span></div><div class="kpi" style="--c:${SL(3)}"><b>${r}</b><span>Runs</span></div><div class="kpi" style="--c:${SL(8)}"><b>${o}</b><span>Dismissals</span></div><div class="kpi" style="--c:${SL(2)}"><b>${num(r,bl,100)}</b><span>Strike rate</span></div></div><div class="cv short"><canvas id="mo${i}" role="img" aria-label="Ball outcomes: ${d} dots, ${bd} boundaries, ${bl-d-bd} others"></canvas></div><p>${conf(bl)}. Seen ${y0===y1?y0:y0+" to "+y1}.</p></section>`}).join(""):`<div class="tw"><p class="empty">${esc(b.n)} has not faced ${esc(w.n)} in this data.</p></div>`):"";
    body=`<div class="dash">${parts?`<div class="wide">${parts}</div>`:""}${top.length>2?panel("mx",`${b.n} against every bowler`,"Bowlers with 12+ balls faced. Right is more exposure, high is faster scoring, red has dismissed the batter 3+ times.",{wide:1,size:"tall"}):""}</div>`;
    after=()=>{hits.forEach((v,i)=>{const[,,bl,,,d,bd]=v;draw("mo"+i,{type:"bar",data:{labels:["Balls"],datasets:[{label:"Dots",data:[d],backgroundColor:SL(1)},{label:"Boundaries",data:[bd],backgroundColor:SL(2)},{label:"Other scoring",data:[bl-d-bd],backgroundColor:SL(3)}]},options:{indexAxis:"y",plugins:{legend:{display:true,position:"bottom"}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,display:false}}}})});
     if(top.length>2)scatter("mx",[{l:"Under 3 dismissals",c:SL(1),d:top.filter(t=>t.o<3).map(t=>({x:t.b,y:+(100*t.r/t.b).toFixed(1),t:`${t.n}: ${t.r} off ${t.b}, out ${t.o}`}))},{l:"3+ dismissals",c:SL(8),d:top.filter(t=>t.o>=3).map(t=>({x:t.b,y:+(100*t.r/t.b).toFixed(1),t:`${t.n}: ${t.r} off ${t.b}, out ${t.o}`}))}],"Balls faced","Strike rate")}}
  set(`<h1>Matchups</h1><p class="lede">Batter against bowler, with the sample size beside every number. A short record is a question for the coach, not a plan.</p>${dl(pp)}<div class="filters">${picker("mb","Batter",pp,M.b)}${picker("mw","Bowler",pp,M.w)}</div>${body}`);
  after&&after();$$("#mb,#mw").forEach(e=>e.onchange=()=>{M.b=byName(pp,$("#mb").value)?.id;M.w=byName(pp,$("#mw").value)?.id;matchups()});
}
async function venues(){
  const vs=await D("venues.json");S.vc=compsOf().includes(S.vc)?S.vc:compsOf()[0];const rows=vs.filter(v=>v.c===S.vc),sel=rows.find(v=>v.v===S.vv)||rows[0],ys=sel?Object.entries(sel.s):[];
  const big=rows.filter(v=>v.n>=8&&v.cn);
  set(`<h1>Venues</h1><p class="lede">Completed 20-over games only. Rain-revised and no-result games are left out, so a range is shown instead of a single par score.</p>
  <div class="filters"><label>Competition<select id="vc">${compsOf().map(c=>opt(c,COMP[c],S.vc))}</select></label>${rows.length?`<label>Venue<select id="vv">${rows.map(v=>opt(v.v,v.v,sel.v))}</select></label>`:""}</div>
  ${sel?`<div class="kpis"><div class="kpi" style="--c:${SL(1)}"><b>${sel.n}</b><span>Matches</span></div><div class="kpi" style="--c:${SL(2)}"><b>${sel.med}</b><span>Median first innings</span></div><div class="kpi" style="--c:${SL(3)}"><b>${sel.lo}-${sel.hi}</b><span>Range</span></div><div class="kpi" style="--c:${SL(7)}"><b>${num(sel.cw,sel.cn,100,0)}%</b><span>Chases won</span></div></div>
  <div class="dash">${panel("v1",`${sel.v} first innings`,"Median score by season, so one big game can't move it far.")}${panel("v2","Who wins here",`${sel.cw} of ${sel.cn} decided games went to the chasing side.`)}${big.length>1?panel("v3","All venues: scoring and chasing",`Venues with 8+ games. Bigger circles mean more games.`,{wide:1,size:"tall"}):""}</div>`:""}
  <h2>All venues</h2>${table([{t:"Venue",l:1,v:v=>v.v},{t:"Matches",v:v=>v.n},{t:"Median",v:v=>v.med},{t:"Lowest",v:v=>v.lo},{t:"Highest",v:v=>v.hi},{t:"Chases won",v:v=>num(v.cw,v.cn,100,0)+"%"},{t:"Last game",v:v=>fdate(v.last)}],rows)}`);
  if(sel){line("v1",ys.map(y=>y[0]),[{l:"Median first innings",d:ys.map(y=>y[1][1]),c:SL(2)}],"Runs");donut("v2",["Chasing side","Side batting first"],[sel.cw,sel.cn-sel.cw],[SL(3),SL(1)]);
   if(big.length>1)bubble("v3",big.map(v=>({x:v.med,y:Math.round(100*v.cw/v.cn),r:Math.min(22,4+v.n/5),t:`${v.v}: median ${v.med}, chases ${Math.round(100*v.cw/v.cn)}%, ${v.n} games`})),SL(5),"Median first innings","Chases won %")}
  $("#vc").onchange=e=>{S.vc=e.target.value;S.vv=null;venues()};const v=$("#vv");if(v)v.onchange=()=>{S.vv=v.value;venues()};
}
async function auction(){
  const [a,pp]=await Promise.all([get("data/auction.json"),D("players.json")]);const lg=S.g==="men"?"IPL":"WPL";
  const sold=a.sold.filter(r=>r.league===lg),seasons=[...new Set(sold.map(r=>r.season))].sort((x,y)=>y-x);S.as=seasons.includes(+S.as)?+S.as:seasons[0];S.at=S.at||"";
  const rows=sold.filter(r=>r.season===S.as),tot=rows.reduce((s,r)=>s+r.price_cr,0),teams=[...new Set(rows.map(r=>r.team))].map(t=>({t,s:rows.filter(r=>r.team===t).reduce((x,r)=>x+r.price_cr,0),n:rows.filter(r=>r.team===t).length})).sort((x,y)=>y.s-x.s);
  const show=rows.filter(r=>!S.at||r.team===S.at).sort((x,y)=>y.price_cr-x.price_cr),ev=a.events.filter(e=>e.league===lg&&e.date>=new Date().toISOString().slice(0,10));
  const after=r=>{const f=r.after||{};if(!f.m)return "–";const b=f.balls?`${f.runs} runs, SR ${num(f.runs,f.balls,100)}`:"",w=f.legal?`${f.wkts} wkts, econ ${num(f.conceded,f.legal,6,2)}`:"";return `${f.m} matches${b?"; "+b:""}${w?"; "+w:""}`};
  const cols=[{t:"Player",l:1,h:r=>r.pid&&pp.some(p=>p.id===r.pid)?`<a href="#/player/${r.pid}">${esc(r.player)}</a>`:esc(r.player),v:r=>r.player},{t:"Team",l:1,v:r=>r.team},{t:"Base",v:r=>cr(r.base_cr)},{t:"Sold",v:r=>cr(r.price_cr)+(r.rtm?" RTM":"")},{t:"Times base",v:r=>r.base_cr?(r.price_cr/r.base_cr).toFixed(1)+"x":"–"},{t:`${lg} ${S.as} output`,l:1,v:after}];
  const bands=[["Under ₹1 cr",0,1],["₹1-5 cr",1,5],["₹5-10 cr",5,10],["₹10 cr+",10,1e9]].map(([l,lo,hi])=>({l,n:rows.filter(r=>r.price_cr>=lo&&r.price_cr<hi).length,s:rows.filter(r=>r.price_cr>=lo&&r.price_cr<hi).reduce((x,r)=>x+r.price_cr,0)}));
  const top=rows.slice().sort((x,y)=>y.price_cr-x.price_cr).slice(0,10),pB=rows.filter(r=>r.after?.balls>=30),pW=rows.filter(r=>r.after?.legal>=30),big=bands.slice(1).reduce((x,b)=>x+b.s,0),t0=top[0];
  S.exp=()=>csv(`pitchxi-${lg}-${S.as}-auction.csv`,cols,show);
  set(`<h1>Auction</h1><p class="lede">${rows.length} players sold at ${esc(lg)} ${S.as}, ${esc(rows[0]?.venue)}, ${fdate(rows[0]?.auction_date)}.</p>
  ${ev.map(e=>`<p class="call"><b>Upcoming:</b> ${esc(e.league)} ${esc(e.season)} ${esc(e.event)} on ${fdate(e.date)}${e.venue?" in "+esc(e.venue):""}.</p>`).join("")}
  <div class="filters"><label>Season<select id="as">${seasons.map(s=>opt(s,lg+" "+s,S.as))}</select></label><label>Team<select id="at">${opt("","All teams",S.at)}${teams.map(t=>opt(t.t,t.t,S.at))}</select></label><button class="btn" id="exp">Download CSV</button></div>
  <div class="kpis"><div class="kpi" style="--c:${SL(1)}"><b>${cr(tot)}</b><span>Total spent</span></div><div class="kpi" style="--c:${SL(2)}"><b>${rows.length}</b><span>Players sold</span></div><div class="kpi" style="--c:${SL(4)}"><b>${cr(t0?.price_cr)}</b><span>Top buy: ${esc(t0?.player)}</span></div><div class="kpi" style="--c:${SL(3)}"><b>${esc(teams[0]?.t)}</b><span>Biggest spender</span></div></div>
  <div class="dash">
  ${panel("a1","Spent by team",`${teams[0]?.t} spent ${cr(teams[0]?.s)} on ${teams[0]?.n} players.`,{size:"tall"})}
  ${panel("a2","Top 10 buys",`These 10 took ${num(top.reduce((x,r)=>x+r.price_cr,0),tot,100,0)}% of all money spent.`,{size:"tall"})}
  ${panel("a3","Money by price band",`₹1 crore-plus players took ${num(big,tot,100,0)}% of the spend.`)}
  ${panel("a4","Players by price band",`${bands[0].n} of ${rows.length} sold for under ₹1 crore.`)}
  ${pB.length>2?panel("a5",`Price against runs, ${lg} ${S.as}`,"Batters who faced 30+ balls that season. High and left is good value."):""}
  ${pW.length>2?panel("a6",`Price against wickets, ${lg} ${S.as}`,"Bowlers with 5+ overs that season. High and left is good value."):""}
  </div>
  <h2>Players sold</h2>${table(cols,show)}<p class="mut">Output comes from ball-by-ball data and stays blank until the season is played or the player can be matched with confidence. <a href="${esc(rows[0]?.source)}" target="_blank" rel="noopener">Price source</a>. Fees are auction bids; league rules can change what a player is actually paid.</p>`);
  draw("a1",{type:"bar",data:{labels:teams.map(t=>t.t),datasets:[{label:"₹ crore",data:teams.map(t=>+t.s.toFixed(2)),backgroundColor:teams.map(t=>TEAMC[t.t]||SL(1))}]},options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,title:{display:true,text:"₹ crore"}},y:{grid:{display:false},ticks:{autoSkip:false}}}}});
  draw("a2",{type:"bar",data:{labels:top.map(r=>`${r.player} (${r.team})`),datasets:[{label:"₹ crore",data:top.map(r=>r.price_cr),backgroundColor:top.map(r=>TEAMC[r.team]||SL(1))}]},options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,title:{display:true,text:"₹ crore"}},y:{grid:{display:false},ticks:{autoSkip:false}}}}});
  const bc=[SL(1),SL(2),SL(3),SL(4)];donut("a3",bands.map(b=>b.l),bands.map(b=>+b.s.toFixed(2)),bc);donut("a4",bands.map(b=>b.l),bands.map(b=>b.n),bc);
  const dot=(r,y)=>({x:r.price_cr,y,t:`${r.player} (${r.team}), ${cr(r.price_cr)}: ${y}`});
  if(pB.length>2)scatter("a5",[{l:"Batters",c:SL(1),d:pB.map(r=>dot(r,r.after.runs))}],"Price, ₹ crore","Runs");if(pW.length>2)scatter("a6",[{l:"Bowlers",c:SL(8),d:pW.map(r=>dot(r,r.after.wkts))}],"Price, ₹ crore","Wickets");
  $("#exp").onclick=S.exp;$("#as").onchange=e=>{S.as=e.target.value;S.at="";auction()};$("#at").onchange=e=>{S.at=e.target.value;auction()};
}
async function news(){
  const n=await get("data/news.json").catch(()=>null),items=n?.[S.g]||[],tags=[...new Set(items.map(i=>i.tag))];if(!tags.includes(S.nt))S.nt="";
  const c={};items.forEach(i=>c[i.tag]=(c[i.tag]||0)+1);const src={};items.forEach(i=>src[i.source]=(src[i.source]||0)+1);const ts=Object.entries(src).sort((a,b)=>b[1]-a[1]).slice(0,8);
  set(`<h1>News</h1><p class="lede">${n?`Headlines checked ${fdate(n.at)}. Each one opens at its publisher.`:""}</p>
  <div class="filters"><label>Topic<select id="nt">${opt("","All topics",S.nt)}${tags.map(t=>opt(t,t,S.nt))}</select></label></div>
  ${items.length?`<div class="dash">${panel("n1","Headlines by topic","",{size:"short"})}${panel("n2","Most active publishers","",{size:"short"})}</div><section class="panel">${newsList(items.filter(i=>!S.nt||i.tag===S.nt))}</section>`:'<div class="tw"><p class="empty">No headlines yet. They load with the next data refresh.</p></div>'}`);
  if(items.length){donut("n1",Object.keys(c),Object.values(c),[SL(1),SL(2),SL(3)]);hbar("n2",ts.map(t=>t[0]),ts.map(t=>t[1]),SL(7),"Headlines")}
  const s=$("#nt");if(s)s.onchange=()=>{S.nt=s.value;news()};
}
/* match rail */
const LIVE_URL="https://raw.githubusercontent.com/Varun2084/Pitch11/live-data/live.json";
const liveData=async()=>{try{const r=await fetch(LIVE_URL);return r.ok?await r.json():null}catch{return null}};
let railTimer=null,railPoll=null;
const stopRail=()=>{clearInterval(railTimer);clearInterval(railPoll);railTimer=railPoll=null};
const railShell=()=>`<section aria-label="Matches"><div id="rail" class="rail" tabindex="0"></div></section>`;
const wantLive=m=>{const w=/\bwomen\b|\bwpl\b/i.test(m.name+" "+m.teams.join(" "));return S.g==="women"?w:!w};
const short=t=>t.replace(/\s*\[.*?\]/g,"");
function liveCard(m){const on=m.started&&!m.ended;return `<a class="mc ${on?"on":""}" href="#/live/${esc(m.id)}"><span class="st">${on?"LIVE":m.ended?"Result":"Upcoming"}<small>${esc(m.type)}</small></span><div class="mt">${m.score.length?m.score.slice(-2).map(s=>`<p><b>${esc(short(s.inn).replace(/ Inning.*/i,""))}</b><span>${esc(s.r)}/${esc(s.w)} (${esc(s.o)})</span></p>`).join(""):m.teams.map(t=>`<p><b>${esc(t)}</b></p>`).join("")}</div><small class="ms">${esc(m.status)}</small></a>`}
function doneCard(m){return `<a class="mc" href="#/match/${esc(m.id)}"><span class="st">Result<small>${esc(COMP[m.comp])}</small></span><div class="mt">${m.inn.map(i=>`<p><b>${esc(i.team)}</b><span>${i.runs}/${i.wkts} (${overs(i.balls)})</span></p>`).join("")}</div><small class="ms">${fdate(m.date)}: ${esc(resultText(m))}</small></a>`}
async function rail(ms){stopRail();const el=$("#rail");if(!el)return;const g=S.g;
 const paint=async()=>{let lv=[];try{const r=await liveData();if(r)lv=r.matches.filter(wantLive).sort((a,b)=>(b.started&&!b.ended)-(a.started&&!a.ended))}catch{}
  const e=$("#rail");if(!e||S.g!==g)return;const x=e.scrollLeft;e.innerHTML=lv.slice(0,14).map(liveCard).join("")+ms.slice(0,14).map(doneCard).join("");e.scrollLeft=x};
 el.innerHTML=ms.slice(0,14).map(doneCard).join("");await paint();railPoll=setInterval(paint,60000);
 if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 let hold=false,t;const pause=()=>{hold=true;clearTimeout(t);t=setTimeout(()=>hold=false,8000)};["pointerdown","touchstart","wheel","focusin","mouseenter"].forEach(n=>el.addEventListener(n,pause,{passive:true}));
 railTimer=setInterval(()=>{const e=$("#rail");if(!e||hold||document.hidden)return;const w=e.firstElementChild?.offsetWidth+12||292;if(e.scrollLeft+e.clientWidth>=e.scrollWidth-4)e.scrollTo({left:0,behavior:"smooth"});else e.scrollBy({left:w,behavior:"smooth"})},4000)}
const bcols=[{t:"Batter",l:1,h:r=>`${r.id?`<a href="#/player/${esc(r.id)}">${esc(r.n)}</a>`:esc(r.n)}<br><small class="mut">${esc(r.how)}</small>`,v:r=>r.n},{t:"R",v:r=>r.r},{t:"B",v:r=>r.b},{t:"4s",v:r=>r.f},{t:"6s",v:r=>r.s},{t:"SR",v:r=>num(r.r,r.b,100)}];
const wcols=[{t:"Bowler",l:1,h:r=>r.id?`<a href="#/player/${esc(r.id)}">${esc(r.n)}</a>`:esc(r.n),v:r=>r.n},{t:"O",v:r=>overs(r.l)},{t:"R",v:r=>r.r},{t:"W",v:r=>r.w},{t:"Dots",v:r=>r.dots},{t:"Econ",v:r=>num(r.r,r.l,6,2)},{t:"WD",v:r=>r.wd},{t:"NB",v:r=>r.nb}];
async function match(id){const m=await D(`m/${id}.json`);
 set(`<a class="btn" href="#/">Back to dashboard</a><section class="board" style="margin-top:12px" aria-label="Match summary"><div class="head"><span>${esc(m.event||COMP[m.comp])}${m.stage?", "+esc(m.stage):""}</span><span>${fdate(m.date)}, ${esc(m.venue)}</span></div>${m.inn.map(i=>`<div class="side"><b>${esc(i.team)}</b><div class="tiles">${[...String(i.runs)].map(c=>`<span class="tile">${c}</span>`).join("")}<span class="tile sep">/</span><span class="tile">${i.wkts}</span><span class="ov">${overs(i.balls)} ov</span></div></div>`).join("")}<p class="res">${esc(resultText(m))}</p></section>
 <p class="lede">${m.toss?esc(m.toss)+". ":""}${m.pom.length?"Player of the match: "+esc(m.pom.join(", "))+".":""}</p>
 <div class="dash"><figure class="panel wide"><h2>How the runs were made</h2><div class="cv short"><canvas id="mw" role="img" aria-label="Runs from the bat and extras by innings"></canvas></div></figure></div>
 ${m.inn.map((i,k)=>`<h2>${esc(i.team)}: ${i.runs}/${i.wkts} (${overs(i.balls)} ov)</h2>${table(bcols,i.bat)}<p class="mut">Extras ${i.extras}.${i.dnb.length?" Did not bat: "+esc(i.dnb.join(", "))+".":""}</p><div style="height:10px"></div>${table(wcols,i.bowl)}${i.fow.length?`<p class="mut"><b>Fall of wickets:</b> ${i.fow.map(f=>`${f.s}-${f.w} (${esc(f.p)}, ${f.o})`).join(", ")}</p>`:""}`).join("")}`);
 draw("mw",{type:"bar",data:{labels:m.inn.map(i=>i.team),datasets:[{label:"Runs from the bat",data:m.inn.map(i=>i.runs-i.extras),backgroundColor:SL(1)},{label:"Extras",data:m.inn.map(i=>i.extras),backgroundColor:SL(4)}]},options:{indexAxis:"y",plugins:{legend:{display:true,position:"bottom"}},scales:{x:{stacked:true,beginAtZero:true,title:{display:true,text:"Runs"}},y:{stacked:true,grid:{display:false}}}}});}
let livePoll=null;
async function live(id){const load=async()=>{const r=await liveData();if(location.hash!=="#/live/"+id)return clearInterval(livePoll);const c=r?.cards?.[id],m=c?.match||r?.matches.find(x=>x.id===id);
 if(!m){set(`<h1>Live score</h1><p class="lede">This match isn't in the live feed right now. <a href="#/">Back to dashboard</a></p>`);return}
 set(`<a class="btn" href="#/">Back to dashboard</a><h1 style="margin-top:12px">${esc(m.name)}</h1><p class="lede">${esc(m.status)}. ${esc(m.venue)}.<br><small>Updated ${new Date(r.at).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}. Scores refresh about every 30 minutes.</small></p>
 <div class="kpis">${m.score.map((s,i)=>`<div class="kpi" style="--c:${SL(i%2?2:1)}"><b>${esc(s.r)}/${esc(s.w)}</b><span>${esc(s.inn)}, ${esc(s.o)} ov</span></div>`).join("")}</div>
 ${(c?.innings||[]).map(i=>`<h2>${esc(i.inn)}</h2>${table([{t:"Batter",l:1,h:b=>`${esc(b.n)}<br><small class="mut">${esc(b.how)}</small>`,v:b=>b.n},{t:"R",v:b=>b.r},{t:"B",v:b=>b.b},{t:"4s",v:b=>b.f},{t:"6s",v:b=>b.s},{t:"SR",v:b=>b.sr}],i.bat)}<div style="height:10px"></div>${table([{t:"Bowler",l:1,v:b=>b.n},{t:"O",v:b=>b.o},{t:"M",v:b=>b.m},{t:"R",v:b=>b.r},{t:"W",v:b=>b.w},{t:"Econ",v:b=>b.eco}],i.bowl)}`).join("")}
 ${c?"":`<p class="mut">The detailed scorecard isn't available for this match yet.</p>`}`)};
 clearInterval(livePoll);await load();livePoll=setInterval(()=>load().catch(()=>{}),60000)}
async function route(){
  const h=location.hash.replace(/^#\/?/,"").split("/");
  stopRail();clearInterval(livePoll);closeMenu();$$("nav a").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#/"+h[0]));
  $$(".seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.g===S.g));
  try{await({"":home,players,player:()=>player(h[1]),compare:()=>compare(h[1]),match:()=>match(h[1]),live:()=>live(h[1]),matchups,venues,auction,news,method}[h[0]]||home)()}
  catch(e){console.error(e);set(`<h1>This page couldn't load</h1><p class="lede">${esc(e.message)}. Reload the page, or check the <a href="#/method">data status</a>.</p>`)}
  window.scrollTo(0,0);
}
$$(".seg button").forEach(b=>b.onclick=()=>{S.g=b.dataset.g;store.set("g",S.g);S.ca=S.cb=null;S.mu=null;if(location.hash.startsWith("#/player/"))location.hash="#/players";else route()});
addEventListener("hashchange",route);
function closeMenu(){$("#side").classList.remove("open");$("#scrim").hidden=true;$("#menu").setAttribute("aria-expanded","false")}
$("#menu").onclick=()=>{const o=$("#side").classList.toggle("open");$("#scrim").hidden=!o;$("#menu").setAttribute("aria-expanded",o)};
$("#scrim").onclick=closeMenu;addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
$$("nav a").forEach(a=>a.addEventListener("click",closeMenu));
(async()=>{route();try{const m=await get("data/meta.json");if(m.demo)$("#banner").textContent="Test data only. These matches are made up for checking the app.";
$("#foot").innerHTML=`Latest match in this data: ${fdate(m.summary[S.g].latest)}. Data checked ${fdate(m.built)}. Match data from <a href="https://cricsheet.org" target="_blank" rel="noopener">Cricsheet</a>. Independent project, not affiliated with the IPL, WPL or BCCI.`}catch{}})();
