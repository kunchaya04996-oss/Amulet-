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
  $('#top').innerHTML=(db.set.logo?`<img src="${db.set.logo}">`:'')+`<div><b>AMULET STOCK</b><small>${esc(db.set.shop)} • v8</small></div>`;
  const tabs=[['home','หน้าหลัก'],['stock','สต็อก'],['report','รายงาน'],['set','ตั้งค่า']];
  const cur=({detail:'stock',sell:'stock',model:'home',models:'home',add:'home'})[page]||page;
  $('#nav').innerHTML=tabs.map(([k,l])=>`<a class="${cur==k?'on':''}" onclick="${k=='add'?'newAdd()':`go('${k}')`}">${l}</a>`).join('');
  $('#app').innerHTML=({home,stock,models,model,add,detail,sell,report,set})[page]();
}
function dash(){
  const L=db.amulets,c=s=>L.filter(a=>a.status==s).length,st=L.filter(a=>a.status!='sold');
  const rev=db.sales.reduce((t,s)=>t+s.price,0),pr=db.sales.reduce((t,s)=>t+s.profit,0);
  const box=(k,v,g)=>`<div class="card"><div class="k">${k}</div><div class="v ${g?'g':''}">${v}</div></div>`;
  return `<div class="grid">${box('พระทั้งหมด',L.length)}${box('มีในสต็อก',c('in'))}${box('จอง',c('res'))}${box('ขายแล้ว',c('sold'))}${box('ต้นทุนในสต็อก',n(st.reduce((t,a)=>t+cost(a),0)))}${box('มูลค่าราคาขาย',n(st.reduce((t,a)=>t+(+a.price||0),0)))}${box('กำไรคาดการณ์',n(st.reduce((t,a)=>t+exp(a),0)),1)}${box('ยอดขาย',n(rev))}${box('กำไรจริง',n(pr),1)}</div>`}
function home(){
  const rows=db.models.map(m=>{const L=db.amulets.filter(a=>a.mid==m.id),c=s=>L.filter(a=>a.status==s).length;
  return `<div class="card"><div style="display:flex;gap:10px;align-items:flex-start" onclick="go('model','${m.id}')">${m.img?`<img src="${m.img}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex:none">`:''}
  <div style="flex:1;min-width:0"><b>${esc(m.name)} ${esc(m.gen)}</b><div class="k">${[m.mat,m.type,m.year].filter(Boolean).map(esc).join(' • ')}</div></div>
  <div style="text-align:right"><div class="v g" style="line-height:1">${c('in')}</div><div class="k">องค์ในสต็อก</div></div></div>
  <div style="display:flex;gap:6px;margin:10px 0"><span class="chip sold">จอง ${c('res')}</span><span class="chip sold">ขายแล้ว ${c('sold')}</span><span class="chip sold">รวม ${L.length}</span></div>
  <div class="btns" style="margin:0"><button onclick="newAdd('${m.id}')">+ เพิ่ม</button><button class="p" onclick="sellOne('${m.id}')">ขาย 1 องค์</button></div></div>`}).join('');
  return `<h2>รุ่นพระ</h2>${rows||'<div class="note">ยังไม่มีรุ่น กด “+ รุ่นใหม่” เพื่อเริ่ม</div>'}<button class="p f" style="margin-top:6px" onclick="newAdd()">+ รุ่นใหม่</button>`}
function sellOne(mid){const a=db.amulets.find(x=>x.mid==mid&&x.status=='in');if(!a)return alert('ไม่มีสต็อกเหลือในรุ่นนี้');go('sell',a.id)}
/* ---------- stock ---------- */
const hay=a=>{const m=M(a.mid)||{};return [m.name,m.gen,m.temple,m.mat,m.type,m.year,a.code,a.no,a.sku].join(' ').toLowerCase()};
function rows(){
  const k=q.trim().toLowerCase(),L=db.amulets.filter(a=>(flt=='all'||a.status==flt)&&(!k||hay(a).includes(k)));
  return L.length?L.map(a=>`<div class="row" onclick="go('detail','${a.id}')">${(a.img.f||(M(a.mid)||{}).img)?`<img src="${a.img.f||M(a.mid).img}">`:'<div class="ph0"></div>'}
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
  <p>${esc(m.desc)}</p><div class="btns"><button class="p" onclick="newAdd('${m.id}')">+ เพิ่มสต็อกในรุ่นนี้</button><button onclick="editM('${m.id}')">แก้ไขรุ่น</button><button class="d" onclick="delM('${m.id}')">ลบรุ่น</button></div>
  <div class="card"><b>เพิ่มสต็อกด่วน</b><div class="k">ใส่จำนวน ระบบสร้างให้เลยโดยคัดลอกข้อมูลจากองค์ล่าสุดของรุ่นนี้ เลขประจำองค์รันต่อให้</div>
  <div class="two">${inp('qa_n','จำนวนองค์',1,1)}${inp('qa_buy','ราคาซื้อ',L.length?L[L.length-1].buy:'',1)}</div>${inp('qa_price','ราคาขาย',L.length?L[L.length-1].price:'',1)}
  <button class="p f" style="margin-top:8px" onclick="quickAdd('${m.id}')">เพิ่มสต็อก</button></div>
  ${L.map(a=>`<div class="row" onclick="go('detail','${a.id}')"><div class="t"><b>เลข ${esc(a.no)||'-'} • ${esc(a.code)||'-'}</b><span>${esc(a.sku)} • ต้นทุน ${n(cost(a))}</span></div>${chip(a.status)}</div>`).join('')}`;
}
function quickAdd(mid){
  const n=Math.floor(+$('#qa_n').value);if(!(n>=1&&n<=100))return alert('ใส่จำนวน 1-100');
  const b=$('#qa_buy').value,p=$('#qa_price').value;if((b!==''&&!(+b>=0))||(p!==''&&!(+p>=0)))return alert('ราคาต้องเป็นตัวเลข');
  if(!confirm(`เพิ่มสต็อก ${n} องค์?`))return;
  const L=db.amulets.filter(a=>a.mid==mid),l=L[L.length-1]||newItem();let no=l.no||'';
  for(let i=0;i<n;i++){no=inc(no);while(no&&db.amulets.some(x=>x.mid==mid&&x.no==no))no=inc(no);
    const a={...newItem(),id:uid(),mid,sku:nextCode(),status:'in',inDate:today(),soldDate:'',no,buy:b,price:p,frame:l.frame||'',ship:l.ship||'',other:l.other||'',min:l.min||'',cond:l.cond||''};
    db.amulets.push(a);mv(a.id,'ซื้อเข้า');mv(a.id,'เข้าสต็อก')}
  save();toast(`เพิ่ม ${n} องค์แล้ว`);render()}
function delM(id){if(db.amulets.some(a=>a.mid==id))return alert('ลบไม่ได้ ยังมีพระในรุ่นนี้ ลบพระทุกองค์ก่อน');
  if(confirm('ลบรุ่นนี้?')){db.models=db.models.filter(m=>m.id!=id);save();go('models')}}
/* ---------- add / edit form ---------- */
const newItem=()=>({sku:'',no:'',code:'',buy:'',frame:'',ship:'',other:'',price:'',min:'',cond:'',note:'',img:{}});
const inc=s=>/\d+$/.test(s||'')?s.replace(/\d+$/,m=>String(+m+1).padStart(m.length,'0')):'';
const CP=['buy','frame','ship','other','price','min','cond'];
function newAdd(mid=''){draft={mode:'add',mid,m:{},items:[newItem()],each:false,cnt:1,more:false};
  if(mid){const L=db.amulets.filter(a=>a.mid==mid),l=L[L.length-1];if(l){CP.forEach(k=>draft.items[0][k]=l[k]);draft.items[0].no=inc(l.no)}}go('add')}
function editA(id){const a=A(id);draft={mode:'editA',aid:id,mid:a.mid,m:{},items:[structuredClone(a)],multi:false};go('add')}
function editM(id){draft={mode:'editM',mid:id,m:structuredClone(M(id)),items:[]};go('add')}
const MF=[['name','ชื่อพระ'],['gen','รุ่น'],['temple','วัด / สำนัก'],['prov','จังหวัด'],['mat','เนื้อ'],['type','พิมพ์'],['year','ปีจัดสร้าง'],['desc','รายละเอียด'],['note','หมายเหตุ']];
const IF=[['no','เลขประจำองค์'],['code','โค้ด'],['buy','ราคาซื้อ'],['frame','ค่ากรอบ'],['ship','ค่าส่ง'],['other','ค่าใช้จ่ายอื่น'],['price','ราคาขาย'],['min','ราคาต่ำสุด']];
const inp=(id,l,v,num)=>`<label>${l}<input id="${id}" value="${esc(v)}" ${num?'inputmode="decimal"':''}></label>`;
function sync(){if(page!='add'||!draft)return;
  if($('#m_name')||draft.mode=='editM')MF.forEach(([k])=>{const e=$('#m_'+k);if(e)draft.m[k]=e.value});
  const e=$('#cnt');if(e)draft.cnt=Math.max(1,Math.min(100,Math.floor(+e.value)||1));
  draft.items.forEach((it,i)=>{[...IF.map(x=>x[0]),'cond','note'].forEach(k=>{const e=$(`#i${i}_${k}`);if(e)it[k]=e.value})})}
function photo(i,k,l,u){return `<label class="ph">${u?`<img src="${u}">`:`<span>${l}</span>`}<input type="file" accept="image/*" hidden onchange="pick(this,'${i}','${k}')"></label>`}
function readImg(f,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};im.src=r.result};r.readAsDataURL(f)}
function pick(inp,i,k){const f=inp.files[0];if(!f)return;readImg(f,u=>{if(i=='logo'){db.set.logo=u;save()}else if(i=='det'){A(arg).img[k]=u;save()}else{sync();if(i=='m')draft.m.img=u;else draft.items[i].img[k]=u}render()})}
const XI=[['frame','ค่ากรอบ',1],['ship','ค่าส่ง',1],['other','ค่าใช้จ่ายอื่น',1],['min','ราคาต่ำสุด',1],['cond','สภาพพระ'],['note','หมายเหตุ']];
function add(){
  const d=draft,m=d.mode,isNew=m=='add'&&!d.mid,sh=m=='add'&&!d.each,mo=M(d.mid)||{},it=d.items[0]||{};
  let h=`<h2>${m=='editA'?'แก้ไขพระ':m=='editM'?'แก้ไขรุ่น':isNew?'รุ่นใหม่':'เพิ่มสต็อก: '+esc(mo.name)+' '+esc(mo.gen)}</h2>`;
  if(m=='editM')h+=`<div class="card">${MF.map(([k,l])=>inp('m_'+k,l,d.m[k]||'')).join('')}<div style="max-width:140px;margin-top:8px">${photo('m','','รูปพระ',d.m.img)}</div></div>`;
  if(isNew)h+=`${inp('m_name','ชื่อพระและรุ่น',d.m.name||'')}<div class="two">${inp('m_mat','เนื้อ',d.m.mat||'')}${inp('m_type','พิมพ์',d.m.type||'')}</div>`;
  if(m=='add'){const cnt=`<label>จำนวนองค์<input id="cnt" type="number" inputmode="numeric" min="1" max="100" value="${d.each?d.items.length:d.cnt}" onchange="sync();d_cnt()"></label>`;
    h+=isNew?`<div class="two">${inp('m_year','ปี',d.m.year||'')}${cnt}</div>`:`${cnt}<div class="k">ตอนนี้รุ่นนี้มี ${db.amulets.filter(a=>a.mid==d.mid).length} องค์ (จำนวนนี้คือที่จะเพิ่มใหม่)</div>`}
  if(sh){h+=`<div class="two">${inp('i0_buy','ราคาซื้อ (ต่อองค์)',it.buy,1)}${inp('i0_price','ราคาขาย',it.price,1)}</div>`;
    if(isNew)h+=`<div style="max-width:150px;margin:8px 0">${photo('m','','+ เพิ่มรูปพระ',d.m.img)}</div><div class="k">รูปนี้ใช้กับทุกองค์ ใส่รูปแยกแต่ละองค์ได้ทีหลัง</div>`;
    h+=`<button class="f" style="margin-top:10px" onclick="sync();draft.more=!draft.more;render()">รายละเอียดเพิ่มเติม ${d.more?'▴':'▾'}</button>`;
    if(d.more){h+=`<div class="card">`;if(isNew)h+=[['temple','วัด / สำนัก'],['prov','จังหวัด'],['desc','รายละเอียด'],['note','หมายเหตุรุ่น']].map(([k,l])=>inp('m_'+k,l,d.m[k]||'')).join('');
      h+=XI.map(([k,l,n])=>inp('i0_'+k,l,it[k],n)).join('')+`<button class="f" style="margin-top:8px" onclick="sync();toggleEach()">กรอกรายองค์ (เลขประจำองค์ / โค้ด / รูปแต่ละองค์)</button></div>`}}
  if(!sh&&m!='editM'){h+=d.items.map((it,i)=>`<div class="card"><b>องค์ที่ ${i+1}</b>${m=='editA'?` <span class="k">${esc(it.sku)}</span>`:''}
   <div class="two">${IF.map(([k,l])=>`<div>${inp(`i${i}_${k}`,l,it[k],!['no','code'].includes(k))}</div>`).join('')}</div>${inp(`i${i}_cond`,'สภาพพระ',it.cond)}${inp(`i${i}_note`,'หมายเหตุ',it.note)}
   <div class="photos">${[['f','หน้า'],['b','หลัง'],['s','ข้าง'],['d','ตำหนิ']].map(([k,l])=>photo(i,k,l,it.img[k])).join('')}</div>
   ${m=='add'&&d.items.length>1?`<button class="d f" style="margin-top:8px" onclick="sync();draft.items.splice(${i},1);render()">ลบองค์นี้</button>`:''}</div>`).join('');
   if(m=='add')h+=`<button class="f" onclick="sync();draft.items.push(newItem());render()">+ เพิ่มองค์</button><button class="f" style="margin-top:8px" onclick="sync();toggleEach()">กลับไปกรอกแบบรวม</button>`}
  return h+`<div class="btns"><button onclick="go('home')">ยกเลิก</button><button class="p" onclick="saveForm()">บันทึก${sh&&d.cnt>1?' '+d.cnt+' องค์':''}</button></div>`;
}
function d_cnt(){if(draft.each)setCnt();else render()}
function toggleEach(){draft.each=!draft.each;if(draft.each)setCnt();else{draft.items=[draft.items[0]];render()}}
function setCnt(){const c=Math.max(1,Math.min(100,draft.cnt||1));while(draft.items.length<c){const p=draft.items.at(-1),it=newItem();CP.forEach(k=>it[k]=draft.items[0][k]);it.no=inc(p.no);draft.items.push(it)}draft.items.length=c;render()}
function saveForm(){
  sync();const d=draft;
  if(d.mode=='editM'){if(!d.m.name?.trim())return alert('กรอกชื่อพระ');Object.assign(M(d.mid),d.m);save();toast('บันทึกแล้ว');return go('model',d.mid)}
  const mid=d.mid||uid();
  const list=(d.mode=='add'&&!d.each&&d.cnt>1)?Array.from({length:d.cnt},()=>({...structuredClone(d.items[0]),no:'',code:'',img:{}})):d.items;
  if(!d.mid&&!d.m.name?.trim())return alert('กรอกชื่อพระ');
  const seenN=new Set(),seenC=new Set();
  for(const[i,it]of list.entries()){
    for(const k of['buy','frame','ship','other','price','min'])if(it[k]!==''&&!(+it[k]>=0))return alert(`องค์ที่ ${i+1}: ${k} ต้องเป็นตัวเลขไม่ติดลบ`);
    const others=db.amulets.filter(a=>a.mid==mid&&a.id!=it.id&&a.id!=d.aid);
    const no=it.no.trim(),code=it.code.trim();
    if(no&&(seenN.has(no)||others.some(a=>a.no==no)))return alert(`องค์ที่ ${i+1}: เลขประจำองค์ ${no} ซ้ำในรุ่นเดียวกัน`);
    if(code&&(seenC.has(code)||others.some(a=>a.code==code)))return alert(`องค์ที่ ${i+1}: โค้ด ${code} ซ้ำในรุ่นเดียวกัน`);
    seenN.add(no);seenC.add(code)}
  if(d.mode=='editA'){const a=A(d.aid),it=d.items[0];['no','code','buy','frame','ship','other','price','min','cond','note','img'].forEach(k=>a[k]=it[k]);mv(a.id,'แก้ไขข้อมูล');save();toast('บันทึกแล้ว');return go('detail',a.id)}
  if(!d.mid)db.models.push({id:mid,...d.m});
  const made=list.map(it=>{const a={...it,id:uid(),mid,sku:nextCode(),status:'in',inDate:today(),soldDate:''};db.amulets.push(a);mv(a.id,'ซื้อเข้า');mv(a.id,'เข้าสต็อก');return a.sku});
  save();toast(`เพิ่ม ${made.length} องค์ (${made[0]}${made.length>1?' ถึง '+made.at(-1):''})`);go('home')}
/* ---------- detail ---------- */
function detail(){
  const a=A(arg),m=M(a.mid)||{},s=sale(a);
  const info=[['รหัสสินค้า',a.sku],['รุ่น',m.name+' '+(m.gen||'')],['เนื้อ',m.mat],['พิมพ์',m.type],['ปี',m.year],['เลขประจำองค์',a.no],['โค้ด',a.code],['สภาพ',a.cond],['ต้นทุนรวม',n(cost(a))],['ราคาขาย',n(a.price)],['ราคาต่ำสุด',n(a.min)],[s?'กำไรจริง':'กำไรคาดการณ์',n(s?s.profit:exp(a))],['เข้าสต็อก',a.inDate],['หมายเหตุ',a.note]];
  return `<h2>${title(a)} ${chip(a.status)}</h2><div class="photos">${[['f','หน้า'],['b','หลัง'],['s','ข้าง'],['d','ตำหนิ']].map(([k,l])=>{const im=a.img[k]||(k=='f'?m.img:'');return `<label class="ph">${im?`<img src="${im}">`:`<span>+ ${l}</span>`}<input type="file" accept="image/*" hidden onchange="pick(this,'det','${k}')"></label>`}).join('')}</div><div class="k" style="margin-top:4px">แตะช่องรูปเพื่อเพิ่มหรือเปลี่ยนรูป</div>
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
  const a=A(arg);setTimeout(()=>{['s_price','s_ship','s_oth'].forEach(i=>$('#'+i).oninput=pp);pp()});
  return `<h2>ขาย ${title(a)}</h2><div class="k">${esc(a.sku)} • ต้นทุน ${n(cost(a))} บาท</div><div class="card">
  ${inp('s_price','ราคาขายจริง',a.price,1)}<div class="two">${inp('s_ship','ค่าส่ง',0,1)}${inp('s_oth','ค่าใช้จ่ายอื่น',0,1)}</div>
  <div class="card" style="text-align:center;margin:8px 0 0"><div class="k">กำไร</div><div class="v g" id="pp"></div></div>${inp('s_cust','ลูกค้า (ไม่ใส่ก็ได้)','')}
  <input type="hidden" id="s_date" value="${today()}"><input type="hidden" id="s_phone"><input type="hidden" id="s_ch" value="หน้าร้าน"><input type="hidden" id="s_note"></div>
  <div class="btns"><button onclick="go('detail','${a.id}')">ยกเลิก</button><button class="p" onclick="doSell('${a.id}')">บันทึกการขาย</button></div>`}
const sv=()=>[+$('#s_price').value||0,+$('#s_ship').value||0,+$('#s_oth').value||0];
function pp(){const a=A(arg),[p,s,o]=sv();const g=p-cost(a)-s-o;$('#pp').textContent=(g>0?'+':'')+n(g)+' บาท'}
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
  return `<h2>รายงาน</h2>${dash()}<div class="grid" style="margin-top:10px"><div class="card"><div class="k">ยอดขาย</div><div class="v">${n(S.reduce((t,s)=>t+s.price,0))}</div></div>
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
