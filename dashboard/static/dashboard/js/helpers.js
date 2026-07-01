function closeModal(id){
  document.getElementById(id).classList.remove('open');
}

function showToast(icon, msg, type='green'){
  const t = document.getElementById('toast');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastMsg').textContent = msg;
  t.style.borderColor = type==='green' ? 'var(--green)' : type==='red' ? 'var(--red)' : 'var(--blue)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3200);
}

function kpi(label, value, sub, accent, icon){
  return `<div class="kpi-card" style="--accent:${accent}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-sub">${sub}</div>
    <div class="kpi-icon">${icon}</div>
  </div>`;
}

function fmt(v, dec=0){
  if(v==null || v==='') return '—';
  const n = +v;
  return isNaN(n) ? String(v) : n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});
}

function fmtBDT(v){
  const n = +v || 0;
  if(n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if(n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
}

function fmtDate(d){
  if(!d) return '—';
  try{ return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
  catch(e){ return d; }
}
