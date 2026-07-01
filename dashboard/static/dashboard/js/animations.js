// ── GPL Dashboard Animations ────────────────────────────────────

// ── Entrance animations (staggered fade + slide-up) ─────────────

function animateEntrance(){
  // KPI cards
  document.querySelectorAll('.kpi-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = 'opacity .45s ease, transform .45s cubic-bezier(.22,1,.36,1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 60 + i * 60);
    });
  });

  // Panels
  document.querySelectorAll('.panel').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = 'opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 120 + i * 50);
    });
  });

  // Import banner
  const banner = document.querySelector('.import-banner');
  if(banner){
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-8px)';
    requestAnimationFrame(() => {
      setTimeout(() => {
        banner.style.transition = 'opacity .4s ease, transform .4s ease';
        banner.style.opacity = '1';
        banner.style.transform = 'translateY(0)';
      }, 30);
    });
  }
}

// ── Number countup for KPI values ──────────────────────────────

function animateCounters(){
  document.querySelectorAll('.kpi-value').forEach(el => {
    const raw = el.textContent.trim();
    // extract leading number (handles "87.5%", "42 days", "1,234", "12")
    const match = raw.match(/^([\d,]+\.?\d*)/);
    if(!match) return;
    const numStr = match[1].replace(/,/g,'');
    const num = parseFloat(numStr);
    if(isNaN(num) || num === 0) return;
    const suffix = raw.slice(match[0].length);   // e.g. "%" or " days"
    const hasDecimal = numStr.includes('.');
    const decimals = hasDecimal ? (numStr.split('.')[1]||'').length : 0;
    const duration = Math.min(1200, 400 + num * 0.5);
    const start = performance.now();

    function tick(now){
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = num * eased;
      el.textContent = (hasDecimal ? current.toFixed(decimals) : Math.floor(current).toLocaleString()) + suffix;
      if(progress < 1) requestAnimationFrame(tick);
      else el.textContent = (hasDecimal ? num.toFixed(decimals) : num.toLocaleString()) + suffix;
    }
    requestAnimationFrame(tick);
  });
}

// ── Button ripple ───────────────────────────────────────────────

function initRipple(){
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if(!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ── Modal animations ────────────────────────────────────────────

function initModalAnimations(){
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if(m.attributeName === 'class'){
          const modal = overlay.querySelector('.modal');
          if(!modal) return;
          if(overlay.classList.contains('open')){
            modal.style.opacity = '0';
            modal.style.transform = 'translateY(-16px) scale(.97)';
            modal.style.transition = 'none';
            requestAnimationFrame(() => {
              setTimeout(() => {
                modal.style.transition = 'opacity .28s ease, transform .28s cubic-bezier(.34,1.3,.64,1)';
                modal.style.opacity = '1';
                modal.style.transform = 'translateY(0) scale(1)';
              }, 10);
            });
          }
        }
      });
    });
    observer.observe(overlay, { attributes: true });
  });
}

// ── Table row entrance ──────────────────────────────────────────

function animateTableRows(){
  document.querySelectorAll('tbody tr').forEach((row, i) => {
    row.style.opacity = '0';
    row.style.transform = 'translateX(-8px)';
    setTimeout(() => {
      row.style.transition = 'opacity .3s ease, transform .3s ease';
      row.style.opacity = '1';
      row.style.transform = 'translateX(0)';
    }, 200 + i * 18);
  });
}

// ── Topbar title typewriter on project switch ───────────────────

function animateTitle(el){
  if(!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  el.style.transition = 'opacity .3s ease, transform .3s ease';
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 40);
  });
}

// ── Run all on page render ──────────────────────────────────────

function runPageAnimations(){
  animateEntrance();
  animateCounters();
  animateTableRows();
  animateTitle(document.getElementById('tbTitle'));
}

// ── Init (once, on load) ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initRipple();
  initModalAnimations();
});
