
(function(){
  let KEY = 'simManagerData_v1';
  let META = 'simManagerMeta_v1';
  let sims = [];
  let wanted = [];
  let WKEY = 'simManagerWanted_v1';
  let meta = {lastBackup:null, counters:{T:0,M:0,O:0}};
  let fileHandle = null;

  const $ = id => document.getElementById(id);
  const PL = {tourist:'Tourist', medical:'Medical', other:'Other', '':''};
  const PREFIX = {tourist:'T', medical:'M', other:'O'};

  // ---------- আইডি ----------
  // আইডি একবার দিলে কখনো আবার অন্য সিমকে দেওয়া হয় না (মুছে ফেললেও), তাই ডুপ্লিকেট হওয়ার সুযোগ নেই
  function pidTaken(p, except){ return sims.some(x => x !== except && x.pid === p); }
  function assignPid(s){
    const pre = PREFIX[s.purpose];
    if(!pre){ s.pid = ''; return; }
    let n = meta.counters[pre] || 0, p;
    do { n++; p = pre + n; } while(pidTaken(p, s));
    meta.counters[pre] = n; s.pid = p; saveMeta();
  }
  // স্থায়ী নম্বর (S1, S2...): সিম যোগ হওয়ার সাথে সাথে বসে, কখনো বদলায় না
  function assignSid(s){
    let n = meta.counters.S || 0, p;
    do { n++; p = 'S' + n; } while(sims.some(x => x !== s && x.sid === p));
    meta.counters.S = n; s.sid = p; saveMeta();
  }
  function ensureIds(){
    meta.counters = Object.assign({T:0,M:0,O:0,S:0}, meta.counters || {});
    sims.forEach(s=>{
      const m = /^([TMO])(\d+)$/.exec(s.pid || '');
      if(m) meta.counters[m[1]] = Math.max(meta.counters[m[1]], +m[2]);
      const m2 = /^S(\d+)$/.exec(s.sid || '');
      if(m2) meta.counters.S = Math.max(meta.counters.S, +m2[1]);
    });
    let changed = false;
    for(let i=sims.length-1; i>=0; i--){           // পুরোনো এন্ট্রি আগে, তাই নম্বর ক্রমানুসারে হয়
      const s = sims[i];
      if(!s.sid){ assignSid(s); changed = true; }
      if(!s.pid && PREFIX[s.purpose]){ assignPid(s); changed = true; }
    }
    saveMeta();
    if(changed){ try{ localStorage.setItem(KEY, JSON.stringify(sims)); }catch(e){} }
  }

  // ---------- helpers ----------
  const bn2en = s => String(s||'').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
  const digits = s => bn2en(s).replace(/\D/g,'');
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function toast(msg,ms){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),ms||2200)}
  function fmtDate(iso){ if(!iso) return 'Never'; return new Date(iso).toLocaleString('en-GB'); }

  // ---------- storage ----------
  function load(){
    try{ sims = JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ sims=[]; }
    try{ meta = Object.assign(meta, JSON.parse(localStorage.getItem(META)||'{}')); }catch(e){}
    ensureIds();
  }
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(sims)); }
    catch(e){ toast('Could not save! Download a backup.'); }
    writeAuto();
    renderWanted();
    if(window.simCloudLocalChanged) window.simCloudLocalChanged('sims');
  }
  function saveMeta(){ try{localStorage.setItem(META, JSON.stringify(meta));}catch(e){} if(window.simCloudLocalChanged) window.simCloudLocalChanged('meta'); }

  async function writeAuto(){
    if(!fileHandle) return;
    try{
      const w = await fileHandle.createWritable();
      await w.write(JSON.stringify(payload(), null, 2));
      await w.close();
      meta.lastBackup = new Date().toISOString(); saveMeta(); showBackupInfo();
    }catch(e){ fileHandle=null; $('autoBtn').textContent='Auto-backup'; }
  }
  const payload = () => ({app:'sim-manager', version:1, exportedAt:new Date().toISOString(), counters:meta.counters, sims, wanted});

  function showBackupInfo(){
    $('backupInfo').textContent = 'Last backup: ' + fmtDate(meta.lastBackup) + (fileHandle ? ' • Auto-backup on' : '');
  }

  function download(name, text, type){
    const blob = new Blob([text], {type});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 500);
  }
  const stamp = () => { const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };

  // ---------- add ----------
  const pendingNumbers = new Set();
  async function addSim(number, name, home, purpose){
    const n = digits(number);
    if(!n) return {ok:false, msg:'Enter a valid number'};
    const dup = sims.find(s => s.number === n);
    if(dup) return {ok:false, dup:true, msg:'This number already exists'};
    if(pendingNumbers.has(n)) return {ok:false, msg:'This number is already being added. Please wait.'};
    pendingNumbers.add(n);
    const obj = {id:uid(), sid:'', pid:'', number:n, name:(name||'').trim(), home:(home||'').trim(), purpose:purpose||'', note:'', createdAt:new Date().toISOString()};
    try{
      if(window.simCloudAllocateIds){
        const ids = await window.simCloudAllocateIds(obj.purpose);
        obj.sid = ids.sid; obj.pid = ids.pid;
        meta.counters = Object.assign(meta.counters||{}, ids.counters||{});
        saveMeta();
      } else { assignSid(obj); assignPid(obj); }
      sims.unshift(obj);
      return {ok:true, pid:obj.pid, sid:obj.sid};
    }catch(err){ return {ok:false, msg:'Could not reserve a unique ID from Firebase. Check your connection and try again.'}; }
    finally{ pendingNumbers.delete(n); }
  }

  $('addForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const r = await addSim($('fNum').value, $('fName').value, $('fHome').value, $('fPurpose').value);
    if(!r.ok){
      if(r.dup){ const ex = sims.find(x=>x.number===digits($('fNum').value)); resetView(false); $('q').value = ex.number; render(); showDup(ex); }
      else toast(''+r.msg);
      return;
    }
    save();
    closeAddPanel();
    // নাম/বাড়ি/ধরন ধরে রাখি না — শুধু নাম্বার ঘর ফাঁকা করে আবার সেখানেই ফোকাস
    $('fNum').value=''; $('fName').value=''; $('fHome').value='';
    if(!$('keepP').checked){ $('fPurpose').value=''; $('fPurpose').dataset.p=''; }
    $('fNum').focus();
    const nobj = sims[0];
    const near = similarAll(nobj.number, new Set([nobj]));   // হাতে লেখার ভুল ধরতে: প্রায়-একই নাম্বার আগে থেকে আছে কি?
    $('q').value = near.length ? nobj.number : ''; render();
    if(askNoteOn()) showAddedNote(nobj, near);
    else toast('Added — ' + r.sid + (r.pid ? ' • ' + r.pid : ' • Unknown') + (near.length ? ` • ⚠ ${near.length} similar number(s) already exist — see top of page` : ''), near.length ? 6000 : 2200);
    updateAddHint();
    handleHits(scanWanted([nobj]), 'new');   // কেউ এই সিম খুঁজছিল কি?
  });

  $('bulkBtn').addEventListener('click', async ()=>{
    const parts = bn2en($('bulk').value).split(/[\s,;]+/).map(digits).filter(Boolean);
    if(!parts.length){ toast('No numbers found'); return; }
    let added=0, dup=0; const addedList=[], dupList=[];
    const bp = $('bulkPurpose').value;
    for(const p of parts){ const r=await addSim(p,'','',bp); if(r.ok){ added++; addedList.push(sims[0]); } else { if(r.dup){ dup++; dupList.push(sims.find(x=>x.number===p)); } else { toast(r.msg||'Could not add SIM'); return; } } }
    save(); $('bulk').value=''; render();
    if(askNoteOn()) showBulkNote(addedList, dupList); else toast(`${added} added` + (dup?`, ${dup} already existed`:''));
    if(added) handleHits(scanWanted(sims.slice(0, added)), 'new');
  });

  // ---------- render ----------
  function statusOK(s){ const v=$('filterS').value; if(v==='incomplete') return !s.name || !s.purpose; return v==='all' || (v==='given' ? !!s.given : !s.given); }
  const BD_PREFIXES = {
    '013':'Grameenphone', '017':'Grameenphone',
    '014':'Banglalink', '019':'Banglalink',
    '015':'Teletalk', '016':'Airtel / Robi', '018':'Robi'
  };
  function prefixSearch(qd){
    return qd.length >= 3 && Object.keys(BD_PREFIXES).some(prefix => qd.startsWith(prefix));
  }
  function matches(s, q, mode, fp){
    if(!statusOK(s)) return false;
    if(fp==='none' ? s.purpose!=='' : (fp!=='all' && s.purpose!==fp)) return false;
    if(!q) return true;
    const idq = q.trim().toUpperCase();
    if(/^[TMOS]\d+$/.test(idq)) return s.pid === idq || s.sid === idq;
    const qd = digits(q);
    const isNum = /^[\d০-৯\s\-+]+$/.test(q) && qd.length>0;
    if(isNum){
      if(qd.length === 11) return s.number === qd;
      if(qd.length > 11) return false;
      if(prefixSearch(qd)) return s.number.startsWith(qd);
      return s.number.endsWith(qd);
    }
    const t = q.trim().toLowerCase();
    return (s.name||'').toLowerCase().includes(t) || (s.home||'').toLowerCase().includes(t) || (s.note||'').toLowerCase().includes(t) || (PL[s.purpose]||'').toLowerCase().includes(t);
  }

  function numHtml(number, q, mode){
    const qd = digits(q);
    const isNum = q && /^[\d০-৯\s\-+]+$/.test(q) && qd;
    if(!isNum) return esc(number);
    if(qd.length===11 && number===qd) return '<mark>'+esc(number)+'</mark>';
    if(prefixSearch(qd) && number.startsWith(qd)) return '<mark>'+esc(qd)+'</mark>'+esc(number.slice(qd.length));
    if(number.endsWith(qd)) return esc(number.slice(0,-qd.length))+'<mark>'+esc(qd)+'</mark>';
    return esc(number);
  }

  // ---------- প্রায়-মিল (হাতে লেখার ভুল ধরার জন্য) ----------
  // a = যা লিখেছেন, b = সংরক্ষিত নাম্বার। ভুল ডিজিট, বাদ পড়া/বাড়তি ডিজিট, পাশাপাশি দুই ডিজিট উল্টে যাওয়া — সব ধরে।
  function editInfo(a, b){
    const m=a.length, n=b.length;
    const d = Array.from({length:m+1}, ()=>new Array(n+1).fill(0));
    for(let i=0;i<=m;i++) d[i][0]=i;
    for(let j=0;j<=n;j++) d[0][j]=j;
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
      let v = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1]===b[j-1]?0:1));
      if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) v = Math.min(v, d[i-2][j-2]+1);
      d[i][j] = v;
    }
    const mark = new Array(n).fill('x'); let i=m, j=n, hit=0;
    while(i>0 || j>0){
      if(i>1 && j>1 && a[i-1]!==b[j-1] && a[i-1]===b[j-2] && a[i-2]===b[j-1] && d[i][j]===d[i-2][j-2]+1){ mark[j-1]='t'; mark[j-2]='t'; i-=2; j-=2; }
      else if(i>0 && j>0 && d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){ if(a[i-1]===b[j-1]){ mark[j-1]='m'; hit++; } i--; j--; }
      else if(i>0 && d[i][j]===d[i-1][j]+1){ i--; }
      else { j--; }
    }
    return {d:d[m][n], mark, hit};
  }
  function inScope(s, fp){ if(!statusOK(s)) return false; return fp==='none' ? s.purpose==='' : (fp==='all' || s.purpose===fp); }
  // পুরো নাম্বার (৭+ ডিজিট) লিখলে হুবহু মিল না হলেও কাছাকাছি নাম্বারগুলো খুঁজে দেয়
  function similarAll(q, exact){
    const qd = digits(q);
    if(!/^[\d০-৯\s\-+]+$/.test(q) || qd.length < 7) return [];
    const maxD = qd.length>=10 ? 3 : qd.length>=8 ? 2 : 1;   // ১১ ডিজিটে সর্বোচ্চ ৩টা ভুল পর্যন্ত
    const out = [];
    sims.forEach(s=>{
      if(exact.has(s) || Math.abs(s.number.length-qd.length) > maxD) return;
      const r = editInfo(qd, s.number);
      if(r.d <= maxD) out.push({s, d:r.d, mark:r.mark, hit:r.hit, len:Math.max(qd.length, s.number.length)});
    });
    out.sort((x,y)=> x.d-y.d || y.hit-x.hit);
    return out;
  }
  function markedNumber(number, mark){
    return [...number].map((c,i)=> mark[i]==='x' ? `<span class="dx">${c}</span>` : mark[i]==='t' ? `<span class="dt">${c}</span>` : c).join('');
  }

  const ICON_EDIT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
  const ICON_DEL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
  const GROUPS = [['medical','Medical'],['tourist','Tourist'],['other','Other'],['','Unknown']];
  const SCOPES = [['all','All'],['medical','Medical'],['tourist','Tourist'],['other','Other'],['none','Unknown']];
  const collapsed = {};
  let listPanelOpen = false;
  const idNum = s => { const m=/(\d+)$/.exec(s.pid||s.sid||''); return m ? +m[1] : 1e9; };
  function render(){
    const q = $('q').value, mode='end', fp=$('filterP').value;
    const qd = digits(q);
    $('listCard').classList.toggle('is-visible', !!q.trim() || listPanelOpen);
    const hint = $('searchHint');
    if(hint) { hint.textContent = ''; hint.hidden = true; }
    const list = sims.filter(s=>matches(s,q,mode,fp));
    const exactAll = new Set(sims.filter(s=>matches(s,q,mode,'all')));
    const simAll = similarAll(q, exactAll);
    const simList = simAll.filter(x=>inScope(x.s, fp));
    const tb = $('tbody');
    const wmap = {}; wanted.forEach(w=>{ if(w.status==='found' && w.matchNumber) wmap[w.matchNumber]=w; });
    const rowHtml = (s,i)=>`
      <tr data-id="${s.id}"${s.given?' class="given"':''}>
        <td class="idx">${i+1}</td>
        <td class="pid S">${esc(s.sid||'')}</td>
        <td class="pid ${s.pid?s.pid[0]:''}">${s.pid?esc(s.pid):'<span class="nopid">—</span>'}</td>
        <td class="num">${numHtml(s.number,q,mode)}</td>
        <td>${s.name?esc(s.name):'<span class="nopid">—</span>'}</td>
        <td>${s.home?esc(s.home):'<span class="nopid">—</span>'}</td>
        <td><span class="badge p-${s.purpose||'unknown'}">${s.purpose?PL[s.purpose]:'Unknown'}</span>${s.given?`<br><span class="badge p-given" title="${esc(fmtDate(s.givenAt))}">✔ Given</span>`:''}${wmap[s.number]?`<br><span class="badge p-want" title="Requested by this customer via Wanted list">🔎 ${esc(wmap[s.number].name||'Wanted')}</span>`:''}</td>
        <td class="notecell">${esc(s.note)}</td>
        <td class="acts"><button class="icon give${s.given?' on':''}" data-give="1" title="${s.given?'Mark as NOT given':'Mark as given'}">✔</button><button class="icon" data-edit="1" title="Edit">${ICON_EDIT}</button><button class="icon del" data-del="1" title="Delete">${ICON_DEL}</button></td>
      </tr>`;
    let html = '';
    GROUPS.forEach(([key,label])=>{
      let g = list.filter(s=>s.purpose===key);
      if(!g.length) return;
      if($('sortBy').value==='id') g = [...g].sort((a,b)=>idNum(a)-idNum(b));
      const cls = key || 'unknown';
      const col = collapsed[cls] && !q;   // সার্চ চললে গ্রুপ বন্ধ থাকবে না
      html += `<tr class="grp ${cls}" data-grp="${cls}"><td colspan="9"><span class="car">${col?'▸':'▾'}</span>${label}<span class="gc">${g.length}</span></td></tr>`;
      if(!col) html += g.map(rowHtml).join('');
    });
    tb.innerHTML = html;
    // সার্চের পরিধি (scope) বাটন — সংখ্যা বর্তমান সার্চ অনুযায়ী
    $('printTitle').textContent = (SCOPES.find(x=>x[0]===fp)||['','All'])[1] + ' SIMs — ' + new Date().toLocaleDateString('en-GB') + ' — ' + list.length + ' total';
    $('scopeBar').innerHTML = SCOPES.map(([v,l])=>`<button type="button" class="chip ${v}${v===fp?' on':''}" data-scope="${v}">${l}<b>${sims.filter(s=>matches(s,q,mode,v)).length + simAll.filter(x=>inScope(x.s,v)).length}</b></button>`).join('');
    $('empty').style.display = list.length ? 'none' : 'block';
    $('empty').innerHTML = sims.length ? 'No SIMs match the current search / filters.<br><br><button type="button" id="emptyReset">↺ Show all SIMs</button>' : 'No SIMs yet.';
    if(!list.length && simList.length){ $('empty').style.display='block'; $('empty').textContent = 'No exact match — similar numbers are shown above.'; }
    $('simPanel').innerHTML = simList.length ? `
      <div class="simp">
        <div class="simp-h">⚠ Similar numbers — possible typo <span>${simList.length}</span></div>
        <div class="simp-sub">Red digits differ from what you typed; orange = swapped digits</div>
        ${simList.map(x=>`
        <div class="simrow" data-id="${x.s.id}">
          <span class="pid S">${esc(x.s.sid||'')}</span>
          <span class="pid ${x.s.pid?x.s.pid[0]:''}">${x.s.pid?esc(x.s.pid):'—'}</span>
          <span class="num">${markedNumber(x.s.number, x.mark)}</span>
          <span class="mpct ${x.d<=1?'hi':''}">${x.hit}/${x.len} digits match</span>
          <span class="who">${esc([x.s.name,x.s.home].filter(Boolean).join(' • '))}</span>
          <span class="badge p-${x.s.purpose||'unknown'}">${x.s.purpose?PL[x.s.purpose]:'Unknown'}</span>${x.s.given?' <span class="badge p-given">✔ Given</span>':''}
          <button class="icon" data-edit="1" title="Edit">${ICON_EDIT}</button>
        </div>`).join('')}
      </div>` : '';
    $('resultInfo').textContent = (q || fp!=='all') ? `${list.length} results (of ${sims.length})` + (simList.length ? ` • ${simList.length} similar` : '') : '';
    // সার্চে অল্প কয়েকটা পাওয়া গেলে বড় করে আইডি দেখাই
    $('idBanner').innerHTML = (q && list.length>0 && list.length<=5) ? list.map(s=>`
      <div class="idb">
        <div class="big S">${esc(s.sid||'')}</div>
        <div class="big ${s.pid?s.pid[0]:'none'}">${s.pid?esc(s.pid):'Unknown'}</div>
        <div class="info"><b>${esc(s.number)}</b><br>${esc([s.name,s.home,PL[s.purpose],s.given?'✔ Given':''].filter(Boolean).join(' • '))}</div>
      </div>`).join('') : '';
    // সার্চের সাথে Wanted তালিকাও দেখাই
    const wp = q ? wantedForQuery(q, mode) : [];
    $('wantPanel').innerHTML = wp.length ? `
      <div class="wantp">
        <div class="wantp-h">🔎 In your Wanted list <span>${wp.length}</span></div>
        ${wp.map(w=>`
        <div class="wrow ${w.status}" data-w="${w.id}">
          <div class="wmain">
            <div class="want-primary"><span class="num">${esc(w.number)}</span>${w.status==='open'?'<span class="badge p-want">Open</span>':w.status==='found'?'<span class="badge p-given">✔ Found</span>':'<span class="badge p-unknown">Closed</span>'}</div>
            <div class="wmeta"><b>${esc(w.name||'No name')}</b>${w.phone?' • 📞 '+esc(w.phone):''}${w.note?' • '+esc(w.note):''} • asked ${esc(fmtDate(w.createdAt))}</div>
            ${w.status==='found'?`<div class="wfound">→ ${esc([w.matchSid,w.matchPid].filter(Boolean).join(' • '))} <b class="num">${esc(w.matchNumber||'')}</b></div>`:''}
          </div>
          <div class="wbtn"><button type="button" class="ghost" data-wact="manage">Open in Wanted</button></div>
        </div>`).join('')}
      </div>` : '';
    stats();
  }

  function stats(){
    $('sTotal').textContent = sims.length;
    $('sTourist').textContent = sims.filter(s=>s.purpose==='tourist').length;
    $('sMedical').textContent = sims.filter(s=>s.purpose==='medical').length;
    $('sWanted').textContent = wanted.filter(w=>w.status==='open').length;
    $('sGiven').textContent = sims.filter(s=>s.given).length;
    $('sOther').textContent = sims.filter(s=>s.purpose==='other').length;
    $('sBlank').textContent = sims.filter(s=>!s.name || !s.purpose).length;
    const counts = {
      menuAllCount:sims.length,
      menuTouristCount:sims.filter(s=>s.purpose==='tourist').length,
      menuMedicalCount:sims.filter(s=>s.purpose==='medical').length,
      menuOtherCount:sims.filter(s=>s.purpose==='other').length,
      menuUnknownCount:sims.filter(s=>!s.purpose).length,
      menuGivenCount:sims.filter(s=>s.given).length,
      menuIncompleteCount:sims.filter(s=>!s.name || !s.purpose).length
    };
    Object.entries(counts).forEach(([id,value])=>{ const el=$(id); if(el) el.textContent=String(value); });
  }

  // edit & delete (modal)
  let editing = null;
  const LBL = {'':'Unknown', tourist:'Tourist', medical:'Medical', other:'Other'};
  const radios = () => document.querySelectorAll('input[name="ePur"]');
  const curPur = () => { const r=document.querySelector('input[name="ePur"]:checked'); return r ? r.value : ''; };
  function purposeWarn(s, nv){
    const pre = PREFIX[nv];
    if(!s.pid || pre === s.pid[0]) return '';
    return pre ? `${s.pid} will be replaced with a new ${pre} ID` : `${s.pid} will be removed`;
  }
  function openEdit(s){
    editing = s;
    $('editIds').innerHTML = `<span class="badge p-unknown">${esc(s.sid||'')}</span>` + (s.pid ? `<span class="badge p-${s.purpose}">${esc(s.pid)}</span>` : '<span class="badge p-unknown">No type ID</span>');
    $('eNum').value = s.number; $('eName').value = s.name||''; $('eHome').value = s.home||''; $('eNote').value = s.note||''; $('eGiven').checked = !!s.given;
    radios().forEach(r => r.checked = (r.value === (s.purpose||'')));
    $('eWarn').textContent = ''; $('eErr').textContent = '';
    $('editOv').hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(()=>$('eNum').focus(), 30);
  }
  function closeEdit(){ $('editOv').hidden = true; document.body.style.overflow = ''; editing = null; }
  function deleteSim(s){
    if(!confirm(`Delete ${s.number}${s.name?' ('+s.name+')':''}?`)) return false;
    const idx = sims.indexOf(s); sims = sims.filter(x=>x!==s); save(); render();
    showUndo(`Deleted ${s.number}`, ()=>{ sims.splice(Math.min(idx, sims.length), 0, s); save(); render(); toast('Restored ' + s.number); });
    return true;
  }
  radios().forEach(r => r.addEventListener('change', ()=>{ if(editing) $('eWarn').textContent = purposeWarn(editing, curPur()); }));
  $('eNum').addEventListener('input', e=>{ e.target.value = bn2en(e.target.value).replace(/[^\d+\s\-]/g,''); $('eErr').textContent=''; });
  $('editX').addEventListener('click', closeEdit);
  $('eCancel').addEventListener('click', closeEdit);
  $('editOv').addEventListener('mousedown', e=>{ if(e.target === $('editOv')) closeEdit(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('editOv').hidden) closeEdit(); });
  $('eDel').addEventListener('click', ()=>{ if(editing && deleteSim(editing)) closeEdit(); });
  $('editForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const s = editing; if(!s) return;
    const n = digits($('eNum').value);
    if(!n){ $('eErr').textContent = 'Enter a valid number'; return; }
    const dup = sims.find(x => x!==s && x.number===n);
    if(dup){ $('eErr').textContent = `This number already exists (${dup.sid}${dup.pid?' • '+dup.pid:''})`; return; }
    const nv = curPur(), oldPid = s.pid, oldNum = s.number, previous = {...s};
    s.number = n; s.name = $('eName').value.trim(); s.home = $('eHome').value.trim(); s.note = $('eNote').value.trim();
    s.purpose = nv;
    const gv = $('eGiven').checked; if(gv !== !!s.given){ s.given = gv; s.givenAt = gv ? new Date().toISOString() : ''; }
    if(!s.pid || PREFIX[nv] !== s.pid[0]){
      if(window.simCloudAllocatePid && PREFIX[nv]){
        try{ const allocation=await window.simCloudAllocatePid(nv); s.pid=allocation.pid; meta.counters=Object.assign(meta.counters||{},allocation.counters||{}); saveMeta(); }
        catch(err){ Object.assign(s,previous); $('eErr').textContent='Could not reserve a unique Type ID from Firebase. Check your connection and try again.'; return; }
      } else assignPid(s);
    }
    save(); closeEdit(); render();
    toast('Changes saved' + (s.pid!==oldPid ? ' • ID: ' + (s.pid||'none') : '') + (n!==oldNum ? ' • Number changed' : ''));
    if(n!==oldNum) handleHits(scanWanted([s]), 'new');
  });
  $('tbody').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    const s = sims.find(x=>x.id===b.closest('tr').dataset.id); if(!s) return;
    if(b.dataset.edit) openEdit(s); else if(b.dataset.del) deleteSim(s);
    else if(b.dataset.give){ s.given = !s.given; s.givenAt = s.given ? new Date().toISOString() : ''; save(); render(); toast(s.given ? `${s.sid} marked as GIVEN` : `${s.sid} back in stock`); }
  });
  $('tbody').addEventListener('dblclick', e=>{
    if(e.target.closest('button')) return;
    const tr = e.target.closest('tr'); const s = tr && sims.find(x=>x.id===tr.dataset.id); if(s) openEdit(s);
  });
  // ধরন বেছে নিলে ড্রপডাউনের রং বদলায়, যাতে ভুল সিলেক্ট চোখে পড়ে
  ['fPurpose','bulkPurpose'].forEach(id=>{ const el=$(id); el.classList.add('pcol'); el.dataset.p=el.value; el.addEventListener('change',()=>{ el.dataset.p=el.value; }); });

  ['q','filterP','filterS','sortBy'].forEach(id=>$(id).addEventListener('input', render));
  ['filterP','filterS','sortBy'].forEach(id=>$(id).addEventListener('change', render));
  $('q').addEventListener('keydown', e=>{ if(e.key==='Escape'){ e.target.value=''; render(); } });
  $('printBtn').addEventListener('click', ()=>window.print());
  $('simPanel').addEventListener('click', e=>{
    const b = e.target.closest('button[data-edit]'); if(!b) return;
    const s = sims.find(x=>x.id===b.closest('.simrow').dataset.id); if(s) openEdit(s);
  });
  $('scopeBar').addEventListener('click', e=>{
    const b = e.target.closest('button[data-scope]'); if(!b) return;
    $('filterP').value = b.dataset.scope; render();
  });
  $('tbody').addEventListener('click', e=>{
    const tr = e.target.closest('tr.grp'); if(!tr) return;
    const k = tr.dataset.grp; collapsed[k] = !collapsed[k]; render();
  });
  // ইংরেজি/বাংলা যেকোনো ডিজিট কাজ করবে; নাম্বার ঘরে বাংলা ডিজিট ইংরেজিতে বদলে দিই
  $('fNum').addEventListener('input', e=>{ e.target.value = bn2en(e.target.value).replace(/[^\d+\s\-]/g,''); });

  // ---------- backup ----------
  $('expJson').addEventListener('click', ()=>{
    download(`sim-backup_${stamp()}.json`, JSON.stringify(payload(),null,2), 'application/json');
    meta.lastBackup = new Date().toISOString(); saveMeta(); showBackupInfo(); toast('Backup downloaded');
  });
  $('expCsv').addEventListener('click', ()=>{
    const q = v => '"'+String(v||'').replace(/"/g,'""')+'"';
    const rows = [['#','Serial','Type ID','SIM number','Name','Home/District','Type','Note','Added on','Given','Given on']];
    sims.forEach((s,i)=>rows.push([i+1, s.sid||'', s.pid||'', s.number, s.name, s.home, PL[s.purpose]||'', s.note, s.createdAt, s.given?'Yes':'', s.givenAt||'']));
    // SIM number যেন Excel-এ শুরুর 0 না হারায়, তাই ="..." ফরম্যাট
    const csv = '\uFEFF' + rows.map((r,ri)=>r.map((c,ci)=> (ri>0&&ci===3) ? `="${c}"` : q(c)).join(',')).join('\r\n');
    download(`sim-list_${stamp()}.csv`, csv, 'text/csv;charset=utf-8');
  });
  $('impBtn').addEventListener('click', ()=>$('impFile').click());
  $('impFile').addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const d = JSON.parse(r.result);
        const arr = Array.isArray(d) ? d : d.sims;
        if(!Array.isArray(arr)) throw 0;
        let add=0, upd=0;
        const before = new Set(sims);
        arr.forEach(x=>{
          const n = digits(x.number); if(!n) return;
          const ex = sims.find(s=>s.number===n);
          if(ex){
            let ch=false;
            ['name','home','purpose','note'].forEach(k=>{ if(!ex[k] && x[k]){ ex[k]=x[k]; ch=true; } });
            if(!ex.pid && x.pid && /^[TMO]\d+$/.test(x.pid) && PREFIX[ex.purpose]===x.pid[0] && !pidTaken(x.pid, ex)){ ex.pid=x.pid; ch=true; }
            if(!ex.given && x.given){ ex.given=true; ex.givenAt=x.givenAt||''; ch=true; }
            if(ch) upd++;
          } else {
            const obj = {id:uid(), sid:'', pid:'', number:n, name:x.name||'', home:x.home||'', purpose:x.purpose||'', note:x.note||'', createdAt:x.createdAt||new Date().toISOString(), given:!!x.given, givenAt:x.givenAt||''};
            if(x.pid && /^[TMO]\d+$/.test(x.pid) && PREFIX[obj.purpose]===x.pid[0] && !pidTaken(x.pid)) obj.pid = x.pid;
            if(/^S\d+$/.test(x.sid||'') && !sims.some(o=>o.sid===x.sid)) obj.sid = x.sid;
            sims.push(obj);
            add++;
          }
        });
        if(d && d.counters){ ['T','M','O','S'].forEach(k=>{ meta.counters[k] = Math.max(meta.counters[k]||0, +d.counters[k]||0); }); }
        ensureIds();
        const wAdded = Array.isArray(d && d.wanted) ? mergeWanted(d.wanted) : 0;
        if(wAdded) saveWanted();
        save();
        if(window.simCloudImportRequested) window.simCloudImportRequested();
        render(); toast(`Restored: ${add} new, ${upd} updated` + (wAdded ? `, ${wAdded} wanted` : ''));
        handleHits(scanWanted(sims.filter(x=>!before.has(x))), 'new');
      }catch(err){ toast('Invalid backup file'); }
      e.target.value='';
    };
    r.readAsText(f);
  });
  $('autoBtn').addEventListener('click', async ()=>{
    if(!window.showSaveFilePicker){ toast('Not supported in this browser — use Chrome/Edge'); return; }
    try{
      fileHandle = await window.showSaveFilePicker({suggestedName:'sim-auto-backup.json', types:[{description:'JSON', accept:{'application/json':['.json']}}]});
      await writeAuto();
      $('autoBtn').textContent='Auto-backup on';
      toast('Auto-backup enabled');
    }catch(e){ /* বাতিল */ }
  });


  // ---------- খোঁজার তালিকা (Wanted) ----------
  function loadWanted(){
    try{ wanted = JSON.parse(localStorage.getItem(WKEY)||'[]'); if(!Array.isArray(wanted)) wanted = []; }catch(e){ wanted = []; }
  }
  function saveWanted(){
    try{ localStorage.setItem(WKEY, JSON.stringify(wanted)); }catch(e){ toast('Could not save Wanted list! Download a backup.'); }
    writeAuto();
    if(window.simCloudLocalChanged) window.simCloudLocalChanged('wanted');
  }
  const KIND_LABEL = {exact:'Exact match', partial:'Same last digits', similar:'Similar — possible typo'};
  const KIND_RANK = {exact:0, partial:1, similar:2};
  const maxDfor = len => len>=10 ? 3 : len>=8 ? 2 : 1;
  const histDiff = (a,b) => { const h=new Array(10).fill(0); for(const c of a) h[+c]++; for(const c of b) h[+c]--; return h.reduce((t,v)=>t+Math.abs(v),0); };

  // w (খোঁজা নাম্বার) বনাম s (সিম): হুবহু / শেষের ডিজিট মেলে / হাতের ভুল সহ প্রায়-মিল
  function wantMatch(w, s){
    const wd = w.number, sn = s.number;
    if(!wd || !sn) return null;
    const plain = new Array(sn.length).fill('m');
    if(wd === sn) return {kind:'exact', d:0, hit:sn.length, len:sn.length, mark:plain};
    if(wd.length < sn.length && wd.length >= 4 && (sn.endsWith(wd) || (wd.length>=6 && sn.includes(wd))))
      return {kind:'partial', d:0, hit:wd.length, len:sn.length, mark:plain};
    if(wd.length >= 7){
      const md = maxDfor(wd.length);
      if(Math.abs(wd.length - sn.length) <= md && histDiff(wd, sn) <= 2*md){
        const r = editInfo(wd, sn);
        if(r.d <= md) return {kind:'similar', d:r.d, hit:r.hit, len:Math.max(wd.length, sn.length), mark:r.mark};
      }
    }
    return null;
  }
  const isIgnored = (w, s) => (w.ignored||[]).includes(s.number);
  function scanWanted(list){
    const hits = [];
    wanted.forEach(w=>{
      if(w.status !== 'open') return;
      list.forEach(s=>{ if(isIgnored(w,s)) return; const m = wantMatch(w,s); if(m) hits.push({w, s, m}); });
    });
    hits.sort((a,b)=> KIND_RANK[a.m.kind]-KIND_RANK[b.m.kind] || a.m.d-b.m.d);
    return hits;
  }
  const simOfWanted = w => sims.find(s=>s.id===w.matchSimId) || sims.find(s=>s.number===w.matchNumber);

  function markFound(w, s, m){
    w.status = 'found'; w.matchSimId = s.id; w.matchNumber = s.number; w.matchSid = s.sid; w.matchPid = s.pid;
    w.matchKind = m ? m.kind : 'manual'; w.foundAt = new Date().toISOString();
    let filled = false;
    if(!s.name && w.name){ s.name = w.name; filled = true; }                     // সিমে কাস্টমারের নাম বসিয়ে দিই
    if(!s.note && w.number !== s.number){ s.note = 'Wanted: ' + w.number; filled = true; }
    return filled;
  }

  // নতুন সিম এলে যা মিলল তা নিয়ে কাজ: হুবহু মিললে নিজে থেকে "Found", বাকিগুলো জিজ্ঞেস করে
  function handleHits(hits, ctx){
    if(!hits.length) return;
    const done = new Set(), out = []; let simChanged = false;
    hits.forEach(h=>{ if(h.m.kind==='exact' && !done.has(h.w.id)){ if(markFound(h.w, h.s, h.m)) simChanged = true; done.add(h.w.id); out.push({...h, ctx, state:'auto'}); } });
    hits.forEach(h=>{ if(h.m.kind!=='exact' && !done.has(h.w.id)) out.push({...h, ctx, state:'pending'}); });
    if(!out.length) return;
    saveWanted(); if(simChanged) save(); render(); renderWanted();
    queueMatches(out);
  }

  let matchState = [], infoMode = '';
  function openInfo(mode){ infoMode = mode; $('infoOv').hidden = false; document.body.style.overflow = 'hidden'; }
  function closeInfo(){ $('infoOv').hidden = true; document.body.style.overflow = ''; infoMode = ''; }
  function simLine(s){ return `<b>${esc([s.sid,s.pid].filter(Boolean).join(' • '))}</b> • ${esc(PL[s.purpose]||'Unknown')}${s.name?' • '+esc(s.name):''}${s.home?' • '+esc(s.home):''}`; }

  function drawMatches(){
    const n = matchState.length;
    $('infoTitle').textContent = '🔔 Someone was looking for this SIM';
    $('infoSub').textContent = n + ' match' + (n>1?'es':'') + ' from your Wanted list';
    $('infoBody').innerHTML = matchState.map((h,i)=>{
      const {w,s,m} = h;
      const where = h.ctx==='existing' ? 'Already in your list' : 'Just added';
      let foot = '';
      if(h.state==='auto') foot = `<div class="done">✔ Marked as Found automatically${(w.name && s.name===w.name)?' • customer name saved on the SIM':''}</div>`;
      else if(h.state==='yes') foot = `<div class="done">✔ Confirmed — marked as Found</div>`;
      else if(h.state==='no') foot = `<div class="done no">✖ Not the same SIM — won't alert again</div>`;
      else foot = `<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="good" data-macts="yes" data-i="${i}">✔ Yes, this is it</button><button type="button" class="ghost" data-macts="no" data-i="${i}">✖ Not it</button></div>`;
      return `<div class="mcard ${m.kind}">
        <div><span class="mk mk-${m.kind}">${KIND_LABEL[m.kind]}</span>${m.kind!=='exact'?` <span class="mpct">${m.hit}/${m.len} digits match</span>`:''}</div>
        <div>Asked by <b>${esc(w.name||'(no name)')}</b>${w.phone?' • 📞 '+esc(w.phone):''} on ${esc(fmtDate(w.createdAt))}</div>
        <div>They gave: <span class="num">${esc(w.number)}</span>${w.note?' <span class="hint">('+esc(w.note)+')</span>':''}</div>
        <div>${where}: <span class="num">${markedNumber(s.number, m.mark)}</span></div>
        <div>${simLine(s)}</div>
        ${foot}
      </div>`;
    }).join('');
  }

  // Wanted তালিকা দেখানো
  function wantedForQuery(q, mode){
    const qd = digits(q), t = q.trim().toLowerCase();
    const isNum = /^[\d০-৯\s\-+]+$/.test(q) && qd.length>0;
    const isId = /^[TMOS]\d+$/i.test(t);
    return wanted.filter(w=>{
      if(isId){ const u = t.toUpperCase(); return w.matchSid===u || w.matchPid===u; }
      if(isNum){
        if(qd.length===11 && w.number===qd) return true;
        if(qd.length>11) return false;
        if(prefixSearch(qd) && w.number.startsWith(qd)) return true;
        if(qd.length>=2 && w.number.endsWith(qd)) return true;
        if(qd.length>=7 && qd.length<11 && w.number.length>=7){ const md = maxDfor(qd.length); return Math.abs(qd.length-w.number.length)<=md && histDiff(qd,w.number)<=2*md && editInfo(qd,w.number).d<=md; }
        return false;
      }
      return (w.name||'').toLowerCase().includes(t) || (w.note||'').toLowerCase().includes(t) || (w.phone||'').includes(t);
    });
  }
  function renderWanted(){
    if(!$('wantList')) return;
    const f = $('wFilter').value;
    const list = wanted.filter(w=> f==='all' || w.status===f)
      .sort((a,b)=> (a.status==='open'?0:1)-(b.status==='open'?0:1) || (b.createdAt||'').localeCompare(a.createdAt||''));
    const open = wanted.filter(w=>w.status==='open').length;
    $('wCount').textContent = `${open} open · ${wanted.filter(w=>w.status==='found').length} found`;
    const menuCount = $('wantedMenuCount'); if(menuCount) menuCount.textContent = String(open);
    $('wantList').innerHTML = list.length ? list.map(w=>{
      let live = '';
      if(w.status==='open'){
        const hits = scanWanted(sims).filter(h=>h.w===w).slice(0,3);
        live = hits.map(h=>`<div class="wlive"><span class="mk mk-${h.m.kind}">${KIND_LABEL[h.m.kind]}</span><span class="num">${markedNumber(h.s.number,h.m.mark)}</span><span>${simLine(h.s)}</span><button type="button" class="good" data-wact="yes" data-s="${esc(h.s.number)}">✔ This is it</button><button type="button" class="ghost" data-wact="no" data-s="${esc(h.s.number)}">✖ Not it</button></div>`).join('');
      }
      const ms = w.status==='found' ? simOfWanted(w) : null;
      return `<div class="wrow ${w.status}" data-w="${w.id}">
        <div class="wmain">
          <div class="want-primary"><span class="num">${esc(w.number)}</span>${w.status==='open'?'<span class="badge p-want">Open</span>':w.status==='found'?'<span class="badge p-given">✔ Found</span>':'<span class="badge p-unknown">Closed</span>'}</div>
          <div class="wmeta"><b>${esc(w.name||'No name')}</b>${w.phone?' • 📞 '+esc(w.phone):''}${w.note?' • '+esc(w.note):''} • asked ${esc(fmtDate(w.createdAt))}</div>
          ${w.status==='found'?`<div class="wfound">→ ${esc([w.matchSid,w.matchPid].filter(Boolean).join(' • '))} <b class="num">${esc(w.matchNumber||'')}</b> • ${esc(KIND_LABEL[w.matchKind]||'Confirmed')} • ${esc(fmtDate(w.foundAt))}${ms?'':' (SIM no longer in list)'}</div>`:''}
          ${live}
        </div>
        <div class="wbtn">
          ${w.status==='open'?`<button type="button" class="ghost" data-wact="search">Search</button><button type="button" class="ghost" data-wact="edit">Edit</button><button type="button" class="ghost" data-wact="close">Close</button>`:''}
          ${w.status==='found'&&ms?`<button type="button" class="ghost" data-wact="show">Show SIM</button>`:''}
          ${w.status!=='open'?`<button type="button" class="ghost" data-wact="reopen">Re-open</button>`:''}
          <button type="button" class="danger" data-wact="del">Delete</button>
        </div>
      </div>`;
    }).join('') : `<div class="empty">${f==='open'?'Nothing to look for right now.':'Nothing here.'}</div>`;
  }

  let wEditing = null;
  function resetWantForm(){ wEditing = null; $('wantForm').reset(); $('wSubmit').textContent = 'Add to Wanted'; $('wCancel').hidden = true; }
  function loadWantForm(w){
    wEditing = w; $('wNum').value = w.number; $('wName').value = w.name||''; $('wPhone').value = w.phone||''; $('wNote').value = w.note||'';
    $('wSubmit').textContent = 'Save changes'; $('wCancel').hidden = false;
    $('wantCard').scrollIntoView({behavior:'smooth', block:'start'}); $('wName').focus();
  }
  $('wNum').addEventListener('input', e=>{ e.target.value = bn2en(e.target.value).replace(/[^\d+\s\-]/g,''); });
  $('wCancel').addEventListener('click', resetWantForm);
  $('wFilter').addEventListener('input', renderWanted);
  $('wantForm').addEventListener('submit', e=>{
    e.preventDefault();
    const num = digits($('wNum').value);
    if(num.length < 4){ toast('Enter at least 4 digits'); return; }
    const data = {number:num, name:$('wName').value.trim(), phone:$('wPhone').value.trim(), note:$('wNote').value.trim()};
    const dup = wanted.find(x=>x!==wEditing && x.status==='open' && x.number===num);
    if(dup){ toast(`Already in Wanted${dup.name?' ('+dup.name+')':''}`); return; }
    let w;
    if(wEditing){
      w = wEditing; if(w.number !== num) w.ignored = []; Object.assign(w, data);
      toast('Wanted updated');
    } else {
      w = Object.assign({id:uid(), createdAt:new Date().toISOString(), status:'open', ignored:[]}, data);
      wanted.unshift(w);
      toast('Added to Wanted — you will be alerted if this SIM shows up');
    }
    saveWanted(); resetWantForm(); renderWanted(); render();
    if(w.status==='open') handleHits(scanWanted(sims).filter(h=>h.w===w), 'existing');   // এখনই তালিকায় আছে কি?
    $('wNum').focus();
  });
  function wantedClick(e){
    const b = e.target.closest('button[data-wact]'); if(!b) return;
    const row = b.closest('[data-w]'); const w = row && wanted.find(x=>x.id===row.dataset.w); if(!w) return;
    const act = b.dataset.wact;
    const simByNum = b.dataset.s && sims.find(x=>x.number===b.dataset.s);
    if(act==='search'){ $('q').value = w.number; render(); window.scrollTo({top:0, behavior:'smooth'}); }
    else if(act==='edit' || act==='manage') loadWantForm(w);
    else if(act==='close'){ w.status='closed'; saveWanted(); renderWanted(); render(); }
    else if(act==='reopen'){ w.status='open'; ['matchSimId','matchNumber','matchSid','matchPid','matchKind','foundAt'].forEach(k=>delete w[k]); saveWanted(); renderWanted(); render(); }
    else if(act==='del'){ if(confirm(`Delete Wanted entry ${w.number}${w.name?' ('+w.name+')':''}?`)){ wanted = wanted.filter(x=>x!==w); saveWanted(); renderWanted(); render(); toast('Deleted'); } }
    else if(act==='show'){ const ms = simOfWanted(w); if(ms){ $('q').value = ms.number; $('filterS').value='all'; render(); window.scrollTo({top:0, behavior:'smooth'}); } }
    else if(act==='yes' && simByNum){ const m = wantMatch(w, simByNum); const filled = markFound(w, simByNum, m); saveWanted(); if(filled) save(); render(); renderWanted(); toast(`Found — ${simByNum.sid} is for ${w.name||w.number}`); }
    else if(act==='no' && simByNum){ (w.ignored = w.ignored||[]).push(simByNum.number); saveWanted(); renderWanted(); }
  }
  $('wantList').addEventListener('click', wantedClick);
  $('wantPanel').addEventListener('click', wantedClick);
  $('statWanted').addEventListener('click', showWantedPanel);
  $('wScan').addEventListener('click', ()=>{
    const hits = scanWanted(sims);
    if(!hits.length){ toast('No match for anything in your Wanted list'); return; }
    handleHits(hits, 'existing');
  });
  function mergeWanted(arr){
    let n = 0;
    arr.forEach(x=>{
      const num = digits(x && x.number); if(num.length<4) return;
      const ex = wanted.find(w=>w.id===x.id);
      if(!ex){ wanted.push({id:x.id||uid(), number:num, name:x.name||'', phone:x.phone||'', note:x.note||'', createdAt:x.createdAt||new Date().toISOString(), status:['open','found','closed'].includes(x.status)?x.status:'open', ignored:Array.isArray(x.ignored)?x.ignored:[], matchSimId:x.matchSimId, matchNumber:x.matchNumber, matchSid:x.matchSid, matchPid:x.matchPid, matchKind:x.matchKind, foundAt:x.foundAt}); n++; }
      else if(ex.status==='open' && x.status && x.status!=='open'){ Object.assign(ex, {status:x.status, matchSimId:x.matchSimId, matchNumber:x.matchNumber, matchSid:x.matchSid, matchPid:x.matchPid, matchKind:x.matchKind, foundAt:x.foundAt}); n++; }
    });
    return n;
  }

  // Match modal buttons
  $('infoBody').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.macts){
      const h = matchState[+b.dataset.i]; if(!h) return;
      if(b.dataset.macts==='yes'){ const filled = markFound(h.w, h.s, h.m); h.state='yes'; if(filled) save(); }
      else { (h.w.ignored = h.w.ignored||[]).push(h.s.number); h.state='no'; }
      saveWanted(); render(); renderWanted(); drawMatches();
    } else if(b.dataset.tact){
      const i = +b.dataset.i, p = typoState[i]; if(!p) return;
      if(b.dataset.tact==='ignore'){ typoIgnore.add(typoKey(p.a,p.b)); saveTypoIgnore(); typoState.splice(i,1); drawTypos(); }
      else { closeInfo(); openEdit(b.dataset.tact==='a' ? p.a : p.b); }
    }
  });
  $('infoX').addEventListener('click', closeInfo);
  $('infoClose').addEventListener('click', closeInfo);
  $('infoOv').addEventListener('mousedown', e=>{ if(e.target===$('infoOv')) closeInfo(); });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape' && !$('infoOv').hidden) closeInfo();
    if(e.key==='/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'') && $('editOv').hidden && $('infoOv').hidden && $('noteOv').hidden){ e.preventDefault(); $('q').focus(); }
  });

  // নম্বর টাইপ করার সময়ই সতর্কতা: ডুপ্লিকেট / প্রায়-একই / Wanted-এর সাথে মিল
  function updateAddHint(){
    const box = $('fHint'), n = digits($('fNum').value);
    if(n.length < 4){ box.innerHTML = ''; return; }
    let html = '';
    const dup = sims.find(s=>s.number===n);
    if(dup) html += `<div class="ewarn" style="display:block;margin-top:8px">⚠ Already in your list: ${simLine(dup)}</div>`;
    else if(n.length >= 7){
      const sm = similarAll(n, new Set()).slice(0,3);
      if(sm.length) html += `<div class="ewarn" style="display:block;margin-top:8px">⚠ Looks like an existing number — typo? ${sm.map(x=>`<br><span class="num">${markedNumber(x.s.number,x.mark)}</span> ${simLine(x.s)}`).join('')}</div>`;
    }
    const wh = wanted.filter(w=>w.status==='open').map(w=>({w, m:wantMatch(w,{number:n,id:''})})).filter(x=>x.m).slice(0,3);
    if(wh.length) html += `<div class="wantnote">🔔 This matches your Wanted list: ${wh.map(x=>`<b>${esc(x.w.name||'No name')}</b> asked for <span class="num">${esc(x.w.number)}</span> (${KIND_LABEL[x.m.kind]})`).join('; ')}</div>`;
    box.innerHTML = html;
  }
  $('fNum').addEventListener('input', updateAddHint);

  // পুরো তালিকায় টাইপো-জোড়া খোঁজা
  const TKEY = 'simManagerTypoIgnore_v1';
  let typoIgnore = new Set(); try{ typoIgnore = new Set(JSON.parse(localStorage.getItem(TKEY)||'[]')); }catch(e){}
  const saveTypoIgnore = () => { try{ localStorage.setItem(TKEY, JSON.stringify([...typoIgnore])); }catch(e){} };
  const typoKey = (a,b) => [a.number,b.number].sort().join('|');
  let typoState = [];
  function scanTypos(){
    const out = [];
    for(let i=0;i<sims.length;i++) for(let j=i+1;j<sims.length;j++){
      const a=sims[i], b=sims[j], len=Math.max(a.number.length,b.number.length), md = len>=10 ? 2 : 1;
      if(Math.abs(a.number.length-b.number.length) > 1 || len<7 || histDiff(a.number,b.number) > 2*md) continue;
      if(typoIgnore.has(typoKey(a,b))) continue;
      const r = editInfo(a.number, b.number);
      if(r.d <= md) out.push({a, b, d:r.d, mA:editInfo(b.number,a.number).mark, mB:r.mark});
      if(out.length >= 200) return out;
    }
    return out.sort((x,y)=>x.d-y.d);
  }
  function drawTypos(){
    $('infoTitle').textContent = '🔍 Possible typos in your list';
    $('infoSub').textContent = typoState.length ? `${typoState.length} pair(s) of numbers that differ by only 1–2 digits. Red = differs.` : '';
    $('infoBody').innerHTML = typoState.length ? typoState.map((p,i)=>`
      <div class="mcard similar">
        <div><span class="num">${markedNumber(p.a.number,p.mA)}</span> ${simLine(p.a)}</div>
        <div><span class="num">${markedNumber(p.b.number,p.mB)}</span> ${simLine(p.b)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="ghost" data-tact="a" data-i="${i}">Edit first</button><button type="button" class="ghost" data-tact="b" data-i="${i}">Edit second</button><button type="button" class="good" data-tact="ignore" data-i="${i}">✔ Both correct (not a typo)</button></div>
      </div>`).join('') : '<div class="empty">No suspicious pairs found 👍</div>';
  }
  $('typoBtn').addEventListener('click', ()=>{ typoState = scanTypos(); drawTypos(); openInfo('typo'); });

  // ভুলে ডিলিট → Undo
  let undoFn = null;
  function showUndo(msg, fn){
    undoFn = fn; $('undoMsg').textContent = msg; $('undoBar').hidden = false;
    clearTimeout(showUndo._t); showUndo._t = setTimeout(()=>{ $('undoBar').hidden = true; undoFn = null; }, 9000);
  }
  $('undoBtn').addEventListener('click', ()=>{ if(undoFn){ const f = undoFn; undoFn = null; $('undoBar').hidden = true; f(); } });


  // ---------- Compact panels ----------
  let previousBodyOverflow = '';
  function closeAddPanel(){ document.body.classList.remove('add-open'); $('addBackdrop').hidden=true; if(previousBodyOverflow!==null) document.body.style.overflow=previousBodyOverflow; previousBodyOverflow=''; }
  function openAddPanel(){ closeMenus(); previousBodyOverflow=document.body.style.overflow||''; document.body.style.overflow='hidden'; document.body.classList.add('add-open'); $('addBackdrop').hidden=false; setTimeout(()=>$('fNum').focus(),40); }
  function closeMenus(){ $('toolsPanel').hidden=true; $('moreMenu').hidden=true; $('gearBtn').setAttribute('aria-expanded','false'); $('moreBtn').setAttribute('aria-expanded','false'); }
  function closeContentPanels(){ $('wantCard').classList.remove('is-open'); $('backupCard').classList.remove('is-open'); $('statsCard').hidden=true; }
  function showSearchPanel(){ closeMenus(); closeContentPanels(); listPanelOpen=false; render(); setNavActive('search'); $('searchCard').scrollIntoView({behavior:'smooth',block:'start'}); $('q').focus({preventScroll:true}); }
  function showWantedPanel(){ closeMenus(); $('backupCard').classList.remove('is-open'); $('statsCard').hidden=true; listPanelOpen=false; render(); $('wantCard').classList.add('is-open'); renderWanted(); setNavActive('wanted'); $('wantCard').scrollIntoView({behavior:'smooth',block:'start'}); }
  function showBackupPanel(){ closeMenus(); $('wantCard').classList.remove('is-open'); $('statsCard').hidden=true; listPanelOpen=false; render(); $('backupCard').classList.add('is-open'); setNavActive('backup'); $('backupCard').scrollIntoView({behavior:'smooth',block:'start'}); }
  function showListPanel(){ closeMenus(); closeContentPanels(); listPanelOpen=true; render(); setNavActive('list'); $('listCard').scrollIntoView({behavior:'smooth',block:'start'}); }
  function showStatsPanel(){ closeMenus(); closeContentPanels(); $('statsCard').hidden=false; listPanelOpen=false; render(); window.scrollTo({top:0,behavior:'smooth'}); $('statsCard').scrollIntoView({behavior:'smooth',block:'start'}); }
  function setNavActive(key){ document.querySelectorAll('#mobileNav [data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===key)); }
  function showCategoryPanel(category){
    closeMenus(); closeContentPanels(); $('q').value='';
    $('filterP').value='all'; $('filterS').value='all';
    if(['tourist','medical','other'].includes(category)) $('filterP').value=category;
    else if(category==='unknown') $('filterP').value='none';
    else if(category==='given') $('filterS').value='given';
    else if(category==='incomplete') $('filterS').value='incomplete';
    listPanelOpen=true; render(); setNavActive('list'); $('listCard').scrollIntoView({behavior:'smooth',block:'start'});
  }
  // Expose only deliberate navigation callbacks for the separate mobile dock script.
  window.SIM_MANAGER_NAV = { openSearch:showSearchPanel, openWanted:showWantedPanel, openList:showListPanel, openBackup:showBackupPanel, openCategory:showCategoryPanel, openStats:showStatsPanel };
  $('stats')?.addEventListener('click', e=>{ const tile=e.target.closest('[data-category]'); if(tile) showCategoryPanel(tile.dataset.category); });
  $('mobileNav')?.addEventListener('click', e=>{ const b=e.target.closest('[data-nav]'); if(!b) return; const key=b.dataset.nav; if(key==='search') showSearchPanel(); else if(key==='wanted') showWantedPanel(); else if(key==='list') showListPanel(); else if(key==='backup') showBackupPanel(); });
  $('statsBtn')?.addEventListener('click',showStatsPanel);
  $('closeStatsBtn')?.addEventListener('click',()=>{ $('statsCard').hidden=true; showSearchPanel(); });
  $('addFab').addEventListener('click',openAddPanel);
  $('closeAddBtn').addEventListener('click',closeAddPanel);
  $('addBackdrop').addEventListener('click',closeAddPanel);
  $('gearBtn').addEventListener('click',()=>{ const open=$('toolsPanel').hidden; $('toolsPanel').hidden=!open; $('gearBtn').setAttribute('aria-expanded',String(open)); $('moreMenu').hidden=true; $('moreBtn').setAttribute('aria-expanded','false'); });
  $('moreBtn').addEventListener('click',()=>{ const open=$('moreMenu').hidden; $('moreMenu').hidden=!open; $('moreBtn').setAttribute('aria-expanded',String(open)); $('toolsPanel').hidden=true; $('gearBtn').setAttribute('aria-expanded','false'); });
  $('moreMenu').addEventListener('click',e=>{
    const category=e.target.closest('[data-open-category]');
    if(category){ showCategoryPanel(category.dataset.openCategory); return; }
    const b=e.target.closest('[data-open-panel]'); if(!b)return;
    if(b.dataset.openPanel==='wanted') showWantedPanel(); else if(b.dataset.openPanel==='backup') showBackupPanel(); else if(b.dataset.openPanel==='stats') showStatsPanel();
  });
  document.addEventListener('click',e=>{ if(!e.target.closest('.search-card')) closeMenus(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeAddPanel(); closeMenus(); } });
  $('wantCard').classList.remove('is-open'); $('backupCard').classList.remove('is-open');

  // ---------- Home / Reset ----------
  function resetView(focus){
    closeContentPanels();
    $('q').value=''; $('filterP').value='all'; $('filterS').value='all'; $('sortBy').value='new'; $('mode').value='end'; listPanelOpen=false;
    $('toolsPanel').hidden=true; $('gearBtn').setAttribute('aria-expanded','false');
    Object.keys(collapsed).forEach(k=>delete collapsed[k]);
    render();
    if(focus!==false){ if(!$('editOv').hidden) closeEdit(); if(!$('infoOv').hidden) closeInfo(); window.scrollTo({top:0, behavior:'smooth'}); $('q').focus(); }
  }
  $('homeBtn').addEventListener('click', ()=>{ $('wantCard').classList.remove('is-open'); $('backupCard').classList.remove('is-open'); $('statsCard').hidden=true; setNavActive('search'); resetView(true); });
  $('resetBtn').addEventListener('click', ()=>resetView(true));
  $('empty').addEventListener('click', e=>{ if(e.target.id==='emptyReset') resetView(true); });

  // ---------- "এই আইডি লিখে রাখুন" ডায়ালগ ----------
  $('keepP').checked = true; $('askNote').checked = true;
  const askNoteOn = () => $('askNote').checked;

  let noteMode = '', deferredMatch = false, noteTimer = null;
  function openNote(mode, html){
    noteMode = mode; $('noteBody').innerHTML = html; $('noteOv').hidden = false; document.body.style.overflow = 'hidden';
    const ack = $('noteAck');
    if(ack){ ack.addEventListener('click', confirmNote); setTimeout(()=>ack.focus(), 40); }
    else setTimeout(()=>{ const b = $('noteBody').querySelector('button'); if(b) b.focus(); }, 40);
  }
  function confirmNote(){
    const ack = $('noteAck'); if(!ack || ack.classList.contains('done')) return;
    ack.classList.add('done'); ack.querySelector('.lbl').textContent = 'Noted!';
    clearTimeout(noteTimer); noteTimer = setTimeout(closeNote, 380);
  }
  function closeNote(){
    if($('noteOv').hidden) return;
    clearTimeout(noteTimer);
    const mode = noteMode; $('noteOv').hidden = true; noteMode = ''; $('noteBody').innerHTML = '';
    if(!$('editOv').hidden || !$('infoOv').hidden) { /* other dialog is on top */ } else document.body.style.overflow = '';
    if(deferredMatch){ deferredMatch = false; drawMatches(); openInfo('match'); }
    else if(mode !== 'edit'){ const f = $('fNum'); f.focus(); if(mode==='dup') f.select(); }
  }
  function queueMatches(out){
    if(!$('noteOv').hidden){ matchState = deferredMatch ? matchState.concat(out) : out; deferredMatch = true; }
    else { matchState = out; drawMatches(); openInfo('match'); }
  }
  function ackBlock(label){
    return `<button type="button" class="bigok" id="noteAck"><span class="tick">✓</span><span class="lbl">${label}</span></button>`;
  }
  function showAddedNote(s, near){
    const warn = near && near.length ? `<div class="nmini">⚠ Similar number already in your list: <b>${esc(near[0].s.sid||'')}</b> ${markedNumber(near[0].s.number, near[0].mark)}${near.length>1?` (+${near.length-1} more)`:''} — typo?</div>` : '';
    openNote('added', `
      <div class="nhead" style="padding-bottom:0"><div class="ncheck">✓</div><h3 id="noteTitle" style="margin-bottom:0">SIM saved</h3></div>
      <div class="nbody">
        <div class="nserial"><small>SERIAL NO.</small><b>${esc(s.sid)}</b><span class="snum">${esc(s.number)}</span></div>
        <div class="nmsg">Write this number on the box where you keep this SIM.<br>It will make finding it later easy.</div>
        ${warn}
        ${ackBlock('I have noted this ID')}
      </div>`);
  }
  function showBulkNote(added, dups){
    const rows = list => list.filter(Boolean).map(x=>`<tr><td class="pid S" style="font-size:22px">${esc(x.sid)}</td><td class="num" style="font-size:15px">${esc(x.number)}</td></tr>`).join('');
    openNote('bulk', `
      <div class="nhead ${added.length?'':'warn'}" style="padding-bottom:0"><div class="ncheck">${added.length?'✓':'!'}</div><h3 id="noteTitle" style="margin-bottom:0">${added.length} SIM${added.length===1?'':'s'} saved${dups.length?` • ${dups.length} already existed`:''}</h3></div>
      <div class="nbody">
        ${added.length?`<div class="nlist"><table><thead><tr><th>Serial No.</th><th>Number</th></tr></thead><tbody>${rows(added)}</tbody></table></div>
        <div class="nmsg">Write each number on the box where you keep that SIM.</div>`:''}
        ${dups.length?`<div class="nsub">Already in your list (not added again):</div><div class="nlist"><table><tbody>${rows(dups)}</tbody></table></div>`:''}
        ${ackBlock(added.length?'I have noted these IDs':'OK, got it')}
      </div>`);
  }
  function showDup(ex){
    openNote('dup', `
      <div class="nhead warn"><div class="ncheck">!</div><h3 id="noteTitle">This number already exists</h3><p>Nothing was added. Here is the SIM that is already in your list:</p></div>
      <div class="nbody">
        <div class="dupcard">
          <div class="ids"><b style="color:#334155">${esc(ex.sid||'')}</b><b class="pid ${ex.pid?ex.pid[0]:''}" style="font-size:32px">${ex.pid?esc(ex.pid):'<span class="nopid" style="font-size:16px">no type ID</span>'}</b></div>
          <div class="num">${esc(ex.number)}</div>
          <div>${esc(PL[ex.purpose]||'Unknown')}${ex.name?' • '+esc(ex.name):' • <span class="nopid">no client name</span>'}${ex.home?' • '+esc(ex.home):''}</div>
          ${ex.note?`<div class="hint">Note: ${esc(ex.note)}</div>`:''}
          <div class="hint">Added ${esc(fmtDate(ex.createdAt))}${ex.given?' • ✔ Given '+esc(fmtDate(ex.givenAt)):' • In stock'}</div>
        </div>
        <div class="nbtns"><button type="button" data-nact="show">Show in list</button><button type="button" class="sec" data-nact="edit" data-n="${esc(ex.number)}">Edit this SIM</button><button type="button" class="sec" data-nact="close">Close</button></div>
      </div>`);
  }
  $('noteOv').addEventListener('click', e=>{
    const b = e.target.closest('button[data-nact]'); if(!b) return;
    const a = b.dataset.nact;
    if(a==='edit'){ const s = sims.find(x=>x.number===b.dataset.n); closeNote(); if(s) openEdit(s); }
    else if(a==='show'){ closeNote(); window.scrollTo({top:0, behavior:'smooth'}); }
    else closeNote();
  });
  document.addEventListener('keydown', e=>{
    if($('noteOv').hidden) return;
    if(e.key==='Escape'){ closeNote(); return; }
    if(e.key==='Enter'){ const ack = $('noteAck'); if(ack){ e.preventDefault(); confirmNote(); } }
  });

  // ---------- init ----------
  load(); loadWanted(); render(); renderWanted(); showBackupInfo();
  window.SIM_MANAGER_BRIDGE = {
    getData(){ return JSON.parse(JSON.stringify({sims, wanted, counters:meta.counters||{T:0,M:0,O:0,S:0}})); },
    showMessage(message,ms){ toast(message,ms||9000); },
    selectUserScope(uid){
      const scope = String(uid||'').replace(/[^a-zA-Z0-9_-]/g,'');
      if(!scope) throw new Error('Firebase user scope is missing');
      const next = {
        key: `simManagerData_v1_${scope}`,
        meta: `simManagerMeta_v1_${scope}`,
        wanted: `simManagerWanted_v1_${scope}`
      };
      // Move the old single-user browser cache only once, to the first signed-in UID.
      const hasScoped = localStorage.getItem(next.key)!==null || localStorage.getItem(next.meta)!==null || localStorage.getItem(next.wanted)!==null;
      if(!hasScoped){
        const legacy = {
          key: localStorage.getItem('simManagerData_v1'),
          meta: localStorage.getItem('simManagerMeta_v1'),
          wanted: localStorage.getItem('simManagerWanted_v1')
        };
        if(legacy.key!==null || legacy.meta!==null || legacy.wanted!==null){
          if(legacy.key!==null) localStorage.setItem(next.key,legacy.key);
          if(legacy.meta!==null) localStorage.setItem(next.meta,legacy.meta);
          if(legacy.wanted!==null) localStorage.setItem(next.wanted,legacy.wanted);
          localStorage.removeItem('simManagerData_v1');
          localStorage.removeItem('simManagerMeta_v1');
          localStorage.removeItem('simManagerWanted_v1');
        }
      }
      KEY=next.key; META=next.meta; WKEY=next.wanted;
      sims=[]; wanted=[]; meta={lastBackup:null,counters:{T:0,M:0,O:0,S:0}};
      load(); loadWanted(); render(); renderWanted(); showBackupInfo(); updateAddHint();
    },
    clearUserState(){
      sims=[]; wanted=[]; meta={lastBackup:null,counters:{T:0,M:0,O:0,S:0}};
      render(); renderWanted(); showBackupInfo(); updateAddHint();
    },
    applyRemote(data){
      sims = Array.isArray(data.sims) ? JSON.parse(JSON.stringify(data.sims)) : [];
      wanted = Array.isArray(data.wanted) ? JSON.parse(JSON.stringify(data.wanted)) : [];
      meta.counters = Object.assign({T:0,M:0,O:0,S:0}, data.counters||{});
      try{ localStorage.setItem(KEY, JSON.stringify(sims)); localStorage.setItem(WKEY, JSON.stringify(wanted)); localStorage.setItem(META, JSON.stringify(meta)); }catch(e){}
      render(); renderWanted(); showBackupInfo(); updateAddHint();
    }
  };
  $('fNum').focus();
})();
