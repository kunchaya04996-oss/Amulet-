'use strict';
const $=s=>document.querySelector(s);
const DEF={set:{shop:'Amulet tl',prefix:'ATL-',logo:''},models:[],amulets:[],sales:[],customers:[],expenses:[],moves:[],seq:0};
const ST={in:'มีในสต็อก',res:'จอง',sold:'ขายแล้ว'};
let db,page='home',arg=null,flt='all',q='',draft=null;
/* ---------- storage (IndexedDB, ข้อมูลอยู่ในเครื่องเท่านั้น) ---------- */
const idb=()=>new Promise(r=>{const o=indexedDB.open('amuletstock',1);o.onupgradeneeded=()=>o.result.createObjectStore('k');o.onsuccess=()=>r(o.result)});
const load=async()=>{const d=await idb();return new Promise(r=>{const g=d.transaction('k').objectStore('k').get('db');g.onsuccess=()=>r(g.result||structuredClone(DEF))})};
const save=async()=>{const d=await idb();d.transaction('k','readwrite').objectStore('k').put(db,'db')};
/* ---------- helpers ---------- */
const M=id=>db.models.find(m=>m.id==id),A=id=>db.amulets.find(a=>a.id==id),sale=a=>db.sales.find(s=>s.aid==a.id);
const cost=a=>(+a.buy||0)+(+a.frame||0)+(+a.ship||0)+(+a.other||0);
const exp=a=>(+a.price||0)-cost(a);
const n=v=>(+v||0).toLocaleString('th-TH');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date().toISOString().slice(0,10);
const toast=t=>{const e=$('#toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2500)};
const mv=(aid,t,note='')=>db.moves.push({id:uid(),aid,t,note,d:new Date().toISOString()});
function nextCode(){let c;do{db.seq++;c=db.set.prefix+String(db.seq).padStart(6,'0')}while(db.amulets.some(a=>a.sku==c));return c}
const title=a=>{const m=M(a.mid)||{};return esc(m.name)+' '+esc(m.gen)};
const sub=a=>{const m=M(a.mid)||{};return [m.mat,m.type,m.year].filter(Boolean).map(esc).join(' • ')};
const chip=s=>`<span class="chip ${s}">${ST[s]}</span>`;
const go=(p,a=null)=>{page=p;arg=a;render();scrollTo(0,0)};
/* ---------- PIN lock ---------- */
let locked=false,hid=0;
const sha=async x=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)))].map(b=>b.toString(16).padStart(2,'0')).join('');
function lockScreen(){$('#top').innerHTML='<div><b>AMULET STOCK</b></div>';$('#nav').innerHTML='';
  $('#app').innerHTML=`<div class="card" style="margin-top:60px;text-align:center"><h2>ใส่รหัสผ่าน</h2><input id="pin" type="password" inputmode="numeric" maxlength="6" style="text-align:center;font-size:24px;letter-spacing:.3em" onkeydown="if(event.key=='Enter')tryPin()"><div class="k" id="pmsg" style="margin-top:6px"></div><button class="p f" style="margin-top:10px" onclick="tryPin()">ปลดล็อก</button></div>`;setTimeout(()=>$('#pin')?.focus(),50)}
async function tryPin(){const v=$('#pin').value,p=db.set.pin;if(!v)return;if(await sha(p.salt+v)==p.hash){locked=false;render()}else{$('#pin').value='';$('#pmsg').textContent='รหัสไม่ถูกต้อง'}}
async function setPin(){if(db.set.pin){const o=prompt('ใส่รหัสเดิม');if(o===null)return;if(await sha(db.set.pin.salt+o)!=db.set.pin.hash)return alert('รหัสเดิมไม่ถูกต้อง')}
  const a=prompt('ตั้งรหัสใหม่ (ตัวเลข 4-6 หลัก)');if(a===null)return;if(!/^\d{4,6}$/.test(a))return alert('ต้องเป็นตัวเลข 4-6 หลัก');
  if(prompt('ใส่รหัสอีกครั้งเพื่อยืนยัน')!==a)return alert('รหัสไม่ตรงกัน');
  const salt=uid();db.set.pin={salt,hash:await sha(salt+a)};save();toast('ตั้งรหัสแล้ว');render()}
async function rmPin(){const o=prompt('ใส่รหัสเพื่อปิดการล็อก');if(o===null)return;if(await sha(db.set.pin.salt+o)!=db.set.pin.hash)return alert('รหัสไม่ถูกต้อง');delete db.set.pin;save();render()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hid=Date.now();else if(db&&db.set.pin&&hid&&Date.now()-hid>300000){locked=true;render()}});
/* ---------- render ---------- */
function render(){
  if(locked&&db.set.pin)return lockScreen();
  $('#top').innerHTML=(db.set.logo?`<img src="${db.set.logo}">`:'')+`<div><b>AMULET STOCK</b><small>${esc(db.set.shop)}</small></div>`;
  const tabs=[['home','หน้าหลัก'],['stock','สต็อก'],['models','รุ่น'],['add','เพิ่ม'],['report','รายงาน'],['set','ตั้งค่า']];
  const cur=({detail:'stock',sell:'stock',model:'models'})[page]||page;
  $('#nav').innerHTML=tabs.map(([k,l])=>`<a class="${cur==k?'on':''}" onclick="${k=='add'?'newAdd()':`go('${k}')`}">${l}</a>`).join('');
  $('#app').innerHTML=({home,stock,models,model,add,detail,sell,report,set})[page]();
}
function home(){
  const L=db.amulets,c=s=>L.filter(a=>a.status==s).length,st=L.filter(a=>a.status!='sold');
  const rev=db.sales.reduce((t,s)=>t+s.price,0),pr=db.sales.reduce((t,s)=>t+s.profit,0);
  const box=(k,v,g)=>`<div class="card"><div class="k">${k}</div><div class="v ${g?'g':''}">${v}</div></div>`;
  return `<h2>ภาพรวม</h2><div class="grid">${box('พระทั้งหมด',L.length)}${box('มีในสต็อก',c('in'))}${box('จอง',c('res'))}${box('ขายแล้ว',c('sold'))}
  ${box('ต้นทุนในสต็อก',n(st.reduce((t,a)=>t+cost(a),0)))}${box('มูลค่าราคาขาย',n(st.reduce((t,a)=>t+(+a.price||0),0)))}
  ${box('กำไรคาดการณ์',n(st.reduce((t,a)=>t+exp(a),0)),1)}${box('ยอดขาย',n(rev))}${box('กำไรจริง',n(pr),1)}</div>
  <div class="btns"><button class="p" onclick="newAdd()">+ เพิ่มพระ</button><button onclick="go('stock')">ค้นหาพระ</button></div>
  ${L.length?'':'<div class="note">ยังไม่มีพระ เริ่มจากกด “เพิ่มพระ” แล้วกรอกข้อมูลรุ่นครั้งเดียว</div>'}`;
}
/* ---------- stock ---------- */
const hay=a=>{const m=M(a.mid)||{};return [m.name,m.gen,m.temple,m.mat,m.type,m.year,a.code,a.no,a.sku].join(' ').toLowerCase()};
function rows(){
  const k=q.trim().toLowerCase(),L=db.amulets.filter(a=>(flt=='all'||a.status==flt)&&(!k||hay(a).includes(k)));
  return L.length?L.map(a=>`<div class="row" onclick="go('detail','${a.id}')">${a.img.f?`<img src="${a.img.f}">`:'<div class="ph0"></div>'}
  <div class="t"><b>${title(a)}</b><span>${sub(a)}</span><span>${esc(a.sku)} • เลข ${esc(a.no)||'-'} • ${esc(a.code)||'-'}</span></div>
  <div style="text-align:right">${chip(a.status)}<div class="k">${n(a.price)}</div></div></div>`).join(''):'<div class="note">ไม่พบรายการ</div>';
}
function stock(){
  return `<h2>สต็อก</h2><input placeholder="ค้นหา ชื่อ รุ่น วัด เนื้อ พิมพ์ ปี โค้ด เลของค์ รหัส" value="${esc(q)}" oninput="q=this.value;$('#list').innerHTML=rows()">
  <div class="chips">${[['all','ทั้งหมด'],['in','มีในสต็อก'],['res','จอง'],['sold','ขายแล้ว']].map(([k,l])=>`<button class="${flt==k?'on':''}" onclick="flt='${k}';render()">${l}</button>`).join('')}</div><div id="list">${rows()}</div>`;
}
/* ---------- models ---------- */
function models(){
  return `<h2>รุ่นพระ</h2>`+(db.models.map(m=>{const L=db.amulets.filter(a=>a.mid==m.id),c=s=>L.filter(a=>a.status==s).length;
  return `<div class="card" onclick="go('model','${m.id}')"><b>${esc(m.name)} ${esc(m.gen)}</b><div class="k">${[m.mat,m.type,m.year].filter(Boolean).map(esc).join(' • ')}</div>
  <div style="margin-top:6px">มีทั้งหมด ${L.length} องค์ • สต็อก ${c('in')} • จอง ${c('res')} • ขายแล้ว ${c('sold')}</div></div>`}).join('')||'<div class="note">ยังไม่มีรุ่น</div>');
}
function model(){
  const m=M(arg),L=db.amulets.filter(a=>a.mid==m.id);
  return `<h2>${esc(m.name)} ${esc(m.gen)}</h2><div class="k">${[m.temple,m.prov,m.mat,m.type,m.year].filter(Boolean).map(esc).join(' • ')}</div>
  <p>${esc(m.desc)}</p><div class="btns"><button class="p" onclick="newAdd('${m.id}')">+ เพิ่มองค์ในรุ่นนี้</button><button onclick="editM('${m.id}')">แก้ไขรุ่น</button><button class="d" onclick="delM('${m.id}')">ลบรุ่น</button></div>
  ${L.map(a=>`<div class="row" onclick="go('detail','${a.id}')"><div class="t"><b>เลข ${esc(a.no)||'-'} • ${esc(a.code)||'-'}</b><span>${esc(a.sku)} • ต้นทุน ${n(cost(a))}</span></div>${chip(a.status)}</div>`).join('')}`;
}
function delM(id){if(db.amulets.some(a=>a.mid==id))return alert('ลบไม่ได้ ยังมีพระในรุ่นนี้ ลบพระทุกองค์ก่อน');
  if(confirm('ลบรุ่นนี้?')){db.models=db.models.filter(m=>m.id!=id);save();go('models')}}
/* ---------- add / edit form ---------- */
const newItem=()=>({sku:'',no:'',code:'',buy:'',frame:'',ship:'',other:'',price:'',min:'',cond:'',note:'',img:{}});
function newAdd(mid=''){draft={mode:'add',mid,m:{},items:[newItem()],multi:false,cnt:5};go('add')}
function editA(id){const a=A(id);draft={mode:'editA',aid:id,mid:a.mid,m:{},items:[structuredClone(a)],multi:false};go('add')}
function editM(id){draft={mode:'editM',mid:id,m:structuredClone(M(id)),items:[]};go('add')}
const MF=[['name','ชื่อพระ'],['gen','รุ่น'],['temple','วัด / สำนัก'],['prov','จังหวัด'],['mat','เนื้อ'],['type','พิมพ์'],['year','ปีจัดสร้าง'],['qty','จำนวนจัดสร้าง'],['desc','รายละเอียด'],['note','หมายเหตุ']];
const IF=[['no','เลขประจำองค์'],['code','โค้ด'],['buy','ราคาซื้อ'],['frame','ค่ากรอบ'],['ship','ค่าส่ง'],['other','ค่าใช้จ่ายอื่น'],['price','ราคาขาย'],['min','ราคาต่ำสุด']];
const inp=(id,l,v,num)=>`<label>${l}<input id="${id}" value="${esc(v)}" ${num?'inputmode="decimal"':''}></label>`;
function sync(){if(page!='add'||!draft)return;
  if($('#m_name')||draft.mode=='editM')MF.forEach(([k])=>{const e=$('#m_'+k);if(e)draft.m[k]=e.value});
  const e=$('#cnt');if(e)draft.cnt=+e.value;
  draft.items.forEach((it,i)=>{[...IF.map(x=>x[0]),'cond','note'].forEach(k=>{const e=$(`#i${i}_${k}`);if(e)it[k]=e.value})})}
function photo(i,k,l,u){return `<label class="ph">${u?`<img src="${u}">`:`<span>${l}</span>`}<input type="file" accept="image/*" hidden onchange="pick(this,${i},'${k}')"></label>`}
function pick(inp,i,k){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
  const s=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  const u=c.toDataURL('image/jpeg',.72);if(i=='logo'){db.set.logo=u;save()}else{sync();if(i=='m')draft.m.img=u;else draft.items[i].img[k]=u}render()};im.src=r.result};r.readAsDataURL(f)}
function add(){
  const d=draft,m=d.mode,showM=m=='editM'||(m=='add'&&!d.mid);
  let h=`<h2>${m=='add'?'เพิ่มพระ':m=='editA'?'แก้ไขพระ':'แก้ไขรุ่น'}</h2>`;
  if(m=='add')h+=`<div class="chips"><button class="${d.multi?'':'on'}" onclick="sync();draft.multi=false;draft.items=[draft.items[0]];render()">เพิ่ม 1 องค์</button><button class="${d.multi?'on':''}" onclick="sync();draft.multi=true;render()">เพิ่มหลายองค์จากรุ่นเดียวกัน</button></div>
  <label>รุ่น<select onchange="sync();draft.mid=this.value;render()"><option value="">+ สร้างรุ่นใหม่</option>${db.models.map(x=>`<option value="${x.id}" ${x.id==d.mid?'selected':''}>${esc(x.name)} ${esc(x.gen)}</option>`).join('')}</select></label>`;
  if(showM)h+=`<h3>ข้อมูลรุ่น (กรอกครั้งเดียว)</h3><div class="card">${MF.map(([k,l])=>inp('m_'+k,l,d.m[k]||'',k=='qty')).join('')}<div style="max-width:120px;margin-top:8px">${photo('m','',  'รูปรุ่น',d.m.img)}</div></div>`;
  if(m=='add'&&d.multi)h+=`<div class="card"><label>จำนวนองค์<input id="cnt" type="number" min="1" max="100" value="${d.cnt||5}"></label>
  <button class="f" onclick="sync();setCnt()">สร้างรายการตามจำนวน</button></div>`;
  if(m!='editM'){h+=d.items.map((it,i)=>`<div class="card"><b>องค์ที่ ${i+1}</b>${m=='editA'?` <span class="k">${esc(it.sku)}</span>`:''}
   <div class="two">${IF.map(([k,l])=>`<div>${inp(`i${i}_${k}`,l,it[k],!['no','code'].includes(k))}</div>`).join('')}</div>
   ${inp(`i${i}_cond`,'สภาพพระ',it.cond)}${inp(`i${i}_note`,'หมายเหตุ',it.note)}
   <div class="photos">${[['f','หน้า'],['b','หลัง'],['s','ข้าง'],['d','ตำหนิ']].map(([k,l])=>photo(i,k,l,it.img[k])).join('')}</div>
   ${m=='add'&&d.items.length>1?`<button class="d f" style="margin-top:8px" onclick="sync();draft.items.splice(${i},1);render()">ลบองค์นี้</button>`:''}</div>`).join('');
   if(m=='add'&&d.multi)h+=`<button class="f" onclick="sync();draft.items.push(newItem());render()">+ เพิ่มองค์</button>`}
  return h+`<div class="btns"><button onclick="go('home')">ยกเลิก</button><button class="p" onclick="saveForm()">บันทึก</button></div>`;
}
function setCnt(){const c=Math.max(1,Math.min(100,draft.cnt||1));while(draft.items.length<c)draft.items.push(newItem());draft.items.length=c;render()}
function saveForm(){
  sync();const d=draft;
  if(d.mode=='editM'){if(!d.m.name?.trim())return alert('กรอกชื่อพระ');Object.assign(M(d.mid),d.m);save();toast('บันทึกแล้ว');return go('model',d.mid)}
  const mid=d.mid||uid();
  if(!d.mid&&!d.m.name?.trim())return alert('กรอกชื่อพระ');
  const seenN=new Set(),seenC=new Set();
  for(const[i,it]of d.items.entries()){
    for(const k of['buy','frame','ship','other','price','min'])if(it[k]!==''&&!(+it[k]>=0))return alert(`องค์ที่ ${i+1}: ${k} ต้องเป็นตัวเลขไม่ติดลบ`);
    const others=db.amulets.filter(a=>a.mid==mid&&a.id!=it.id&&a.id!=d.aid);
    const no=it.no.trim(),code=it.code.trim();
    if(no&&(seenN.has(no)||others.some(a=>a.no==no)))return alert(`องค์ที่ ${i+1}: เลขประจำองค์ ${no} ซ้ำในรุ่นเดียวกัน`);
    if(code&&(seenC.has(code)||others.some(a=>a.code==code)))return alert(`องค์ที่ ${i+1}: โค้ด ${code} ซ้ำในรุ่นเดียวกัน`);
    seenN.add(no);seenC.add(code)}
  if(d.mode=='editA'){const a=A(d.aid),it=d.items[0];['no','code','buy','frame','ship','other','price','min','cond','note','img'].forEach(k=>a[k]=it[k]);mv(a.id,'แก้ไขข้อมูล');save();toast('บันทึกแล้ว');return go('detail',a.id)}
  if(!d.mid)db.models.push({id:mid,...d.m});
  const made=d.items.map(it=>{const a={...it,id:uid(),mid,sku:nextCode(),status:'in',inDate:today(),soldDate:''};db.amulets.push(a);mv(a.id,'ซื้อเข้า');mv(a.id,'เข้าสต็อก');return a.sku});
  save();toast(`เพิ่ม ${made.length} องค์ (${made[0]}${made.length>1?' ถึง '+made.at(-1):''})`);go(d.mid?'model':'models',mid)}
/* ---------- detail ---------- */
function detail(){
  const a=A(arg),m=M(a.mid)||{},s=sale(a);
  const info=[['รหัสสินค้า',a.sku],['รุ่น',m.name+' '+(m.gen||'')],['เนื้อ',m.mat],['พิมพ์',m.type],['ปี',m.year],['เลขประจำองค์',a.no],['โค้ด',a.code],['สภาพ',a.cond],['ต้นทุนรวม',n(cost(a))],['ราคาขาย',n(a.price)],['ราคาต่ำสุด',n(a.min)],[s?'กำไรจริง':'กำไรคาดการณ์',n(s?s.profit:exp(a))],['เข้าสต็อก',a.inDate],['หมายเหตุ',a.note]];
  return `<h2>${title(a)} ${chip(a.status)}</h2><div class="photos">${[['f','หน้า'],['b','หลัง'],['s','ข้าง'],['d','ตำหนิ']].map(([k,l])=>`<div class="ph">${a.img[k]?`<img src="${a.img[k]}">`:`<span>${l}</span>`}</div>`).join('')}</div>
  <div class="card">${info.map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0"><span class="k">${k}</span><span>${esc(v)||'-'}</span></div>`).join('')}</div>
  <div class="btns">${a.status!='sold'?`<button class="p" onclick="go('sell','${a.id}')">ขาย</button><button onclick="reserve('${a.id}')">${a.status=='res'?'ยกเลิกการจอง':'จอง'}</button>`:`<button onclick="unsell('${a.id}')">ยกเลิกการขาย</button>`}
  <button onclick="editA('${a.id}')">แก้ไข</button><button class="d" onclick="delA('${a.id}')">ลบ</button></div>
  <h3>ประวัติการเคลื่อนไหว</h3>${db.moves.filter(x=>x.aid==a.id).reverse().map(x=>`<div class="mv">${new Date(x.d).toLocaleString('th-TH')} • ${esc(x.t)} ${esc(x.note)}</div>`).join('')}`;
}
function reserve(id){const a=A(id);if(a.status=='res'){a.status='in';mv(id,'ยกเลิกการจอง')}else{const w=prompt('จองให้ใคร? (ไม่ใส่ก็ได้)');if(w===null)return;a.status='res';mv(id,'จอง',w)}save();render()}
function unsell(id){if(!confirm('ยกเลิกการขาย คืนเป็นมีในสต็อก?'))return;const a=A(id);db.sales=db.sales.filter(s=>s.aid!=id);a.status='in';a.soldDate='';mv(id,'ยกเลิกการขาย');save();render()}
function delA(id){if(!confirm('ลบพระองค์นี้ถาวร?'))return;db.amulets=db.amulets.filter(a=>a.id!=id);db.sales=db.sales.filter(s=>s.aid!=id);db.moves=db.moves.filter(x=>x.aid!=id);save();go('stock')}
/* ---------- sell ---------- */
function sell(){
  const a=A(arg);
  return `<h2>ขาย: ${title(a)}</h2><div class="k">${esc(a.sku)} • ต้นทุนรวม ${n(cost(a))}</div><div class="card">
  ${inp('s_price','ราคาขายจริง',a.price,1)}${inp('s_ship','ค่าส่ง',0,1)}${inp('s_oth','ค่าใช้จ่ายเพิ่มเติม',0,1)}${inp('s_date','วันที่ขาย',today())}
  ${inp('s_cust','ชื่อลูกค้า','')}${inp('s_phone','เบอร์โทร / LINE','')}
  <label>ช่องทางการขาย<select id="s_ch"><option>หน้าร้าน</option><option>LINE</option><option>Facebook</option><option>อื่นๆ</option></select></label>${inp('s_note','หมายเหตุ','')}
  <div class="v g" id="pp" style="margin-top:8px"></div></div>
  <div class="btns"><button onclick="go('detail','${a.id}')">ยกเลิก</button><button class="p" onclick="doSell('${a.id}')">บันทึกการขาย</button></div>
  `+(setTimeout(()=>{['s_price','s_ship','s_oth'].forEach(i=>$('#'+i).oninput=pp);pp()}),'');
}
const sv=()=>[+$('#s_price').value||0,+$('#s_ship').value||0,+$('#s_oth').value||0];
function pp(){const a=A(arg),[p,s,o]=sv();$('#pp').textContent='กำไรจริง '+n(p-cost(a)-s-o)+' บาท'}
function doSell(id){
  const a=A(id),[p,s,o]=sv();if(!(p>0))return alert('กรอกราคาขายจริง');
  const cu=$('#s_cust').value.trim();
  if(cu&&!db.customers.some(c=>c.name==cu))db.customers.push({id:uid(),name:cu,phone:$('#s_phone').value,line:'',addr:'',note:''});
  db.sales.push({id:uid(),aid:id,date:$('#s_date').value,price:p,ship:s,other:o,cust:cu,ch:$('#s_ch').value,profit:p-cost(a)-s-o,note:$('#s_note').value});
  a.status='sold';a.soldDate=$('#s_date').value;mv(id,'ขายแล้ว',n(p)+' บาท');save();toast('บันทึกการขายแล้ว');go('detail',id)}
/* ---------- report ---------- */
function report(){
  const S=db.sales,by={};S.forEach(s=>{const m=(M(A(s.aid)?.mid)||{});const k=m.name+' '+(m.gen||'');by[k]=(by[k]||0)+1});
  const best=Object.entries(by).sort((a,b)=>b[1]-a[1])[0],now=Date.now();
  const old=db.amulets.filter(a=>a.status=='in'&&(now-new Date(a.inDate))/864e5>=30);
  const st=db.amulets.filter(a=>a.status!='sold');
  return `<h2>รายงาน</h2><div class="grid"><div class="card"><div class="k">ยอดขาย</div><div class="v">${n(S.reduce((t,s)=>t+s.price,0))}</div></div>
  <div class="card"><div class="k">กำไร</div><div class="v g">${n(S.reduce((t,s)=>t+s.profit,0))}</div></div>
  <div class="card"><div class="k">ขายไปแล้ว (องค์)</div><div class="v">${S.length}</div></div>
  <div class="card"><div class="k">มูลค่าสต็อก (ต้นทุน)</div><div class="v">${n(st.reduce((t,a)=>t+cost(a),0))}</div></div></div>
  <div class="card"><div class="k">รุ่นที่ขายดีที่สุด</div><b>${best?esc(best[0])+' ('+best[1]+' องค์)':'-'}</b></div>
  <h3>พระค้างสต็อก 30 วันขึ้นไป (${old.length})</h3>${old.map(a=>`<div class="row" onclick="go('detail','${a.id}')"><div class="t"><b>${title(a)}</b><span>${esc(a.sku)} • เข้า ${esc(a.inDate)}</span></div></div>`).join('')||'<div class="note">ไม่มี</div>'}`;
}
/* ---------- settings / backup ---------- */
function set(){
  const s=db.set;
  return `<h2>ตั้งค่า</h2><div class="card">${inp('st_shop','ชื่อร้าน',s.shop)}${inp('st_pre','รูปแบบรหัสสินค้า (นำหน้า)',s.prefix)}<div class="k">ตัวอย่าง: ${esc(s.prefix)}${String(db.seq+1).padStart(6,'0')}</div>
  <div style="max-width:100px;margin-top:8px">${photo('logo','','โลโก้',s.logo)}</div><button class="p f" style="margin-top:10px" onclick="saveSet()">บันทึกการตั้งค่า</button></div>
  <h3>รหัสผ่านเข้าแอป</h3><div class="card"><div class="k">${s.pin?'เปิดใช้งานอยู่ (ล็อกอัตโนมัติเมื่อออกจากแอปเกิน 5 นาที)':'ยังไม่ได้ตั้งรหัส'}</div><button class="p f" style="margin-top:8px" onclick="setPin()">${s.pin?'เปลี่ยนรหัส':'ตั้งรหัส'}</button>${s.pin?'<button class="d f" style="margin-top:8px" onclick="rmPin()">ปิดรหัส</button>':''}</div>
  <div class="note">ลืมรหัสแล้วกู้ไม่ได้ ต้องล้างข้อมูลเบราว์เซอร์ ซึ่งข้อมูลจะหายหมด จึงควร Export สำรองไว้ รหัสนี้กันคนเปิดดูทั่วไป ไม่ได้เข้ารหัสข้อมูลในเครื่อง</div>
  <h3>สำรองข้อมูล</h3><div class="note">ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้เท่านั้น (ในเบราว์เซอร์) ไม่ได้เก็บบน Cloud หากล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง ข้อมูลจะหาย กรุณา Export สำรองเป็นประจำ</div>
  <div class="btns"><button class="p" onclick="exp_()">Export / Backup</button><label class="btn" style="margin:0">Import<input type="file" accept=".json" hidden onchange="imp(this)"></label></div>`;
}
function saveSet(){const p=$('#st_pre').value.trim();if(!p)return alert('กรอกรูปแบบรหัส');db.set.shop=$('#st_shop').value.trim()||'Amulet tl';db.set.prefix=p;save();toast('บันทึกแล้ว');render()}
function exp_(){const b=new Blob([JSON.stringify(db)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`amulet-backup-${today()}.json`;a.click()}
function imp(i){const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.amulets)||!Array.isArray(d.models))throw 0;
  if(!confirm('นำเข้าจะแทนที่ข้อมูลปัจจุบันทั้งหมด ดำเนินการต่อ?'))return;const pk=db.set.pin;db={...structuredClone(DEF),...d};if(pk)db.set.pin=pk;save();toast('นำเข้าแล้ว');go('home')}catch(e){alert('ไฟล์ไม่ถูกต้อง')}};r.readAsText(f)}
/* ---------- boot ---------- */
load().then(d=>{db=d;locked=!!db.set.pin;render()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
