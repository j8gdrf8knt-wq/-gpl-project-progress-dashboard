// ── Add / Edit / Delete Projects ───────────────────────────────

function openAddProject(){
  document.getElementById('projFormTitle').textContent = 'Add Project';
  document.getElementById('pfId').value = '';
  document.getElementById('pfName').value = '';
  document.getElementById('pfClient').value = '';
  document.getElementById('pfStart').value = '';
  document.getElementById('pfTarget').value = '';
  document.getElementById('pfDeleteBtn').style.display = 'none';
  document.getElementById('projFormOverlay').classList.add('open');
}

function openEditProject(id){
  const p = PROJECTS[id];
  if(!p) return;
  document.getElementById('projFormTitle').textContent = 'Edit Project';
  document.getElementById('pfId').value = id;
  document.getElementById('pfName').value = p.name || '';
  document.getElementById('pfClient').value = p.client || '';
  document.getElementById('pfStart').value = p.startDate || '';
  document.getElementById('pfTarget').value = p.targetDate || '';
  document.getElementById('pfDeleteBtn').style.display = 'inline-flex';
  closeModal('manageOverlay');
  document.getElementById('projFormOverlay').classList.add('open');
}

function saveProject(){
  const id = document.getElementById('pfId').value;
  const name = document.getElementById('pfName').value.trim();
  if(!name){ showToast('✕','Project name is required','red'); return; }
  if(id && PROJECTS[id]){
    Object.assign(PROJECTS[id],{
      name,
      client: document.getElementById('pfClient').value,
      startDate: document.getElementById('pfStart').value,
      targetDate: document.getElementById('pfTarget').value
    });
  } else {
    const newId = 'proj_' + Date.now();
    PROJECTS[newId] = {
      id: newId, name,
      client: document.getElementById('pfClient').value,
      startDate: document.getElementById('pfStart').value,
      targetDate: document.getElementById('pfTarget').value,
      activities: [], items: []
    };
    currentProjectId = newId;
  }
  persist();
  closeModal('projFormOverlay');
  render();
  showToast('✓','Project saved','green');
}

function deleteCurrentProject(){
  const id = document.getElementById('pfId').value;
  if(!id || !PROJECTS[id]) return;
  if(!confirm('Delete project "'+PROJECTS[id].name+'"?')) return;
  apiFetch('/api/projects/delete/'+id+'/', {method:'POST'});
  delete PROJECTS[id];
  currentProjectId = Object.keys(PROJECTS)[0] || '';
  closeModal('projFormOverlay');
  render();
  showToast('✓','Project deleted','green');
}

function openManageProjects(){
  document.getElementById('manageProjList').innerHTML = Object.values(PROJECTS).map(p=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:13px">${p.name}
          ${p.id===currentProjectId?'<span class="badge badge-green" style="margin-left:6px">Active</span>':''}
        </div>
        <div style="font-size:11px;color:var(--text2)">${p.client||''}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="closeModal('manageOverlay');switchProject('${p.id}')">Switch</button>
        <button class="btn btn-blue btn-sm" onclick="openEditProject('${p.id}')">⚙ Edit</button>
      </div>
    </div>`).join('');
  document.getElementById('manageOverlay').classList.add('open');
}
