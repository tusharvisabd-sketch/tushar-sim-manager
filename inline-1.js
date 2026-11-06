
/* Motion + mobile-nav layer. Reads the DOM only; never touches saved data. */
(function(){
  const $=id=>document.getElementById(id);
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  // 1) tap pulse + light haptic
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest('button,.chip,.stat.click'); if(!b||b.disabled) return;
    const s=document.createElement('span'); s.className='tap'; s.style.left=e.clientX+'px'; s.style.top=e.clientY+'px';
    document.body.appendChild(s); setTimeout(()=>s.remove(),600);
    if(navigator.vibrate&&e.pointerType==='touch'){ try{navigator.vibrate(8)}catch(_){} }
  },{passive:true});
  // 2) stat counters roll to their new value
  const bs=[...document.querySelectorAll('.stat b')];
  const run=()=>bs.forEach(b=>{
    if(b._anim) return; const to=+b.textContent; if(isNaN(to)||to===b._v) return;
    const from=b._v||0; b._v=to;
    if(reduce||from===to){ return; }
    b._anim=1; b.classList.add('bump'); const t0=performance.now(), d=650;
    const step=t=>{ const k=Math.min(1,(t-t0)/d), e=1-Math.pow(1-k,3); b.textContent=Math.round(from+(to-from)*e);
      if(k<1) requestAnimationFrame(step); else { b.textContent=to; b._anim=0; b.classList.remove('bump'); } };
    requestAnimationFrame(step);
  });
  bs.forEach(b=>b._v=0); run();
  const mo=new MutationObserver(run); bs.forEach(b=>mo.observe(b,{childList:true,characterData:true,subtree:true}));
  // 3) table rows: staggered entrance on load, highlight for newly added rows
  const tb=$('tbody'), seen=new Set(); let first=true;
  const rows=()=>{ const rs=[...tb.querySelectorAll('tr[data-id]')]; let i=0;
    rs.forEach(r=>{ const id=r.dataset.id; if(seen.has(id)) return; seen.add(id);
      if(first){ if(i<14){ r.style.setProperty('--d',(i*35)+'ms'); r.classList.add('fx-in'); } i++; } else r.classList.add('fx-new'); });
    if(rs.length) first=false; };
  rows(); new MutationObserver(rows).observe(tb,{childList:true});
  // 4) panels pop in when they first appear
  ['idBanner','simPanel','wantPanel'].forEach(id=>{ const el=$(id); let had=false;
    new MutationObserver(()=>{ const has=!!el.firstElementChild; if(has&&!had) el.firstElementChild.classList.add('fx-pop'); had=has; }).observe(el,{childList:true}); });
  // Bottom navigation is static markup and is wired directly in the main app scope.
  // This avoids cross-IIFE callback failures and guarantees all four tabs stay functional.

})();
