/* pylab.js – Python im Browser (Pyodide) + TXT-4.0-Simulator fuer die Lernseiten */
(function(){
"use strict";
var PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
var py = null, pyPromise = null;
var EX = window.EXERCISES || {};

function $(sel, root){ return (root||document).querySelector(sel); }
function el(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function store(k,v){ if(window.RProg) k=window.RProg.k(k); try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v);}catch(e){ return null; } }

/* ---------------- Status ---------------- */
function setStatus(state, text){
  var s = $("#pystatus"); if(!s) return;
  s.className = state; s.querySelector(".stxt").textContent = text;
}

/* ---------------- Pyodide laden ---------------- */
function loadPython(){
  if(pyPromise) return pyPromise;
  setStatus("", "Python wird geladen …");
  pyPromise = new Promise(function(resolve, reject){
    function boot(){
      window.loadPyodide({indexURL: PYODIDE_URL}).then(function(p){
        py = p;
        py.runPython("_src = " + JSON.stringify(window.SIM_PY) + "\n" +
          "import types, sys\n_m = types.ModuleType('fischersim')\nexec(compile(_src, 'fischersim.py', 'exec'), _m.__dict__)\nsys.modules['fischersim'] = _m\nimport fischersim\n");
        setStatus("ready", "Python bereit");
        document.querySelectorAll(".btn.run,.btn.chk").forEach(function(b){ b.disabled=false; });
        resolve(py);
      }).catch(fail);
    }
    function fail(e){
      setStatus("fail", "Python konnte nicht geladen werden (Internet nötig)");
      console.error(e); reject(e);
    }
    if(window.loadPyodide){ boot(); return; }
    var sc = document.createElement("script");
    sc.src = PYODIDE_URL + "pyodide.js";
    sc.onload = boot; sc.onerror = fail;
    document.head.appendChild(sc);
  });
  return pyPromise;
}

function runCode(code, cfg, check){
  var call = "fischersim.run(" + JSON.stringify(code) + ", " + JSON.stringify(JSON.stringify(cfg||{})) + ", " +
             (check ? JSON.stringify(check) : "None") + ")";
  var res = py.runPython(call);
  if(res && typeof res !== "string" && res.toString) res = res.toString();
  return JSON.parse(res);
}

/* ---------------- Editor ---------------- */
function makeEditor(wrap, code, key){
  var ed = el("div","editor"); var ln = el("div","ln"); var ta = el("textarea");
  ta.spellcheck=false; ta.setAttribute("autocapitalize","off"); ta.setAttribute("autocomplete","off");
  ta.setAttribute("aria-label","Python-Code");
  var saved = store(key); ta.value = saved!=null ? saved : code;
  function lines(){ var n = ta.value.split("\n").length; var s=""; for(var i=1;i<=n;i++) s+=i+"\n"; ln.textContent=s; ta.rows=Math.max(10,n+1); }
  ta.addEventListener("input", function(){ lines(); store(key, ta.value); });
  ta.addEventListener("scroll", function(){ ln.scrollTop = ta.scrollTop; });
  ta.addEventListener("keydown", function(e){
    if(e.key==="Tab"){
      e.preventDefault(); var s=ta.selectionStart, en=ta.selectionEnd, v=ta.value;
      if(e.shiftKey){
        var ls=v.lastIndexOf("\n",s-1)+1; if(v.substr(ls,4)==="    "){ ta.value=v.slice(0,ls)+v.slice(ls+4); ta.selectionStart=ta.selectionEnd=Math.max(ls,s-4); }
      } else { ta.value=v.slice(0,s)+"    "+v.slice(en); ta.selectionStart=ta.selectionEnd=s+4; }
      lines(); store(key, ta.value);
    } else if(e.key==="Enter" && !e.ctrlKey && !e.metaKey){
      e.preventDefault(); var p=ta.selectionStart, val=ta.value; var ls2=val.lastIndexOf("\n",p-1)+1;
      var ind=(val.slice(ls2,p).match(/^ */)||[""])[0]; if(/:\s*$/.test(val.slice(ls2,p))) ind+="    ";
      ta.value=val.slice(0,p)+"\n"+ind+val.slice(ta.selectionEnd); ta.selectionStart=ta.selectionEnd=p+1+ind.length;
      lines(); store(key, ta.value);
    } else if(e.key==="Enter" && (e.ctrlKey||e.metaKey)){
      e.preventDefault(); var b = wrap.closest(".ex").querySelector(".btn.run"); if(b) b.click();
    }
  });
  ed.appendChild(ln); ed.appendChild(ta); wrap.appendChild(ed); lines();
  return ta;
}

/* ---------------- Simulator-Anzeige ---------------- */
var LEDCOL = {red:"#ff3b30", green:"#34c759", yellow:"#ffcc00", white:"#ffffff", blue:"#3fa7ff", orange:"#ff9500"};

function Panel(root, cfg){
  this.cfg = cfg||{}; this.root = root; this.events=[]; this.tEnd=0; this.t=0; this.timer=null;
  var c = this.cfg, self=this;
  var hasHW = (c.leds&&c.leds.length)||(c.motors&&c.motors.length)||(c.inputs&&c.inputs.length)||c.display;
  if(hasHW){
    var txt = el("div","txt"); root.appendChild(txt); this.txt=txt;
    if(c.display){ var r=el("div","row"); r.appendChild(el("span","lab","Display")); this.lcd=el("div","lcd"); this.lcd.style.flex="1"; r.appendChild(this.lcd); txt.appendChild(r); }
    if(c.leds&&c.leds.length){ var r2=el("div","row"); r2.appendChild(el("span","lab","Ausgänge")); this.ledEls={};
      c.leds.forEach(function(l){ var d=el("span","led"); var i=el("i"); d.appendChild(i); d.appendChild(el("span",null,"O"+l.port+(l.label?" "+l.label:""))); r2.appendChild(d); self.ledEls[l.port]={i:i,col:LEDCOL[l.color||"white"]||l.color}; });
      txt.appendChild(r2); }
    if(c.motors&&c.motors.length){ var r3=el("div","row"); r3.appendChild(el("span","lab","Motoren")); this.motEls={};
      c.motors.forEach(function(m){ var d=el("span","mot","M"+m.port+" ■ 0"); r3.appendChild(d); self.motEls[m.port]=d; }); txt.appendChild(r3); }
    if(c.inputs&&c.inputs.length){ var r4=el("div","row"); r4.appendChild(el("span","lab","Eingänge")); this.inEls={};
      c.inputs.forEach(function(i){ var d=el("span","inp"); d.innerHTML="I"+i.port+" "+esc(i.label||i.kind)+" <b>–</b>"; r4.appendChild(d); self.inEls[i.port]={el:d.querySelector("b"),src:i.src||{},kind:i.kind}; }); txt.appendChild(r4); }
  }
  if(c.world){
    var cv = el("canvas","world"); cv.width=640; cv.height=c.world.type==="gate"?300:420; root.appendChild(cv); this.cv=cv;
  }
  var pl = el("div","player");
  pl.innerHTML='<button class="btn" type="button">▶</button><input type="range" min="0" max="1000" value="0" aria-label="Zeitleiste"><span class="tt">0,0 s</span><select aria-label="Tempo"><option value="1">1×</option><option value="3">3×</option><option value="10">10×</option></select>';
  root.appendChild(pl); this.pl=pl;
  this.playBtn=pl.querySelector("button"); this.range=pl.querySelector("input"); this.ttl=pl.querySelector(".tt"); this.spd=pl.querySelector("select");
  if((c.world&&(c.world.type==="buggy"||c.world.type==="portal"))) this.spd.value="3";
  this.playBtn.onclick=function(){ if(self.timer) self.pause(); else self.play(); };
  this.range.oninput=function(){ self.pause(); self.show(self.tEnd*self.range.value/1000); };
  this.show(0);
}
Panel.prototype.load = function(events, tEnd){ this.events=events||[]; this.tEnd=Math.max(tEnd||0,0); this.show(0); if(this.tEnd>0.05) this.play(); else this.show(this.tEnd); };
Panel.prototype.play = function(){
  var self=this; if(this.t>=this.tEnd-1e-6) this.t=0; var last=performance.now(); this.playBtn.textContent="❚❚";
  this.timer = requestAnimationFrame(function step(now){
    var dt=(now-last)/1000; last=now; self.t=Math.min(self.tEnd, self.t+dt*parseFloat(self.spd.value)); self.show(self.t);
    if(self.t>=self.tEnd){ self.pause(); return; } self.timer=requestAnimationFrame(step);
  });
};
Panel.prototype.pause = function(){ if(this.timer) cancelAnimationFrame(this.timer); this.timer=null; this.playBtn.textContent="▶"; };
Panel.prototype.state = function(t){
  var st={leds:{},mot:{},disp:{},poses:[],gate:null,xyz:[],grab:[]};
  var c=this.cfg;
  for(var k=0;k<this.events.length;k++){
    var e=this.events[k]; if(e[0]>t+1e-9) break; var d=e[2];
    switch(e[1]){
      case "led": st.leds[d.o]=d.b; break;
      case "motor": st.mot[d.m]=d; break;
      case "display": st.disp[d.k]=d.v; break;
      case "pose": st.poses.push(d); break;
      case "gate": st.gate=d.a; break;
      case "xyz": st.xyz.push(d); break;
      case "grab": case "drop": st.grab.push([e[1],d]); break;
    }
  }
  return st;
};
function inSched(on,t){ for(var i=0;i<(on||[]).length;i++){ if(on[i][0]<=t && t<on[i][1]) return true; } return false; }
function piece(vals,t,def){ var v=def; (vals||[]).forEach(function(p){ if(t>=p[0]) v=p[1]; }); return v; }
Panel.prototype.show = function(t){
  this.t=t; var st=this.state(t), self=this, c=this.cfg;
  this.ttl.textContent = t.toFixed(1).replace(".",",")+" s / "+this.tEnd.toFixed(1).replace(".",",")+" s";
  if(this.tEnd>0) this.range.value = Math.round(1000*t/this.tEnd);
  if(this.lcd){ var keys=Object.keys(st.disp); this.lcd.textContent = keys.length? keys.map(function(k){ return st.disp[k]; }).join("\n") : " "; }
  if(this.ledEls){ Object.keys(this.ledEls).forEach(function(p){ var b=st.leds[p]||0, L=self.ledEls[p];
      L.i.style.background = b>0 ? L.col : "#3a4450"; L.i.style.opacity = b>0 ? (0.35+0.65*b/512) : 1; L.i.style.boxShadow = b>0 ? "0 0 10px "+L.col : "none"; }); }
  if(this.motEls){ Object.keys(this.motEls).forEach(function(p){ var m=st.mot[p]; var s="M"+p+" ■ 0";
      if(m&&m.r) s="M"+p+" "+(m.d==="ccw"?"⟲":"⟳")+" "+m.s; self.motEls[p].textContent=s; }); }
  if(this.inEls){ Object.keys(this.inEls).forEach(function(p){ var I=self.inEls[p], s=I.src, v="–";
      if(s.type==="schedule"||!s.type){ v = inSched(s.on,t)?"1":"0"; if(I.kind==="photo") v = inSched(s.on,t)?"hell":"dunkel"; }
      if(I.kind==="ultra" && s.type==="schedule") v = piece(s.values,t,100)+" cm";
      if(I.kind==="ntc") v = "≈"+(function(){ var pts=s.temp||[[0,21]]; var x=pts[0][1]; for(var i=0;i<pts.length-1;i++){ if(t>=pts[i][0]&&t<=pts[i+1][0]) x=pts[i][1]+(pts[i+1][1]-pts[i][1])*(t-pts[i][0])/(pts[i+1][0]-pts[i][0]); else if(t>pts[i+1][0]) x=pts[i+1][1]; } return x.toFixed(1); })()+" °C";
      if(s.type==="gate_down") v = (st.gate!=null && st.gate<=1)?"1":"0";
      if(s.type==="gate_up") v = (st.gate!=null && st.gate>=89)?"1":"0";
      if(s.type==="led_loop") v = (st.leds[s.led||1]>0)?"hell":"dunkel";
      I.el.textContent=v; }); }
  if(this.cv){ var w=c.world.type; if(w==="buggy") this.drawBuggy(st,t); else if(w==="gate") this.drawGate(st,t); else if(w==="portal") this.drawPortal(st,t); }
};
Panel.prototype.drawBuggy = function(st,t){
  var c=this.cfg.world, cv=this.cv, g=cv.getContext("2d"), W=cv.width, H=cv.height;
  var v=c.view||[-20,-60,220,100]; var sx=W/(v[2]-v[0]), sy=H/(v[3]-v[1]), s=Math.min(sx,sy);
  var ox=(W-(v[2]-v[0])*s)/2, oy=(H-(v[3]-v[1])*s)/2;
  function X(x){ return ox+(x-v[0])*s; } function Y(y){ return H-oy-(y-v[1])*s; }
  g.clearRect(0,0,W,H); g.fillStyle="#fbfbf8"; g.fillRect(0,0,W,H);
  // Raster
  var step=c.grid||10; g.strokeStyle="#e8ece6"; g.lineWidth=1;
  for(var gx=Math.ceil(v[0]/step)*step; gx<=v[2]; gx+=step){ g.beginPath(); g.moveTo(X(gx),Y(v[1])); g.lineTo(X(gx),Y(v[3])); g.stroke(); }
  for(var gy=Math.ceil(v[1]/step)*step; gy<=v[3]; gy+=step){ g.beginPath(); g.moveTo(X(v[0]),Y(gy)); g.lineTo(X(v[2]),Y(gy)); g.stroke(); }
  if(c.axes){ g.strokeStyle="#8a97a3"; g.lineWidth=1.5; g.beginPath(); g.moveTo(X(v[0]),Y(0)); g.lineTo(X(v[2]),Y(0)); g.moveTo(X(0),Y(v[1])); g.lineTo(X(0),Y(v[3])); g.stroke();
    g.fillStyle="#5b6672"; g.font="12px system-ui"; g.fillText("x (cm)",X(v[2])-46,Y(0)-6); g.fillText("y (cm)",X(0)+6,Y(v[3])+14);
    for(var tx=Math.ceil(v[0]/(step*2))*step*2; tx<=v[2]; tx+=step*2){ if(tx!==0) g.fillText(tx, X(tx)-8, Y(0)+14); }
    for(var ty=Math.ceil(v[1]/(step*2))*step*2; ty<=v[3]; ty+=step*2){ if(ty!==0) g.fillText(ty, X(0)+4, Y(ty)+4); } }
  (c.fields||[]).forEach(function(f){ g.fillStyle="rgb("+f[4].join(",")+")"; g.fillRect(X(f[0]),Y(f[3]),(f[2]-f[0])*s,(f[3]-f[1])*s); });
  if(c.track){ var tr=c.track; g.strokeStyle="#111"; g.lineWidth=Math.max(2,(tr.w||2)*s);
    if(tr.type==="circle"||tr.type==="ring"){ g.beginPath(); g.arc(X(tr.c[0]),Y(tr.c[1]),tr.r*s,0,Math.PI*2); g.stroke(); }
    if(tr.type==="polyline"){ g.beginPath(); tr.pts.forEach(function(p,i){ if(i) g.lineTo(X(p[0]),Y(p[1])); else g.moveTo(X(p[0]),Y(p[1])); }); g.stroke(); } }
  (c.targets||[]).forEach(function(p){ g.strokeStyle="#d98e04"; g.lineWidth=2; g.beginPath(); g.arc(X(p[0]),Y(p[1]),5,0,Math.PI*2); g.stroke(); g.beginPath(); g.moveTo(X(p[0])-8,Y(p[1])); g.lineTo(X(p[0])+8,Y(p[1])); g.moveTo(X(p[0]),Y(p[1])-8); g.lineTo(X(p[0]),Y(p[1])+8); g.stroke(); });
  (c.obstacles||[]).forEach(function(o){ g.fillStyle="#b07a45"; g.fillRect(X(o[0]),Y(o[3]),(o[2]-o[0])*s,(o[3]-o[1])*s); g.strokeStyle="#7a5028"; g.strokeRect(X(o[0]),Y(o[3]),(o[2]-o[0])*s,(o[3]-o[1])*s); });
  var P=st.poses;
  for(var i=1;i<P.length;i++){ var a=P[i-1], b=P[i];
    g.beginPath(); g.moveTo(X(a.x),Y(a.y)); g.lineTo(X(b.x),Y(b.y));
    if(b.pen&&a.pen){ g.strokeStyle="#1f4fd1"; g.lineWidth=2.5; g.setLineDash([]); } else { g.strokeStyle="rgba(31,111,120,.45)"; g.lineWidth=1.2; g.setLineDash([4,4]); }
    g.stroke(); }
  g.setLineDash([]);
  var p=P.length?P[P.length-1]:{x:(c.start||[0,0])[0],y:(c.start||[0,0])[1],th:c.heading||0};
  g.save(); g.translate(X(p.x),Y(p.y)); g.rotate(-p.th*Math.PI/180);
  var L=9*s, Wd=13.4*s; g.fillStyle="rgba(31,111,120,.88)"; g.strokeStyle="#0e3c41"; g.lineWidth=1.5;
  g.beginPath(); g.rect(-L*0.55,-Wd/2,L*1.1,Wd); g.fill(); g.stroke();
  g.fillStyle="#111"; g.fillRect(-L*0.25,-Wd/2-2.2*s/2.5,L*0.5,2.2*s/2.5+1); g.fillRect(-L*0.25,Wd/2-1,L*0.5,2.2*s/2.5+1);
  g.fillStyle="#d98e04"; g.beginPath(); g.moveTo(L*0.7,0); g.lineTo(L*0.3,-Wd*0.22); g.lineTo(L*0.3,Wd*0.22); g.closePath(); g.fill();
  g.restore();
  g.fillStyle="#5b6672"; g.font="12px system-ui"; g.fillText("x="+p.x.toFixed(1)+"  y="+p.y.toFixed(1)+"  Winkel="+(((p.th%360)+360)%360).toFixed(0)+"°",8,H-8);
};
Panel.prototype.drawGate = function(st,t){
  var cv=this.cv, g=cv.getContext("2d"), W=cv.width, H=cv.height, c=this.cfg;
  g.clearRect(0,0,W,H); g.fillStyle="#eef3f6"; g.fillRect(0,0,W,H);
  g.fillStyle="#9aa5ad"; g.fillRect(0,H-40,W,40); g.fillStyle="#fff"; for(var x=10;x<W;x+=60) g.fillRect(x,H-22,30,4);
  var bx=120, by=H-130; g.fillStyle="#4c5864"; g.fillRect(bx-18,by,36,90);
  var a=(st.gate==null?(c.world.start_angle||30):st.gate)*Math.PI/180, len=380;
  g.save(); g.translate(bx,by+14); g.rotate(-a);
  for(var i=0;i<8;i++){ g.fillStyle = i%2? "#c0392b":"#ffffff"; g.fillRect(i*len/8,-7,len/8,14); }
  g.strokeStyle="#333"; g.strokeRect(0,-7,len,14); g.restore();
  g.fillStyle="#1c2430"; g.beginPath(); g.arc(bx,by+14,9,0,Math.PI*2); g.fill();
  // Lichtschranke
  var ph=(c.inputs||[]).filter(function(i){return i.kind==="photo";})[0];
  if(ph){ var blocked=!inSched((ph.src||{}).on,t) ; var lx=W-110;
    g.fillStyle="#555"; g.fillRect(lx-60,H-110,10,70); g.fillRect(lx+50,H-110,10,70);
    g.strokeStyle= blocked?"rgba(192,57,43,.25)":"#c0392b"; g.setLineDash([6,5]); g.lineWidth=2; g.beginPath(); g.moveTo(lx-50,H-95); g.lineTo(lx+50,H-95); g.stroke(); g.setLineDash([]);
    if(blocked){ g.fillStyle="#1f6f78"; g.fillRect(lx-40,H-88,80,44); g.fillStyle="#222"; g.beginPath(); g.arc(lx-22,H-42,9,0,7); g.arc(lx+22,H-42,9,0,7); g.fill(); } }
  g.fillStyle="#1c2430"; g.font="13px system-ui"; g.fillText("Schrankenwinkel: "+Math.round((st.gate==null?(c.world.start_angle||30):st.gate))+"°",12,20);
};
Panel.prototype.drawPortal = function(st,t){
  var cv=this.cv, g=cv.getContext("2d"), W=cv.width, H=cv.height, c=this.cfg.world;
  var S=c.size||[200,150,100]; var k=Math.min(W/(S[0]+S[1])/0.95, H/((S[0]+S[1])*0.5+S[2])/1.05)*0.92;
  var cx=W/2+(S[1]-S[0])*0.866*k/2, cy=H-18;
  function P(x,y,z){ return [cx+(x-y)*0.866*k, cy-(x+y)*0.5*k-z*k+((S[0]+S[1])*0)]; }
  g.clearRect(0,0,W,H); g.fillStyle="#fbfbf8"; g.fillRect(0,0,W,H);
  function line(a,b,col,w,dash){ var p=P.apply(null,a), q=P.apply(null,b); g.strokeStyle=col; g.lineWidth=w||1; g.setLineDash(dash||[]); g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(q[0],q[1]); g.stroke(); g.setLineDash([]); }
  for(var x=0;x<=S[0];x+=25) line([x,0,0],[x,S[1],0],"#e3e8e3");
  for(var y=0;y<=S[1];y+=25) line([0,y,0],[S[0],y,0],"#e3e8e3");
  line([0,0,0],[S[0],0,0],"#c0392b",2); line([0,0,0],[0,S[1],0],"#3b7d3a",2); line([0,0,0],[0,0,S[2]],"#1f4fd1",2);
  var a=P(S[0],0,0); g.fillStyle="#c0392b"; g.font="bold 13px system-ui"; g.fillText("x",a[0]+4,a[1]+12);
  a=P(0,S[1],0); g.fillStyle="#3b7d3a"; g.fillText("y",a[0]-14,a[1]+4);
  a=P(0,0,S[2]); g.fillStyle="#1f4fd1"; g.fillText("z",a[0]-12,a[1]);
  [[S[0],0],[S[0],S[1]],[0,S[1]]].forEach(function(q){ line([q[0],q[1],0],[q[0],q[1],S[2]],"#c7ced3"); });
  line([0,0,S[2]],[S[0],0,S[2]],"#c7ced3"); line([S[0],0,S[2]],[S[0],S[1],S[2]],"#c7ced3"); line([S[0],S[1],S[2]],[0,S[1],S[2]],"#c7ced3"); line([0,S[1],S[2]],[0,0,S[2]],"#c7ced3");
  // Teile
  var carried=null, items=JSON.parse(JSON.stringify(c.items||[]));
  st.grab.forEach(function(gr){ if(gr[0]==="grab" && gr[1].n) carried=gr[1].n; if(gr[0]==="drop"){ items.forEach(function(it){ if(it.name===gr[1].n) it.pos=[gr[1].x,gr[1].y,gr[1].z]; }); carried=null; } });
  var X=st.xyz, cur=X.length?X[X.length-1]:{x:c.start[0],y:c.start[1],z:c.start[2]};
  items.forEach(function(it){ var p=it.pos; if(it.name===carried) p=[cur.x,cur.y,cur.z-10];
    var b=P(p[0],p[1],p[2]); g.fillStyle=it.color||"#d98e04"; g.strokeStyle="#6b4a05"; g.fillRect(b[0]-7,b[1]-12,14,12); g.strokeRect(b[0]-7,b[1]-12,14,12);
    g.fillStyle="#1c2430"; g.font="11px system-ui"; g.fillText(it.name,b[0]+9,b[1]-2); });
  (c.targets||[]).forEach(function(p){ var b=P(p[0],p[1],p[2]||0); g.strokeStyle="#d98e04"; g.lineWidth=2; g.beginPath(); g.arc(b[0],b[1],6,0,7); g.stroke(); });
  for(var i=1;i<X.length;i++){ var A=X[i-1], B=X[i]; var draw=(A.z<=0.5&&B.z<=0.5);
    line([A.x,A.y,A.z],[B.x,B.y,B.z], draw?"#1f4fd1":"rgba(217,142,4,.85)", draw?3:1.8, draw?[]:[5,4]); }
  var top=P(cur.x,cur.y,S[2]), tip=P(cur.x,cur.y,cur.z), fl=P(cur.x,cur.y,0);
  g.strokeStyle="rgba(0,0,0,.25)"; g.setLineDash([2,3]); g.beginPath(); g.moveTo(tip[0],tip[1]); g.lineTo(fl[0],fl[1]); g.stroke(); g.setLineDash([]);
  g.strokeStyle="#4c5864"; g.lineWidth=5; g.beginPath(); g.moveTo(top[0],top[1]); g.lineTo(tip[0],tip[1]); g.stroke();
  g.fillStyle=cur.g?"#c0392b":"#1f6f78"; g.beginPath(); g.arc(tip[0],tip[1],5,0,7); g.fill();
  g.fillStyle="#5b6672"; g.font="12px system-ui"; g.fillText("x="+cur.x+" mm  y="+cur.y+" mm  z="+cur.z+" mm"+(cur.g?"  Greifer zu":""),8,16);
};

/* ---------------- Aufgabe aufbauen ---------------- */
function stUpd(key, fn) { if (store(key + ":done")) return; var s = {}; try { s = JSON.parse(store(key + ":st") || "{}") || {}; } catch (e) {} s.n = s.n || 0; s.f = s.f || 0; s.h = s.h || 0; fn(s); store(key + ":st", JSON.stringify(s)); }
function buildExercise(box){
  var id = box.getAttribute("data-ex"); var d = EX[id]; if(!d) return;
  var key = "pylab:"+location.pathname.split("/").pop()+":"+id;
  var grid = el("div","grid"+(d.nosim?" nosim":"")); box.appendChild(grid);
  var left = el("div","edwrap"); grid.appendChild(left);
  var ta = makeEditor(left, d.starter||"", key);
  var btns = el("div","btns"); left.appendChild(btns);
  var bRun = el("button","btn run","▶ Ausführen"); bRun.type="button"; bRun.disabled=!py; btns.appendChild(bRun);
  var bChk=null; if(d.check){ bChk = el("button","btn chk","✓ Prüfen"); bChk.type="button"; bChk.disabled=!py; btns.appendChild(bChk); }
  var hints = d.hints||[], hintIdx=0, bHint=null, hintBox=null;
  if(hints.length){ bHint=el("button","btn","💡 Tipp"); bHint.type="button"; btns.appendChild(bHint); }
  var bSol=null; if(d.solution){ bSol=el("button","btn","Lösung"); bSol.type="button"; btns.appendChild(bSol); }
  var bReset=el("button","btn","↺"); bReset.type="button"; bReset.title="Code zurücksetzen"; btns.appendChild(bReset);
  var outw = el("div","outwrap"); left.appendChild(outw);
  var out = el("div","out"); out.innerHTML='<span class="muted">Ausgabe erscheint hier (Strg+Enter = Ausführen)</span>'; outw.appendChild(out);
  var errb = el("div","errbox"); errb.style.display="none"; outw.appendChild(errb);
  var chks = el("ul","checks"); outw.appendChild(chks);
  if(hints.length){ hintBox=el("div","hint"); outw.appendChild(hintBox); }
  var solBox=null; if(d.solution){ solBox=el("div","sol"); solBox.innerHTML='<b>Musterlösung</b> (erst selbst versuchen!)<pre class="code"><code>'+esc(d.solution)+'</code></pre><button class="btn" type="button">In den Editor übernehmen</button>'; outw.appendChild(solBox);
    solBox.querySelector("button").onclick=function(){ ta.value=d.solution; ta.dispatchEvent(new Event("input")); }; }
  var panel=null;
  if(!d.nosim){ var right=el("div","simwrap"); grid.appendChild(right); panel=new Panel(right, d.cfg||{}); }
  function exec(withCheck){
    if(!py){ loadPython(); return; }
    bRun.disabled=true; if(bChk) bChk.disabled=true;
    setTimeout(function(){
      var r;
      try{ r = runCode(ta.value, d.cfg||{}, withCheck? d.check : null); }
      catch(e){ r = {out:"", err:{type:"Fehler", msg:String(e), line:null, hint:""}, events:[], checks:[], t_end:0}; }
      out.textContent = r.out || ""; if(!r.out) out.innerHTML='<span class="muted">(keine print-Ausgabe)</span>';
      if(r.timeout){ out.innerHTML += '<br><span class="muted">⏱ Simulation nach '+(d.cfg&&d.cfg.limit_t||120)+' s virtueller Zeit beendet.</span>'; }
      if(r.err){ errb.style.display="block"; errb.innerHTML = "<b>"+esc(r.err.type)+"</b>"+(r.err.line?" in Zeile "+r.err.line:"")+": "+esc(r.err.msg)+(r.err.hint?"<br>💡 "+esc(r.err.hint):""); }
      else errb.style.display="none";
      chks.innerHTML="";
      (r.checks||[]).forEach(function(c){ var li=el("li", c.ok?"ok":"no"); li.textContent=c.msg; chks.appendChild(li); });
      var allOk = !!(r.checks && r.checks.length && r.checks.every(function(c){return c.ok;})) && !r.err;
      if(withCheck && d.check) stUpd(key, function(st){ st.n++; if(!st.t0) st.t0=Date.now(); if(!allOk) st.f++; else st.t1=Date.now(); });
      if(withCheck && allOk){
        var li=el("li","ok"); li.innerHTML="<b>Super – Aufgabe gelöst!</b>"; chks.appendChild(li); store(key+":done","1"); markDone(box);
      }
      if(withCheck && d.check) showTries(box, key);
      if(panel) panel.load(r.events, r.t_end);
      bRun.disabled=false; if(bChk) bChk.disabled=false;
    }, 20);
  }
  bRun.onclick=function(){ exec(false); };
  if(bChk) bChk.onclick=function(){ exec(true); };
  if(bHint) bHint.onclick=function(){ stUpd(key,function(st){ st.h++; }); hintBox.classList.add("show"); hintBox.innerHTML = hints.slice(0,hintIdx+1).map(function(h,i){ return "<div>💡 <b>Tipp "+(i+1)+":</b> "+h+"</div>"; }).join(""); hintIdx=Math.min(hintIdx+1,hints.length-1); };
  if(bSol) bSol.onclick=function(){ solBox.classList.toggle("show"); if(solBox.classList.contains("show")) stUpd(key,function(st){ st.s=1; }); };
  bReset.onclick=function(){ ta.value=d.starter||""; ta.dispatchEvent(new Event("input")); };
  if(store(key+":done")) markDone(box);
  showTries(box, key);
}
function markDone(box){ var h=box.querySelector(".exh .lvl"); if(h && h.textContent.indexOf("✓")<0) h.textContent="✓ gelöst · "+h.textContent; }

/* ---------------- Quiz ---------------- */
function showTries(box, key) {   // Versuche für die Schüler sichtbar machen
  var h = box.querySelector(".exh"); if (!h) return;
  var t = h.querySelector(".tries"); if (!t) { t = document.createElement("span"); t.className = "tries"; h.appendChild(t); }
  var st = {}; try { st = JSON.parse(store(key + ":st") || "{}") || {}; } catch (e) {}
  var done = !!store(key + ":done");
  t.textContent = st.n ? (done ? "gelöst im " + st.n + ". Versuch" : st.n + (st.n === 1 ? " Versuch" : " Versuche") + " – noch nicht gelöst") : "";
  t.className = "tries" + (done ? " ok" : (st.n ? " open" : ""));
}
function buildQuiz(q) {   // Ankreuzfragen: Reihenfolge gemischt, Versuche gezählt, gelöst/ungelöst gespeichert
  var file = location.pathname.split("/").pop() || "index.html";
  var items = [].slice.call(q.querySelectorAll(".qq")), head = q.querySelector("b");
  var sum = document.createElement("span"); sum.className = "qsum"; if (head) head.appendChild(sum);
  function updHead() { var d = items.filter(function (it) { return it._done; }).length; sum.textContent = d + " von " + items.length + " gelöst"; sum.className = "qsum" + (d === items.length ? " ok" : ""); }
  items.forEach(function (item) {
    var right = item.getAttribute("data-right"), fb = item.querySelector(".fb");
    var labels = [].slice.call(item.querySelectorAll("label"));
    var inp = labels[0] && labels[0].querySelector("input"), key = "pylab" + ":" + file + ":" + (inp ? inp.name : "q");
    for (var i = labels.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = labels[i]; labels[i] = labels[j]; labels[j] = t; }
    labels.forEach(function (l) { item.insertBefore(l, fb); });
    var badge = document.createElement("span"); badge.className = "qst"; var qt = item.querySelector(".q"); if (qt) qt.appendChild(badge);
    function show() {
      var st = {}; try { st = JSON.parse(store(key + ":st") || "{}") || {}; } catch (e) {}
      item._done = !!store(key + ":done");
      badge.textContent = item._done ? "✓ gelöst" + (st.n ? " im " + st.n + ". Versuch" : "") : (st.n ? "○ ungelöst · " + st.n + (st.n === 1 ? " Versuch" : " Versuche") : "○ ungelöst");
      badge.className = "qst" + (item._done ? " ok" : "");
      updHead();
    }
    if (store(key + ":done")) labels.forEach(function (l) { if (l.getAttribute("data-k") === right) { l.classList.add("right"); var r = l.querySelector("input"); if (r) r.checked = true; } });
    labels.forEach(function (l) {
      var radio = l.querySelector("input"); if (!radio) return;
      radio.addEventListener("change", function () {
        labels.forEach(function (x) { x.classList.remove("right", "wrong"); });
        var ok = l.getAttribute("data-k") === right;
        stUpd(key, function (st) { st.n++; if (!st.t0) st.t0 = Date.now(); if (!ok) st.f++; else st.t1 = Date.now(); });
        if (ok) { store(key + ":done", "1"); l.classList.add("right"); fb.textContent = "Richtig! " + (item.getAttribute("data-why") || ""); }
        else { l.classList.add("wrong"); fb.textContent = "Leider falsch – versuche es noch einmal."; }
        show();
      });
    });
    show();
  });
}

/* ---------------- Start ---------------- */
document.addEventListener("DOMContentLoaded", function(){
  document.querySelectorAll(".ex[data-ex]").forEach(buildExercise);
  document.querySelectorAll(".quiz").forEach(buildQuiz);
  if(document.querySelector(".ex[data-ex]")) loadPython().catch(function(){});
  // Fortschritt auf der Startseite
  document.querySelectorAll("[data-lesson]").forEach(function(card){
    var f=card.getAttribute("data-lesson"), n=parseInt(card.getAttribute("data-count")||"0",10), done=0;
    try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k.indexOf((window.RProg?window.RProg.k("pylab:"):"pylab:")+f+":")===0 && /:done$/.test(k)) done++; } }catch(e){}
    var c=card.querySelector(".prog"); if(c && n){ c.textContent=done+"/"+n+" gelöst"; if(done>=n) c.classList.add("done"); }
  });
});
window.PyLab = {loadPython: loadPython};
})();
