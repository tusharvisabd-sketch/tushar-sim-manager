
/* TV-LAYER: 11-digit rule + English/Bangla. Does not modify saved data or the backup/restore code. */
(function(){
  const $=id=>document.getElementById(id);
  let lang='en'; try{ if(localStorage.getItem('simManagerLang_v1')==='bn') lang='bn'; }catch(e){}
  const bn2en=s=>String(s||'').replace(/[০-৯]/g,d=>'০১২৩৪৫৬৭৮৯'.indexOf(d));
  const dg=s=>bn2en(s).replace(/\D/g,'');
  // ---------- strict SIM number rule: exactly 11 digits, starts with 0 ----------
  function chk(n){
    const b=lang==='bn';
    if(n.length===11&&n[0]==='0') return '';
    if(n.length===13&&n.startsWith('880')) return b?'দেশের কোড 880 বাদ দিন; নম্বর ০ দিয়ে শুরু হয়ে ১১ ডিজিটের হতে হবে।':'Remove the country code 880 — the number must start with 0 and have 11 digits.';
    if(n.length<11) return b?`ডিজিট কম: ${n.length}টি। সিম নম্বর অবশ্যই ঠিক ১১ ডিজিটের হতে হবে।`:`Too short: ${n.length} digits. A SIM number must be exactly 11 digits.`;
    if(n.length>11) return b?`ডিজিট বেশি: ${n.length}টি। সিম নম্বর অবশ্যই ঠিক ১১ ডিজিটের হতে হবে।`:`Too long: ${n.length} digits. A SIM number must be exactly 11 digits.`;
    return b?'সিম নম্বর অবশ্যই ০ দিয়ে শুরু হতে হবে।':'A SIM number must start with 0.';
  }
  const fNum=$('fNum'), hint=document.createElement('div'); hint.className='numhint'; hint.setAttribute('aria-live','polite'); fNum.insertAdjacentElement('afterend',hint);
  function upd(){ const n=dg(fNum.value); fNum.classList.remove('invalid');
    if(!n){ hint.textContent=''; hint.className='numhint'; return; }
    hint.textContent=n.length+'/11'; hint.className='numhint '+(!chk(n)?'ok':(n.length>11||n[0]!=='0')?'bad':''); }
  fNum.addEventListener('input',upd);
  document.addEventListener('submit',e=>{
    const f=e.target;
    if(f.id==='addForm'){ const m=chk(dg(fNum.value)); if(m){ e.preventDefault(); e.stopImmediatePropagation();
      hint.textContent=m; hint.className='numhint bad'; fNum.classList.add('invalid'); fNum.classList.remove('shake'); void fNum.offsetWidth; fNum.classList.add('shake'); fNum.focus(); } }
    else if(f.id==='editForm'){ const n=dg($('eNum').value); if(n!==origNum){ const m=chk(n); if(m){ e.preventDefault(); e.stopImmediatePropagation(); $('eErr').textContent=m; } } }
  },true);
  let origNum='';
  new MutationObserver(()=>{ if(!$('editOv').hidden) origNum=dg($('eNum').value); }).observe($('editOv'),{attributes:true,attributeFilter:['hidden']});
  const bulk=$('bulk'), be=document.createElement('div'); be.className='bulkerr'; bulk.insertAdjacentElement('afterend',be);
  bulk.addEventListener('input',()=>be.textContent='');
  document.addEventListener('click',e=>{
    if(!e.target.closest('#bulkBtn')) return;
    const parts=bn2en(bulk.value).split(/[\s,;]+/).map(dg).filter(Boolean), bad=parts.filter(p=>chk(p));
    if(!bad.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const b=lang==='bn';
    be.textContent=(b?`${bad.length}টি নম্বর ১১ ডিজিটের সঠিক নম্বর নয় — কিছুই যোগ হয়নি। আগে ঠিক করুন:`:`${bad.length} number(s) are not valid 11-digit numbers — nothing was added. Fix these first:`)
      +' '+bad.slice(0,6).map(x=>`${x} (${x.length})`).join(', ')+(bad.length>6?' …':'');
    be.classList.remove('shake'); void be.offsetWidth; be.classList.add('shake');
  },true);
  // flag old saved numbers that break the rule (view only, never edits data)
  const tb=$('tbody');
  const flag=()=>tb.querySelectorAll('tr[data-id] td.num').forEach(td=>{ const m=chk(dg(td.textContent)); td.classList.toggle('badnum',!!m); if(m) td.title=m; });
  flag(); new MutationObserver(flag).observe(tb,{childList:true});

  // ---------- language ----------
  const D={'TUSHAR VISA SIM Management System':'TUSHAR VISA সিম ম্যানেজমেন্ট সিস্টেম','🏠 Home':'🏠 হোম','Total SIMs':'মোট সিম','Tourist':'ট্যুরিস্ট','Medical':'মেডিকেল','Other':'অন্যান্য','Given':'প্রদত্ত','Wanted':'খোঁজা','Incomplete':'অসম্পূর্ণ','Unknown':'অজানা',
  'Search number, last digits, name or ID':'নম্বরের শেষের ডিজিট, নাম বা আইডি লিখুন','Type last digits, or search a series: 013 · 014 · 015 · 016 · 017 · 018 · 019':'শেষের ডিজিট লিখুন, অথবা সিরিজ দিয়ে খুঁজুন: ০১৩ · ০১৪ · ০১৫ · ০১৬ · ০১৭ · ০১৮ · ০১৯','11 digits · exact full-number match':'১১ ডিজিট · সম্পূর্ণ নম্বর মিলিয়ে খোঁজা হচ্ছে','Matching the last 2 digits':'শেষের ২ ডিজিট মিলিয়ে খোঁজা হচ্ছে','Search SIMs':'সিম খুঁজুন','Add New SIM':'নতুন সিম যোগ','Wanted List':'খোঁজার তালিকা','Filters and tools':'ফিল্টার ও টুলস','Reset filters':'ফিল্টার রিসেট','Bulk Add':'একসাথে যোগ','One number per line':'প্রতি লাইনে একটি নম্বর','Type for all':'সবার ধরন','Add all':'সব যোগ করুন','SIM list':'সিম তালিকা','Number / ID / Name':'নম্বর / আইডি / নাম','Search':'খুঁজুন','Search mode':'খোঁজার ধরন','Ends with':'শেষে মিলবে','Contains':'যেকোনো জায়গায়','Status':'অবস্থা','All':'সব','In stock (not given)':'স্টকে আছে (দেওয়া হয়নি)','Incomplete (no name / type)':'অসম্পূর্ণ (নাম/ধরন নেই)','Sort':'সাজান','Newest first':'নতুন আগে','By ID (1, 2, 3…)':'আইডি অনুযায়ী','↺ Reset':'↺ রিসেট',
  'New SIM':'নতুন সিম','SIM number *':'সিম নম্বর *','Client name':'ক্লায়েন্টের নাম','Home / District':'বাড়ি / জেলা','Type':'ধরন','Add':'যোগ করুন','Keep type':'ধরন ধরে রাখুন','Bulk add':'একসাথে অনেক যোগ','One number per line':'প্রতি লাইনে একটি নম্বর','Type for all':'সবার জন্য ধরন','Add all':'সব যোগ করুন','Show the “note this ID” box after each SIM':'প্রতিটি সিমের পর “আইডি লিখে রাখুন” বক্স দেখান',
  '🔎 Wanted SIMs':'🔎 খোঁজা সিম','— a customer gave you an old number to find. If that SIM is ever added, you get an alert.':'— কাস্টমার একটি পুরোনো নম্বর খুঁজতে দিয়েছেন। সেই সিম যোগ হলেই আপনি অ্যালার্ট পাবেন।','Number to find * (full, or last 4+ digits)':'খোঁজার নম্বর * (পুরো, বা শেষ ৪+ ডিজিট)','Customer name':'কাস্টমারের নাম','Phone / contact':'ফোন / যোগাযোগ','Note':'নোট','Add to Wanted':'খোঁজা তালিকায় যোগ','Cancel edit':'এডিট বাতিল','Still looking':'এখনো খুঁজছি','Found':'পাওয়া গেছে','Closed':'বন্ধ হয়েছে','🔄 Check my whole list now':'🔄 পুরো তালিকা এখনই মেলান',
  'SIM List':'সিম তালিকা','🔍 Check typos':'🔍 টাইপো যাচাই','🖨 Print this list':'🖨 তালিকা প্রিন্ট','Serial':'সিরিয়াল','Type ID':'ধরন আইডি','SIM number':'সিম নম্বর','Name':'নাম','Actions':'অ্যাকশন','No SIMs found.':'কোনো সিম পাওয়া যায়নি।',
  'Backup':'ব্যাকআপ','List':'তালিকা','Download backup':'ব্যাকআপ ডাউনলোড','Download CSV':'CSV ডাউনলোড','Restore':'রিস্টোর','Auto-backup':'অটো-ব্যাকআপ','Auto-backup on':'অটো-ব্যাকআপ চালু','Never':'কখনো নয়',
  'Edit SIM':'সিম এডিট','Handed over to client (Given)':'ক্লায়েন্টকে দেওয়া হয়েছে','Delete':'মুছুন','Cancel':'বাতিল','Save':'সংরক্ষণ','Edit':'এডিট','Close':'বন্ধ করুন','✔ Given':'✔ প্রদত্ত','No type ID':'ধরন আইডি নেই',
  'SIM saved':'সিম সংরক্ষিত','SERIAL NO.':'সিরিয়াল নং','I have noted this ID':'আইডি লিখে রেখেছি','I have noted these IDs':'আইডিগুলো লিখে রেখেছি','Noted!':'লেখা হয়েছে!','OK, got it':'ঠিক আছে','This number already exists':'এই নম্বর আগে থেকেই আছে','Show in list':'তালিকায় দেখান','Edit this SIM':'এই সিম এডিট করুন','Write this number on the box where you keep this SIM.':'এই নম্বরটি সিমের বাক্সে লিখে রাখুন।','It will make finding it later easy.':'পরে খুঁজে পেতে সুবিধা হবে।',
  'No SIMs yet.':'এখনো কোনো সিম নেই।','↺ Show all SIMs':'↺ সব সিম দেখান','No SIMs match the current search / filters.':'বর্তমান সার্চ/ফিল্টারে কোনো সিম মেলেনি।',
  '🔔 Someone was looking for this SIM':'🔔 কেউ এই সিমটি খুঁজছিলেন','Exact match':'হুবহু মিল','Same last digits':'শেষের ডিজিট মিলেছে','Similar — possible typo':'কাছাকাছি — টাইপো হতে পারে','✔ Yes, this is it':'✔ হ্যাঁ, এটাই','✖ Not it':'✖ এটা না','✔ This is it':'✔ এটাই','🔎 In your Wanted list':'🔎 আপনার খোঁজা তালিকায়','⚠ Similar numbers — possible typo':'⚠ কাছাকাছি নম্বর — টাইপো হতে পারে','Open in Wanted':'খোঁজা তালিকায় খুলুন','Show SIM':'সিম দেখান','Re-open':'আবার খুলুন',
  'Backup downloaded':'ব্যাকআপ ডাউনলোড হয়েছে','Changes saved':'পরিবর্তন সংরক্ষিত','Number changed':'নম্বর বদলেছে','Invalid backup file':'ব্যাকআপ ফাইলটি সঠিক নয়','Auto-backup enabled':'অটো-ব্যাকআপ চালু হয়েছে','Deleted':'মুছে ফেলা হয়েছে','Enter a valid number':'সঠিক নম্বর দিন','No numbers found':'কোনো নম্বর পাওয়া যায়নি','Undo':'ফেরান','Enter at least 4 digits':'কমপক্ষে ৪ ডিজিট দিন','Wanted updated':'খোঁজা তালিকা আপডেট হয়েছে','Clear search and all filters':'সার্চ ও সব ফিল্টার মুছুন'};
  const P=[[/^Matching the last (\d+) digits$/,m=>'শেষের '+m[1]+' ডিজিট মিলিয়ে খোঁজা হচ্ছে'],[/^(.+) series · begins with (.+)$/,m=>m[1]+' সিরিজ · '+m[2]+' দিয়ে শুরু'],[/^Added — (.+)$/,m=>'যোগ হয়েছে — '+m[1]],[/^(\d+) added$/,m=>m[1]+'টি যোগ হয়েছে'],[/^(\d+) already existed$/,m=>m[1]+'টি আগে থেকেই ছিল'],
   [/^(\d+) results \(of (\d+)\)$/,m=>m[2]+'টির মধ্যে '+m[1]+'টি ফলাফল'],[/^(\d+) similar$/,m=>m[1]+'টি কাছাকাছি'],[/^(\d+) still looking$/,m=>m[1]+'টি খোঁজা চলছে'],[/^(\d+) found$/,m=>m[1]+'টি পাওয়া গেছে'],
   [/^(\d+)\/(\d+) digits match$/,m=>m[2]+' ডিজিটের '+m[1]+'টি মিলেছে'],[/^Last backup: (.+)$/,m=>'শেষ ব্যাকআপ: '+m[1]],[/^Deleted (.+)$/,m=>'মুছে ফেলা হয়েছে '+m[1]],[/^Restored (\S+)$/,m=>'ফিরিয়ে আনা হয়েছে '+m[1]],
   [/^Restored: (\d+) new, (\d+) updated/,m=>'রিস্টোর: '+m[1]+'টি নতুন, '+m[2]+'টি আপডেট'],[/^(.+) marked as GIVEN$/,m=>m[1]+' প্রদত্ত হিসেবে চিহ্নিত'],[/^(.+) back in stock$/,m=>m[1]+' আবার স্টকে'],
   [/^asked (.+)$/,m=>'অনুরোধ: '+m[1]],[/^(\d+) SIMs? saved$/,m=>m[1]+'টি সিম সংরক্ষিত'],[/^Delete (.+)\?$/s,m=>m[1]+' — মুছে ফেলবেন?'],[/^ID: (.+)$/,m=>'আইডি: '+m[1]],[/^🔎 Wanted$/,()=>'🔎 খোঁজা'],
   [/^Mark as given$/,()=>'প্রদত্ত হিসেবে চিহ্নিত করুন'],[/^Mark as NOT given$/,()=>'প্রদত্ত চিহ্ন তুলুন']];
  function tseg(s){ const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s), c=m[2]; if(!c) return s; let r=D[c]; if(r!==undefined) return m[1]+r+m[3];
    for(const [re,fn] of P){ const x=re.exec(c); if(x) return m[1]+fn(x)+m[3]; } return s; }
  function tr(s){ if(!/[A-Za-z]/.test(s)) return s; let r=tseg(s); if(r!==s) return r;
    if(s.includes(' • ')){ let ch=false; const o=s.split(' • ').map(p=>{const q=tseg(p); if(q!==p) ch=true; return q;}); if(ch) return o.join(' • '); } return s; }
  const ATT=['placeholder','title','aria-label'];
  function doText(n){ if(n._bn===n.nodeValue) return; const t=tr(n.nodeValue); if(t!==n.nodeValue){ n._en=n.nodeValue; n._bn=t; n.nodeValue=t; } }
  function doAttr(el){ const a=el._a||(el._a={}); ATT.forEach(k=>{ const v=el.getAttribute(k); if(v==null) return; if(a[k]&&a[k][1]===v) return; const t=tr(v); if(t!==v){ a[k]=[v,t]; el.setAttribute(k,t); } }); }
  function walk(root){ if(lang!=='bn'||!root) return;
    if(root.nodeType===3){ if(root.parentElement&&!/^(SCRIPT|STYLE|TEXTAREA)$/.test(root.parentElement.tagName)) doText(root); return; }
    if(root.nodeType!==1) return;
    const w=document.createTreeWalker(root,4,{acceptNode:n=>{const p=n.parentElement; if(!p||/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)) return 2; const r=p.closest('tr[data-id]'); return (r&&!p.closest('td:nth-child(7)'))?2:1;}});
    const L=[]; let n; while((n=w.nextNode())) L.push(n); L.forEach(doText);
    if(!(root.closest&&root.closest('tr[data-id]'))||true){ if(root.matches&&root.matches('[placeholder],[title],[aria-label]')) doAttr(root); root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(doAttr); } }
  function toEn(){ const w=document.createTreeWalker(document.body,4); let n; while((n=w.nextNode())) if(n._en!==undefined&&n.nodeValue===n._bn){ n.nodeValue=n._en; n._bn=undefined; }
    document.querySelectorAll('*').forEach(el=>{ if(el._a){ for(const k in el._a) if(el.getAttribute(k)===el._a[k][1]) el.setAttribute(k,el._a[k][0]); el._a=null; } }); }
  new MutationObserver(ms=>{ if(lang!=='bn') return; ms.forEach(m=>{ if(m.type==='childList') m.addedNodes.forEach(walk); else if(m.type==='characterData') doText(m.target); else doAttr(m.target); }); })
    .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATT});
  const oc=window.confirm; window.confirm=m=>oc.call(window,lang==='bn'?tr(String(m)):m);
  // switch UI
  const sw=document.createElement('div'); sw.className='lang'; sw.setAttribute('role','group'); sw.setAttribute('aria-label','Language');
  sw.innerHTML='<button type="button" data-l="en">EN</button><button type="button" data-l="bn">বাংলা</button>';
  document.querySelector('#langSlot').appendChild(sw);
  function setLang(l){ lang=l; try{localStorage.setItem('simManagerLang_v1',l);}catch(e){}
    document.documentElement.lang=l; document.body.classList.toggle('bn',l==='bn');
    sw.querySelectorAll('button').forEach(b=>{ b.classList.toggle('on',b.dataset.l===l); b.setAttribute('aria-pressed',b.dataset.l===l); });
    if(l==='bn') walk(document.body); else toEn();
    document.title=l==='bn'?D['TUSHAR VISA SIM Management System']:'TUSHAR VISA SIM Management System'; upd(); }
  sw.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b&&b.dataset.l!==lang) setLang(b.dataset.l); });
  setLang(lang);
})();
