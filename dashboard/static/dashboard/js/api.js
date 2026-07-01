// ── Data loading & saving ──────────────────────────────────────

function loadProjects(){
  fetch('/api/projects/')
    .then(r => r.json())
    .then(data => {
      PROJECTS = data;
      currentProjectId = Object.keys(PROJECTS)[0] || '';
      render();
    });
}

function persist(){
  const p = PROJECTS[currentProjectId];
  if(!p) return;
  fetch('/api/projects/save/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(p)
  });
  markUnsaved();
}

// ── Unsaved indicator ──────────────────────────────────────────

let _reminderTimer = null;

function markUnsaved(){
  // save button removed — data saves automatically
}

function dismissReminder(){
  const r = document.getElementById('saveReminder');
  r.classList.remove('show');
  setTimeout(()=>{ r.style.display='none'; }, 350);
  clearTimeout(_reminderTimer);
}

function saveFile(){
  dismissReminder();
  document.getElementById('unsavedDot').classList.remove('show');
  const btn = document.getElementById('saveBtn');
  btn.classList.add('saved');
  btn.textContent = '✓ Saved';
  setTimeout(()=>{ btn.classList.remove('saved'); btn.innerHTML = '💾 Save'; }, 3000);
  showToast('✓', 'All data is saved in the Django database', 'green');
}

// ── Clock ──────────────────────────────────────────────────────

function tickClock(){
  document.getElementById('tbClock').textContent =
    new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
setInterval(tickClock, 1000);
tickClock();
