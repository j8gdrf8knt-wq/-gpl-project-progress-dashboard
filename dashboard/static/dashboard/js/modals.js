// ── Default activity template ──────────────────────────────────

const DEFAULT_ACTIVITIES = [
  {name:'Earthing',                                    unit:'Nos'},
  {name:'Marking & Layout',                            unit:'Nos'},
  {name:'Chipping, Drilling, Bolting',                 unit:'Nos'},
  {name:'CC Casting',                                  unit:'Nos'},
  {name:'Plastering',                                  unit:'Nos'},
  {name:'Unloading',                                   unit:'kWp'},
  {name:'Lifting',                                     unit:'kWp'},
  {name:'Structure Installation, Alignment',           unit:'Wp'},
  {name:'Panel Installation, Alignment',               unit:'Wp'},
  {name:'Inverter Installation',                       unit:'Nos'},
  {name:'DB Installation',                             unit:'Nos'},
  {name:'Cable Tray Installation',                     unit:'Wp'},
  {name:'DC Cable Laying & Termination',               unit:'M'},
  {name:'AC Cable Laying including Fixing, Termination',unit:'M'},
  {name:'Commissioning',                               unit:'Wp'},
  {name:'EMS Integration',                             unit:'Nos'},
];

// ── Edit Data (BOQ only, for backward compatibility) ──────────────

function openEditData(){
  const p = PROJECTS[currentProjectId];
  if(!p) return;
  if(currentView === 'progress') openLogWork(p);
  else openEditBOQ(p);
}

// ── Setup Project (one-time) ───────────────────────────────────

function openSetupProject(p){
  document.getElementById('setupActivityBody').innerHTML = (p.activities || []).map((a,i)=>
    `<tr><td><input value="${a.name||''}" data-f="name" style="min-width:140px"></td>
        <td><input value="${a.unit||''}" data-f="unit" style="width:60px"></td>
        <td><input value="${a.qty||0}" data-f="qty" type="number" step="0.01" style="width:70px"></td>
        <td><input value="${a.weightPct||0}" data-f="weightPct" type="number" step="0.01" style="width:70px"></td>
        <td><input value="${a.manDayRate||0}" data-f="manDayRate" type="number" step="0.01" style="width:80px"></td>
        <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td></tr>`
  ).join('');
  document.getElementById('setupAreaBody').innerHTML = (p.areas || []).map((ar,i)=>
    `<tr><td><input value="${ar.name||''}" data-f="name" style="min-width:140px"></td>
        <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td></tr>`
  ).join('');
  document.getElementById('setupProjOverlay').classList.add('open');
}

function addSetupActivityRow(){
  const tbody = document.getElementById('setupActivityBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><input value="New Activity" data-f="name" style="min-width:140px"></td>
                  <td><input value="Nos" data-f="unit" style="width:60px"></td>
                  <td><input value="0" data-f="qty" type="number" step="0.01" style="width:70px"></td>
                  <td><input value="0" data-f="weightPct" type="number" step="0.01" style="width:70px"></td>
                  <td><input value="0" data-f="manDayRate" type="number" step="0.01" style="width:80px"></td>
                  <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
}

function addSetupAreaRow(){
  const tbody = document.getElementById('setupAreaBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><input value="New Area" data-f="name" style="min-width:140px"></td>
                  <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
}

function loadTemplateActivities(){
  const tbody = document.getElementById('setupActivityBody');
  if(tbody && tbody.querySelectorAll('tr').length > 0){
    if(!confirm('Replace all activities with the 16-activity solar template?')) return;
  }
  const target = tbody || document.getElementById('editProgressBody');
  target.innerHTML = DEFAULT_ACTIVITIES.map(d=>
    `<tr><td><input value="${d.name}" data-f="name" style="min-width:140px"></td>
        <td><input value="${d.unit}" data-f="unit" style="width:60px"></td>
        <td><input value="0" data-f="qty" type="number" step="0.01" style="width:70px"></td>
        <td><input value="0" data-f="weightPct" type="number" step="0.01" style="width:70px"></td>
        <td><input value="0" data-f="manDayRate" type="number" step="0.01" style="width:80px"></td>
        <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td></tr>`
  ).join('');
}

function applySetupProject(){
  const p = PROJECTS[currentProjectId];

  // Collect activities
  const activities = [];
  document.querySelectorAll('#setupActivityBody tr').forEach((tr,i)=>{
    const name = tr.querySelector('[data-f="name"]')?.value?.trim();
    if(!name) return;
    activities.push({
      name,
      unit: tr.querySelector('[data-f="unit"]')?.value || '',
      qty: +tr.querySelector('[data-f="qty"]')?.value || 0,
      weightPct: +tr.querySelector('[data-f="weightPct"]')?.value || 0,
      manDayRate: +tr.querySelector('[data-f="manDayRate"]')?.value || 0
    });
  });

  // Collect areas
  const areas = [];
  document.querySelectorAll('#setupAreaBody tr').forEach((tr,i)=>{
    const name = tr.querySelector('[data-f="name"]')?.value?.trim();
    if(!name) return;
    areas.push({ name });
  });

  if(activities.length === 0 || areas.length === 0){
    showToast('✕','Need at least one activity and one area','red');
    return;
  }

  p.activities = activities;
  p.areas = areas;
  p.logs = [];

  persist();
  // Reload project data from backend to get database IDs
  setTimeout(() => {
    loadProjects();
    closeModal('setupProjOverlay');
    showToast('✓','Project setup complete. Now log daily work!','green');
  }, 500);
}

// ── Log Daily Work ────────────────────────────────────────────

function openLogWork(p){
  // Set today's date
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('lwDate').value = today;

  // Populate areas
  const areaSelect = document.getElementById('lwArea');
  areaSelect.innerHTML = '<option value="">— Select —</option>' +
    (p.areas || []).map(ar => `<option value="${ar.id || ar.name}">${ar.name}</option>`).join('');

  // Populate activities
  const actSelect = document.getElementById('lwActivity');
  actSelect.innerHTML = '<option value="">— Select —</option>' +
    (p.activities || []).map(a => `<option value="${a.id || a.name}">${a.name}</option>`).join('');

  document.getElementById('lwQty').value = '';
  document.getElementById('lwMsg').style.display = 'none';

  document.getElementById('logWorkOverlay').classList.add('open');
}

function submitDailyLog(){
  const p = PROJECTS[currentProjectId];
  const date = document.getElementById('lwDate').value;
  const areaVal = document.getElementById('lwArea').value;
  const actVal = document.getElementById('lwActivity').value;
  const qty = +document.getElementById('lwQty').value;

  if(!date || !areaVal || !actVal || qty <= 0){
    showToast('✕','All fields required (Qty > 0)','red');
    return;
  }

  // Find area and activity
  let areaId, actId;
  const area = (p.areas || []).find(ar => (ar.id || ar.name) === areaVal);
  const activity = (p.activities || []).find(a => (a.id || a.name) === actVal);

  if(!area || !activity){
    showToast('✕','Area or Activity not found','red');
    return;
  }

  areaId = area.id || area.name;
  actId = activity.id || activity.name;

  // Create log entry
  if(!p.logs) p.logs = [];
  p.logs.push({
    date, area_id: areaId, activity_id: actId, qty_done: qty
  });

  // Show confirmation
  const msg = `Added: ${activity.name} × ${qty} ${activity.unit} on ${date}`;
  document.getElementById('lwMsg').textContent = '✓ ' + msg;
  document.getElementById('lwMsg').style.display = 'block';
  document.getElementById('lwMsg').style.background = 'var(--green-glow)';

  // Clear inputs
  document.getElementById('lwQty').value = '';

  persist();

  setTimeout(() => {
    loadProjects();
    closeModal('logWorkOverlay');
    showToast('✓','Work logged & dashboard updated','green');
  }, 500);
}

// ── BOQ Edit ───────────────────────────────────────────────────

function openEditBOQ(p){
  const items = p.items || [];
  document.getElementById('editBOQSub').textContent = p.name;
  document.getElementById('editBOQBody').innerHTML = items.map((item,i)=>`
    <tr data-idx="${i}">
      <td><input value="${item.sl||i+1}" data-f="sl" style="width:35px"></td>
      <td><input value="${item.desc||''}" data-f="desc" style="width:200px"></td>
      <td><input value="${item.qty||0}" data-f="qty" style="width:50px"></td>
      <td><input value="${item.unit||''}" data-f="unit" style="width:45px"></td>
      <td><input value="${item.unitPrice||0}" data-f="unitPrice" style="width:70px"></td>
      <td><input value="${item.totalPrice||0}" data-f="totalPrice" style="width:80px"></td>
      <td><input value="${item.totalCost||0}" data-f="totalCost" style="width:80px"></td>
      <td><input value="${item.offerPrice||0}" data-f="offerPrice" style="width:80px"></td>
      <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td>
    </tr>`).join('');
  document.getElementById('editBOQOverlay').classList.add('open');
}

function addBOQRow(){
  const tbody = document.getElementById('editBOQBody');
  const count = tbody.querySelectorAll('tr').length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input value="${count}" data-f="sl" style="width:35px"></td>
    <td><input value="New Item" data-f="desc" style="width:200px"></td>
    <td><input value="1" data-f="qty" style="width:50px"></td>
    <td><input value="Lot" data-f="unit" style="width:45px"></td>
    <td><input value="0" data-f="unitPrice" style="width:70px"></td>
    <td><input value="0" data-f="totalPrice" style="width:80px"></td>
    <td><input value="0" data-f="totalCost" style="width:80px"></td>
    <td><input value="0" data-f="offerPrice" style="width:80px"></td>
    <td><button class="btn btn-red btn-xs" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
}

function applyBOQEdit(){
  const rows = document.querySelectorAll('#editBOQBody tr');
  const items = Array.from(rows).map(tr=>{
    const get = f => tr.querySelector(`[data-f="${f}"]`)?.value || '';
    return {
      sl:+get('sl'), desc:get('desc'), qty:+get('qty'), unit:get('unit'),
      unitPrice:+get('unitPrice'), totalPrice:+get('totalPrice'),
      totalCost:+get('totalCost'), offerPrice:+get('offerPrice')
    };
  }).filter(i=>i.desc.trim());
  PROJECTS[currentProjectId].items = items;
  persist(); closeModal('editBOQOverlay'); destroyCharts(); render();
  showToast('✓','BOQ data saved successfully','green');
}

// ── Expense Logger ──────────────────────────────────────────

function openExpenseLogger(){
  const p = PROJECTS[currentProjectId];
  if(!p) return;
  const categories = [
    'Foreign Item Purchase',
    'Local Item Purchase',
    'Installation & Commissioning',
    'Conveyance, Transport & Logistics',
    'Fooding',
    'Hotel Rent',
    'Daily Allowance',
    'Others Expenses'
  ];
  document.getElementById('expenseLoggerId').value = '';
  document.getElementById('expDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('expAmount').value = '';
  document.getElementById('expDescription').value = '';
  document.getElementById('expRemarks').value = '';
  document.getElementById('expCustomCategory').value = '';
  document.getElementById('customCategoryRow').style.display = 'none';
  document.getElementById('expCategory').innerHTML = '<option value="">— Select —</option>' +
    categories.map(c=>`<option value="${c}">${c}</option>`).join('');
  document.getElementById('expenseLoggerOverlay').classList.add('open');
}

function toggleCustomCategory(){
  const row = document.getElementById('customCategoryRow');
  row.style.display = row.style.display === 'none' ? '' : 'none';
  if(row.style.display !== 'none'){
    document.getElementById('expCustomCategory').focus();
  }
}

function submitExpense(){
  const expenseId = document.getElementById('expenseLoggerId').value;
  const date = document.getElementById('expDate').value;
  let category = document.getElementById('expCategory').value;
  const customCategory = document.getElementById('expCustomCategory').value.trim();
  const description = document.getElementById('expDescription').value;
  const amount = +document.getElementById('expAmount').value;
  const remarks = document.getElementById('expRemarks').value;

  if(customCategory){
    category = customCategory;
  }

  if(!date || !category || !description || amount <= 0){
    showToast('✕','All fields required, amount > 0','red');
    return;
  }

  const p = PROJECTS[currentProjectId];
  if(!p.expenses) p.expenses = [];

  if(expenseId){
    // Update existing expense
    const idx = p.expenses.findIndex(e=>e.id == expenseId);
    if(idx >= 0){
      p.expenses[idx] = {id: expenseId, date, category, description, amount, remarks};
    }

    fetch(`/api/projects/${currentProjectId}/expenses/${expenseId}/update/`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({date, category, description, amount, remarks})
    }).then(r=>{
      if(r.ok){
        closeExpenseLogger();
        destroyCharts();
        render();
        showToast('✓','Expense updated successfully','green');
      }
    });
  } else {
    // Create new expense
    p.expenses.push({date, category, description, amount, remarks});

    fetch(`/api/projects/${currentProjectId}/expenses/save/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({date, category, description, amount, remarks})
    }).then(r=>r.json()).then(data=>{
      closeExpenseLogger();
      destroyCharts();
      render();
      showToast('✓','Expense logged successfully','green');
    });
  }
}

function closeExpenseLogger(){
  closeModal('expenseLoggerOverlay');
  document.getElementById('expDate').value = '';
  document.getElementById('expCategory').value = '';
  document.getElementById('expDescription').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expRemarks').value = '';
  document.getElementById('expCustomCategory').value = '';
  document.getElementById('customCategoryRow').style.display = 'none';
  document.getElementById('expenseLoggerId').value = '';
}

function editExpense(expenseId){
  const p = PROJECTS[currentProjectId];
  const expense = p.expenses.find(e=>e.id === expenseId);
  if(!expense) return;

  const categories = [
    'Foreign Item Purchase',
    'Local Item Purchase',
    'Installation & Commissioning',
    'Conveyance, Transport & Logistics',
    'Fooding',
    'Hotel Rent',
    'Daily Allowance',
    'Others Expenses'
  ];

  document.getElementById('expenseLoggerId').value = expenseId;
  document.getElementById('expDate').value = expense.date;
  document.getElementById('expAmount').value = expense.amount;
  document.getElementById('expDescription').value = expense.description;
  document.getElementById('expRemarks').value = expense.remarks;

  const catSelect = document.getElementById('expCategory');
  catSelect.innerHTML = '<option value="">— Select or add new —</option>' +
    categories.map(c=>`<option value="${c}" ${c===expense.category?'selected':''}>${c}</option>`).join('');

  if(!categories.includes(expense.category)){
    document.getElementById('expCustomCategory').value = expense.category;
    document.getElementById('customCategoryRow').style.display = '';
  } else {
    document.getElementById('expCustomCategory').value = '';
    document.getElementById('customCategoryRow').style.display = 'none';
  }

  document.getElementById('expenseLoggerOverlay').classList.add('open');
}

function deleteExpense(expenseId){
  if(!confirm('Are you sure you want to delete this expense?')) return;

  fetch(`/api/projects/${currentProjectId}/expenses/${expenseId}/delete/`, {
    method: 'DELETE'
  }).then(r=>{
    if(r.ok){
      const p = PROJECTS[currentProjectId];
      p.expenses = p.expenses.filter(e=>e.id !== expenseId);
      destroyCharts();
      render();
      showToast('✓','Expense deleted','green');
    } else {
      showToast('✕','Failed to delete expense','red');
    }
  }).catch(e=>{
    showToast('✕','Error deleting expense','red');
  });
}

// ════════════════════════════════════════════════════════════
// BULK EXPENSE ENTRY
// ════════════════════════════════════════════════════════════

function openBulkExpenseModal(){
  document.getElementById('bulkExpenseBody').innerHTML = '';
  for(let i=0;i<5;i++) addBulkExpenseRow();
  document.getElementById('bulkExpenseOverlay').classList.add('open');
}

function closeBulkExpenseModal(){
  closeModal('bulkExpenseOverlay');
}

function addBulkExpenseRow(){
  const tbody = document.getElementById('bulkExpenseBody');
  const rowIdx = tbody.querySelectorAll('tr').length;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="date" class="bulk-exp-date" value="${new Date().toISOString().slice(0,10)}" data-field="date"></td>
    <td><select class="bulk-exp-category" data-field="category">
      <option value="">— Select —</option>
      <option value="Foreign Item Purchase">Foreign Item Purchase</option>
      <option value="Local Item Purchase">Local Item Purchase</option>
      <option value="Installation & Commissioning">Installation & Commissioning</option>
      <option value="Conveyance, Transport & Logistics">Conveyance, Transport & Logistics</option>
      <option value="Fooding">Fooding</option>
      <option value="Hotel Rent">Hotel Rent</option>
      <option value="Daily Allowance">Daily Allowance</option>
      <option value="Others Expenses">Others Expenses</option>
    </select></td>
    <td><input type="text" class="bulk-exp-desc" placeholder="Description" data-field="description"></td>
    <td><input type="number" class="bulk-exp-amount" placeholder="0.00" step="0.01" min="0" data-field="amount"></td>
    <td><input type="text" class="bulk-exp-remarks" placeholder="Optional" data-field="remarks"></td>
    <td style="text-align:center"><button class="btn btn-outline btn-xs" onclick="this.closest('tr').remove()" type="button">✕</button></td>
  `;
  tbody.appendChild(tr);
  updateBulkExpenseCount();
}

function removeBulkExpenseRow(){
  const tbody = document.getElementById('bulkExpenseBody');
  const rows = tbody.querySelectorAll('tr');
  if(rows.length > 1) rows[rows.length-1].remove();
  updateBulkExpenseCount();
}

function updateBulkExpenseCount(){
  const tbody = document.getElementById('bulkExpenseBody');
  const rows = tbody.querySelectorAll('tr');
  document.getElementById('bulkExpenseRowCount').textContent = rows.length;

  let validCount = 0;
  rows.forEach(row=>{
    const date = row.querySelector('.bulk-exp-date').value;
    const category = row.querySelector('.bulk-exp-category').value;
    const desc = row.querySelector('.bulk-exp-desc').value.trim();
    const amount = row.querySelector('.bulk-exp-amount').value;
    if(date && category && desc && amount && +amount > 0) validCount++;
  });
  document.getElementById('bulkExpenseValidCount').textContent = validCount;
}

function submitBulkExpenses(){
  const tbody = document.getElementById('bulkExpenseBody');
  const rows = tbody.querySelectorAll('tr');
  const expenses = [];

  rows.forEach((row,idx)=>{
    const date = row.querySelector('.bulk-exp-date').value;
    const category = row.querySelector('.bulk-exp-category').value;
    const desc = row.querySelector('.bulk-exp-desc').value.trim();
    const amount = row.querySelector('.bulk-exp-amount').value;
    const remarks = row.querySelector('.bulk-exp-remarks').value.trim();

    if(date && category && desc && amount && +amount > 0){
      expenses.push({date, category, description: desc, amount: +amount, remarks});
    }
  });

  if(!expenses.length){
    showToast('✕','No valid expenses to save','red');
    return;
  }

  fetch(`/api/projects/${currentProjectId}/expenses/bulk/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({expenses})
  }).then(r=>r.json()).then(data=>{
    if(data.created){
      const p = PROJECTS[currentProjectId];
      if(!p.expenses) p.expenses = [];
      expenses.forEach(e=>p.expenses.unshift({...e}));
      closeBulkExpenseModal();
      destroyCharts();
      render();
      showToast('✓',`Saved ${data.created} expenses${data.errors.length?', '+data.errors.length+' errors':''}`,data.errors.length?'amber':'green');
    } else {
      showToast('✕','Failed to save expenses','red');
    }
  }).catch(e=>{
    showToast('✕','Error saving expenses','red');
  });
}

// ════════════════════════════════════════════════════════════
// DAILY LOG ENTRY
// ════════════════════════════════════════════════════════════

function openAddLogModal(){
  const p = PROJECTS[currentProjectId];
  if(!p) return;

  // Populate areas
  const areaSelect = document.getElementById('lwArea');
  areaSelect.innerHTML = '<option value="">— Select —</option>' +
    (p.areas||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join('');

  // Populate activities
  const actSelect = document.getElementById('lwActivity');
  actSelect.innerHTML = '<option value="">— Select —</option>' +
    (p.activities||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join('');

  document.getElementById('lwDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('lwQty').value = '';
  document.getElementById('lwMsg').style.display = 'none';
  document.getElementById('logWorkOverlay').classList.add('open');
}

function openBulkLogModal(){
  const p = PROJECTS[currentProjectId];
  if(!p) return;

  document.getElementById('bulkLogBody').innerHTML = '';
  for(let i=0;i<5;i++) addBulkLogRow();
  document.getElementById('bulkLogOverlay').classList.add('open');
}

function closeBulkLogModal(){
  closeModal('bulkLogOverlay');
}

function addBulkLogRow(){
  const tbody = document.getElementById('bulkLogBody');
  const p = PROJECTS[currentProjectId];
  const actOptions = (p?.activities||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join('');

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="date" class="bulk-log-date" value="${new Date().toISOString().slice(0,10)}" data-field="date"></td>
    <td><select class="bulk-log-activity" data-field="activity">
      <option value="">— Select —</option>
      ${actOptions}
    </select></td>
    <td><input type="number" class="bulk-log-qty" placeholder="0.00" step="0.01" min="0" data-field="qty"></td>
    <td style="text-align:center"><button class="btn btn-outline btn-xs" onclick="this.closest('tr').remove()" type="button">✕</button></td>
  `;
  tbody.appendChild(tr);
  updateBulkLogCount();
}

function removeBulkLogRow(){
  const tbody = document.getElementById('bulkLogBody');
  const rows = tbody.querySelectorAll('tr');
  if(rows.length > 1) rows[rows.length-1].remove();
  updateBulkLogCount();
}

function updateBulkLogCount(){
  const tbody = document.getElementById('bulkLogBody');
  const rows = tbody.querySelectorAll('tr');
  document.getElementById('bulkLogRowCount').textContent = rows.length;

  let validCount = 0;
  rows.forEach(row=>{
    const date = row.querySelector('.bulk-log-date').value;
    const activity = row.querySelector('.bulk-log-activity').value;
    const qty = row.querySelector('.bulk-log-qty').value;
    if(date && activity && qty && +qty > 0) validCount++;
  });
  document.getElementById('bulkLogValidCount').textContent = validCount;
}

function submitBulkLogs(){
  const tbody = document.getElementById('bulkLogBody');
  const rows = tbody.querySelectorAll('tr');
  const logs = [];

  rows.forEach((row,idx)=>{
    const date = row.querySelector('.bulk-log-date').value;
    const activityId = row.querySelector('.bulk-log-activity').value;
    const qty = row.querySelector('.bulk-log-qty').value;

    if(date && activityId && qty && +qty > 0){
      logs.push({date, activity_id: activityId, qty_done: +qty});
    }
  });

  if(!logs.length){
    showToast('✕','No valid logs to save','red');
    return;
  }

  const p = PROJECTS[currentProjectId];
  if(!p.logs) p.logs = [];

  // Add logs to project state
  logs.forEach(log=>p.logs.unshift({...log, id: Math.random()}));

  closeBulkLogModal();
  destroyCharts();
  render();
  showToast('✓',`Saved ${logs.length} work logs`,'green');
}

function editLog(logId){
  showToast('ℹ','Edit feature coming soon','blue');
}

function deleteLog(logId){
  if(!confirm('Delete this work log entry?')) return;

  const p = PROJECTS[currentProjectId];
  p.logs = (p.logs||[]).filter(l=>l.id !== logId);

  destroyCharts();
  render();
  showToast('✓','Work log deleted','green');
}
