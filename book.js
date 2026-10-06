'use strict';
const $=s=>document.querySelector(s);
const DEF={set:{shop:'Amulet tl'},tx:[]};
const CI=['ขายพระ','ค่าเช่าบูชา','อื่นๆ'],CO=['ซื้อพระเข้า','ค่ากรอบ','ค่าส่ง','ค่าโฆษณา','ค่าที่/ค่าเน็ต','อื่นๆ'];
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
let db,page='day',day=today(),per='m',ref=today().slice(0,7),draft=null,locked=false,hid=0;
const idb=()=>new Promise(r=>{const o=indexedDB.open('amuletbook',1);o.onupgradeneeded=()=>o.result.createObjectStore('k');o.onsuccess=()=>r(o.result)});
const load=async()=>{const d=await idb();return new Promise(r=>{const g=d.transaction('k').objectStore('k').get('db');g.onsuccess=()=>r(g.result||structuredClone(DEF))})};
const save=async()=>{const d=await idb();d.transaction('k','readwrite').objectStore('k').put(db,'db')};
const n=v=>(+v||0).toLocaleString('th-TH');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const toast=t=>{const e=$('#toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2500)};
const go=(p)=>{page=p;render();scrollTo(0,0)};
const paid=t=>t.paid!==false;
function sum(L){const r={in:0,out:0,due:0,sales:0,cogs:0,opex:0};
  L.forEach(t=>{const a=+t.amt||0;if(t.type=='in'){if(!paid(t))r.due+=a;else{r.in+=a;if(t.cat=='ขายพระ'){r.sales+=a;r.cogs+=+t.cost||0}}}else{r.out+=a;if(t.cat!='ซื้อพระเข้า')r.opex+=a}});return r}
/* PIN */
const sha=async x=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)))].map(b=>b.toString(16).padStart(2,'0')).join('');
function lockScreen(){$('#top').innerHTML='<div><b>ACCOUNT BOOK</b></div>';$('#nav').innerHTML='';
  $('#app').innerHTML=`<div class="card" style="margin-top:60px;text-align:center"><h2>ใส่รหัสผ่าน</h2><input id="pin" type="password" inputmode="numeric" maxlength="6" style="text-align:center;font-size:24px" onkeydown="if(event.key=='Enter')tryPin()"><div class="k" id="pmsg" style="margin-top:6px"></div><button class="p f" style="margin-top:10px" onclick="tryPin()">ปลดล็อก</button></div>`}
async function tryPin(){const v=$('#pin').value,p=db.set.pin;if(!v)return;if(await sha(p.salt+v)==p.hash){locked=false;render()}else{$('#pin').value='';$('#pmsg').textContent='รหัสไม่ถูกต้อง'}}
async function setPin(){if(db.set.pin){const o=prompt('ใส่รหัสเดิม');if(o===null)return;if(await sha(db.set.pin.salt+o)!=db.set.pin.hash)return alert('รหัสเดิมไม่ถูกต้อง')}
  const a=prompt('ตั้งรหัสใหม่ (ตัวเลข 4-6 หลัก)');if(a===null)return;if(!/^\d{4,6}$/.test(a))return alert('ต้องเป็นตัวเลข 4-6 หลัก');
  if(prompt('ใส่รหัสอีกครั้งเพื่อยืนยัน')!==a)return alert('รหัสไม่ตรงกัน');const salt=uid();db.set.pin={salt,hash:await sha(salt+a)};save();toast('ตั้งรหัสแล้ว');render()}
async function rmPin(){const o=prompt('ใส่รหัสเพื่อปิดการล็อก');if(o===null)return;if(await sha(db.set.pin.salt+o)!=db.set.pin.hash)return alert('รหัสไม่ถูกต้อง');delete db.set.pin;save();render()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hid=Date.now();else if(db&&db.set.pin&&hid&&Date.now()-hid>300000){locked=true;render()}});
/* render */
function render(){
  if(locked&&db.set.pin)return lockScreen();
  $('#top').innerHTML=`<div><b>ACCOUNT BOOK</b><small>${esc(db.set.shop)}</small></div>`;
  $('#nav').innerHTML=[['day','รายวัน'],['sum','สรุป'],['set','ตั้งค่า']].map(([k,l])=>`<a class="${page==k||(page=='form'&&k=='day')?'on':''}" onclick="go('${k}')">${l}</a>`).join('');
  $('#app').innerHTML=({day:dayv,form:formv,sum:sumv,set:setv})[page]();
}
const row=(t,d)=>`<div class="row" onclick="editTx('${t.id}')"><div class="t"><b>${esc(t.note||t.cat)}</b><span>${esc(t.cat)}${d?' • '+t.date:''}</span></div><div style="text-align:right;color:var(--${t.type=='in'?'ok':'bad'})"><b>${t.type=='in'?'+':'-'}${n(t.amt)}</b>${paid(t)?'':'<div class="k">ค้างรับ</div>'}</div></div>`;
function shift(d){const x=new Date(day);x.setDate(x.getDate()+d);day=x.toISOString().slice(0,10);render()}
function dayv(){
  const L=db.tx.filter(t=>t.date==day),s=sum(L);
  return `<div class="top"><button onclick="shift(-1)">‹</button><input type="date" value="${day}" onchange="if(this.value){day=this.value;render()}"><button onclick="shift(1)">›</button></div>
  <div class="grid"><div class="card"><div class="k">รายรับ</div><div class="v" style="color:var(--ok)">${n(s.in)}</div></div><div class="card"><div class="k">รายจ่าย</div><div class="v" style="color:var(--bad)">${n(s.out)}</div></div></div>
  <div class="card" style="text-align:center"><div class="k">เหลือ${day==today()?'วันนี้':''}</div><div class="v g big">${n(s.in-s.out)}</div>${s.due?`<div class="k">ค้างรับ ${n(s.due)}</div>`:''}</div>
  <div class="btns"><button class="p" onclick="newTx('in')">+ รายรับ</button><button onclick="newTx('out')">+ รายจ่าย</button></div>
  ${L.map(t=>row(t)).join('')||'<div class="note">ยังไม่มีรายการในวันนี้</div>'}`}
/* form */
const newTx=type=>{draft={type,date:day,amt:'',cat:(type=='in'?CI:CO)[0],note:'',cost:'',paid:true};go('form')};
const editTx=id=>{draft={...db.tx.find(t=>t.id==id),edit:id};go('form')};
function syncF(){if(page!='form')return;const g=i=>$('#'+i);if(g('f_amt'))draft.amt=g('f_amt').value;if(g('f_note'))draft.note=g('f_note').value;if(g('f_date'))draft.date=g('f_date').value;if(g('f_cost'))draft.cost=g('f_cost').value;if(g('f_due'))draft.paid=!g('f_due').checked}
function setCat(c){syncF();draft.cat=c;render()}
function formv(){
  const d=draft,C=d.type=='in'?CI:CO;
  return `<h2>${d.edit?'แก้ไข':'เพิ่ม'}${d.type=='in'?'รายรับ':'รายจ่าย'}</h2>
  <label>จำนวนเงิน (บาท)<input id="f_amt" inputmode="decimal" value="${esc(d.amt)}" style="font-size:24px"></label>
  <label>${d.type=='in'?'รับจากอะไร (เช่น ขายหลวงปู่ทวด, ค่าเช่าบูชา)':'จ่ายอะไร (เช่น ซื้อพระ 3 องค์, ค่าส่งพัสดุ)'}<input id="f_note" list="sug" value="${esc(d.note)}" placeholder="พิมพ์รายการ"></label>
  <datalist id="sug">${[...new Set(db.tx.filter(t=>t.type==d.type&&t.note).reverse().map(t=>t.note))].slice(0,30).map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
  <div class="k" style="margin-top:8px">หมวด</div><div class="chips" style="flex-wrap:wrap">${C.map(c=>`<button class="${d.cat==c?'on':''}" onclick="setCat('${c}')">${c}</button>`).join('')}</div>
  <label>วันที่<input id="f_date" type="date" value="${d.date}"></label>
  ${d.type=='in'&&d.cat=='ขายพระ'?`<label>ต้นทุนพระที่ขาย (ถ้ารู้ ใช้คำนวณกำไร)<input id="f_cost" inputmode="decimal" value="${esc(d.cost)}"></label>`:''}
  ${d.type=='in'?`<label style="display:flex;gap:10px;align-items:center"><input id="f_due" type="checkbox" style="width:24px;min-height:24px;margin:0" ${d.paid?'':'checked'}>ยังไม่ได้รับเงิน (ค้างรับ)</label>`:''}
  <div class="btns"><button onclick="go('day')">ยกเลิก</button><button class="p" onclick="saveTx()">บันทึก</button>${d.edit?'<button class="d" onclick="delTx()">ลบ</button>':''}</div>`}
function saveTx(){
  syncF();const d=draft,a=+d.amt;
  if(!(a>0))return alert('กรอกจำนวนเงินมากกว่า 0');if(!d.note.trim())return alert(d.type=='in'?'ใส่ว่ารับจากอะไร':'ใส่ว่าจ่ายอะไร');if(!/^\d{4}-\d\d-\d\d$/.test(d.date))return alert('เลือกวันที่');
  if(d.cost!==''&&!(+d.cost>=0))return alert('ต้นทุนต้องเป็นตัวเลข');
  const t={id:d.edit||uid(),type:d.type,date:d.date,amt:a,cat:d.cat,note:d.note.trim(),cost:d.type=='in'&&d.cat=='ขายพระ'&&d.cost!==''?+d.cost:0,paid:d.paid};
  if(d.src)t.src=d.src;if(d.edit)db.tx=db.tx.map(x=>x.id==d.edit?t:x);else db.tx.push(t);
  save();day=d.date;toast('บันทึกแล้ว');go('day')}
function delTx(){if(!confirm('ลบรายการนี้?'))return;db.tx=db.tx.filter(t=>t.id!=draft.edit);save();go('day')}
/* summary */
function shiftRef(d){if(per=='y')ref=String(+ref.slice(0,4)+d);else{const x=new Date(ref+'-01T12:00:00');x.setMonth(x.getMonth()+d);ref=x.toISOString().slice(0,7)}render()}
function sumv(){
  const L=db.tx.filter(t=>t.date.startsWith(ref)),s=sum(L),net=s.in-s.cogs-s.opex;
  const keys=per=='y'?Array.from({length:12},(_,i)=>ref+'-'+String(i+1).padStart(2,'0')):Array.from({length:new Date(+ref.slice(0,4),+ref.slice(5),0).getDate()},(_,i)=>ref+'-'+String(i+1).padStart(2,'0'));
  const bk=keys.map(k=>sum(db.tx.filter(t=>t.date.startsWith(k)))),mx=Math.max(1,...bk.map(b=>Math.max(b.in,b.out)));
  const cats=['in','out'].map(ty=>{const m={};L.filter(t=>t.type==ty&&(ty=='out'||paid(t))).forEach(t=>m[t.cat]=(m[t.cat]||0)+(+t.amt||0));const tot=Object.values(m).reduce((a,b)=>a+b,0)||1;
    return `<h3>${ty=='in'?'รายรับ':'รายจ่าย'}แยกตามหมวด</h3>`+(Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="card" style="margin:6px 0;padding:10px"><div style="display:flex;justify-content:space-between"><span>${esc(c)}</span><b>${n(v)}</b></div><div class="pb"><i style="width:${Math.round(v/tot*100)}%"></i></div></div>`).join('')||'<div class="k">ไม่มีรายการ</div>')}).join('');
  const box=(k,v,g)=>`<div class="card"><div class="k">${k}</div><div class="v ${g?'g':''}">${v}</div></div>`;
  return `<div class="chips"><button class="${per=='m'?'on':''}" onclick="per='m';ref=ref.slice(0,7)||today().slice(0,7);if(ref.length<7)ref=today().slice(0,7);render()">รายเดือน</button><button class="${per=='y'?'on':''}" onclick="per='y';ref=ref.slice(0,4);render()">รายปี</button></div>
  <div class="top"><button onclick="shiftRef(-1)">‹</button><div class="card" style="flex:1;margin:0;text-align:center;padding:10px"><b>${per=='y'?'ปี '+(+ref+543):new Date(ref+'-01T12:00:00').toLocaleDateString('th-TH',{month:'long',year:'numeric'})}</b></div><button onclick="shiftRef(1)">›</button></div>
  <div class="grid">${box('รายรับ',n(s.in))}${box('รายจ่าย',n(s.out))}${box('เงินสดคงเหลือ',n(s.in-s.out))}${box('ค้างรับ',n(s.due))}${box('กำไรขั้นต้น',n(s.sales-s.cogs),1)}${box('กำไรสุทธิ',n(net),1)}</div>
  <div class="note">กำไรขั้นต้น = ยอดขายพระ ลบ ต้นทุนพระที่ขาย • กำไรสุทธิ = รายรับ ลบ ต้นทุนพระ ลบ ค่าใช้จ่ายอื่น (ไม่นับ “ซื้อพระเข้า” เพราะนับเป็นต้นทุนตอนขาย)</div>
  <div class="bars">${bk.map(b=>`<div><i style="height:${Math.round(b.in/mx*100)}%;background:var(--ok)"></i><i style="height:${Math.round(b.out/mx*100)}%;background:var(--bad)"></i></div>`).join('')}</div>
  <div class="lab"><span>${per=='y'?'ม.ค.':'1'}</span><span>เขียว = รับ • แดง = จ่าย</span><span>${per=='y'?'ธ.ค.':keys.length}</span></div>${cats}${per=='m'?`<h3>รายการทั้งหมดในเดือนนี้ (${L.length})</h3>${L.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>row(t,1)).join('')||'<div class="k">ไม่มีรายการ</div>'}`:''}`}
/* settings */
function setv(){
  const s=db.set;
  return `<h2>ตั้งค่า</h2><div class="card"><label>ชื่อร้าน<input id="st_shop" value="${esc(s.shop)}"></label><button class="p f" style="margin-top:8px" onclick="db.set.shop=$('#st_shop').value.trim()||'Amulet tl';save();toast('บันทึกแล้ว');render()">บันทึก</button></div>
  <h3>รหัสผ่านเข้าแอป</h3><div class="card"><div class="k">${s.pin?'เปิดใช้งานอยู่':'ยังไม่ได้ตั้งรหัส'}</div><button class="p f" style="margin-top:8px" onclick="setPin()">${s.pin?'เปลี่ยนรหัส':'ตั้งรหัส'}</button>${s.pin?'<button class="d f" style="margin-top:8px" onclick="rmPin()">ปิดรหัส</button>':''}</div>
  <h3>สำรองข้อมูล</h3><div class="note">ข้อมูลเก็บอยู่ในเครื่องนี้เท่านั้น ไม่ได้อยู่บน Cloud หากล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง ข้อมูลจะหาย กรุณา Export สำรองเป็นประจำ ลืมรหัสแล้วกู้ไม่ได้</div>
  <div class="btns"><button class="p" onclick="expo()">Export / Backup</button><label class="btn" style="margin:0">Import<input type="file" accept=".json" hidden onchange="impo(this)"></label></div>
  <h3>นำเข้าจากแอปสต็อก</h3><div class="note">เลือกไฟล์ Export จากแอป AMULET STOCK ระบบจะสร้างรายรับจากการขาย (พร้อมต้นทุน) และรายจ่าย “ซื้อพระเข้า” ให้ นำเข้าซ้ำได้ ไม่ซ้ำรายการเดิม</div>
  <label class="btn" style="margin:0">นำเข้าไฟล์จากแอปสต็อก<input type="file" accept=".json" hidden onchange="impStock(this)"></label>`}
function expo(){const b=new Blob([JSON.stringify(db)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`amulet-book-${today()}.json`;a.click()}
function rd(i,cb){const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{cb(JSON.parse(r.result))}catch(e){alert('ไฟล์ไม่ถูกต้อง')}};r.readAsText(f)}
function impo(i){rd(i,d=>{if(!Array.isArray(d.tx))throw 0;if(!confirm('นำเข้าจะแทนที่ข้อมูลปัจจุบันทั้งหมด ดำเนินการต่อ?'))return;const pk=db.set.pin;db={...structuredClone(DEF),...d};if(pk)db.set.pin=pk;save();toast('นำเข้าแล้ว');go('day')})}
function impStock(i){rd(i,d=>{if(!Array.isArray(d.amulets)||!Array.isArray(d.sales))throw 0;
  const have=new Set(db.tx.map(t=>t.src).filter(Boolean)),cost=a=>(+a.buy||0)+(+a.frame||0)+(+a.ship||0)+(+a.other||0),nm=a=>{const m=(d.models||[]).find(x=>x.id==a.mid)||{};return(m.name||'')+' '+(a.sku||'')};let c=0;
  const add=t=>{if(have.has(t.src))return;db.tx.push({id:uid(),paid:true,note:'',cost:0,...t});have.add(t.src);c++};
  d.amulets.forEach(a=>{if(cost(a)>0)add({src:'a:'+a.id,type:'out',date:a.inDate||today(),amt:cost(a),cat:'ซื้อพระเข้า',note:nm(a)})});
  d.sales.forEach(s=>{const a=d.amulets.find(x=>x.id==s.aid)||{};add({src:'s:'+s.id,type:'in',date:s.date||today(),amt:+s.price||0,cat:'ขายพระ',note:nm(a),cost:cost(a)});
    if((+s.ship||0)+(+s.other||0)>0)add({src:'f:'+s.id,type:'out',date:s.date||today(),amt:(+s.ship||0)+(+s.other||0),cat:'ค่าส่ง',note:'ค่าส่ง/ค่าใช้จ่ายตอนขาย '+nm(a)})});
  save();toast(`นำเข้า ${c} รายการ`);go('day')})}
load().then(d=>{db=d;locked=!!db.set.pin;render()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('book-sw.js',{scope:'./book.html'}).catch(()=>{});
