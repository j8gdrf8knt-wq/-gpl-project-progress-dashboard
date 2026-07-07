// ── Activity metrics computation ──────────────────────────────

function computeActivityMetrics(a, p){
  const qty = +a.qty || 0;
  const totalPresent = +a.totalPresent || 0;
  const todayAchiev = +a.todayAchiev || 0;
  const startDate = a.startDate;
  const reportDate = p.reportDate || new Date().toISOString().slice(0,10);
  const targetDate = p.targetDate;

  // Percentages
  const pctToday = qty > 0 ? (todayAchiev / qty * 100) : 0;
  const pctTotal = qty > 0 ? (totalPresent / qty * 100) : 0;
  const pctProject = pctTotal;

  // Days worked
  let daysWorked = 1;
  if(startDate && reportDate) {
    try {
      const start = new Date(startDate);
      const report = new Date(reportDate);
      daysWorked = Math.max(1, Math.floor((report - start) / (1000*60*60*24)) + 1);
    } catch(e) {}
  }

  // Average rate
  const avgRate = daysWorked > 0 ? totalPresent / daysWorked : 0;

  // Available days & required rate
  let availDays = 0;
  let reqRate = 0;
  if(targetDate && reportDate) {
    try {
      const target = new Date(targetDate);
      const report = new Date(reportDate);
      availDays = Math.max(0, Math.floor((target - report) / (1000*60*60*24)));
      const remaining = qty - totalPresent;
      reqRate = availDays > 0 ? remaining / availDays : 0;
    } catch(e) {}
  }

  // ECT
  const remaining = qty - totalPresent;
  const ect = avgRate > 0 ? remaining / avgRate : 0;

  return {
    pctToday, pctTotal, pctProject,
    daysWorked, avgRate, availDays, reqRate, ect,
    remaining
  };
}

// ── Chart defaults ─────────────────────────────────────────────

function setChartDefaults(){
  Chart.defaults.color = '#7e8da8';
  Chart.defaults.borderColor = '#1e3050';
  Chart.defaults.font.family = "'Inter',sans-serif";
}

function destroyCharts(){
  Object.values(chartInstances).forEach(c=>{ try{ c.destroy(); }catch(e){} });
  chartInstances = {};
}

// ── Project selector ───────────────────────────────────────────

function populateSelector(){
  const sel = document.getElementById('projSelect');
  sel.innerHTML = Object.values(PROJECTS).map(p=>
    `<option value="${p.id}" ${p.id===currentProjectId?'selected':''}>${p.name}</option>`
  ).join('');
}

function switchProject(id){
  currentProjectId = id;
  currentView = 'progress';
  destroyCharts();
  render();
}

function switchView(v){
  currentView = v;
  destroyCharts();
  render();
}

// ── Tab bar ────────────────────────────────────────────────────

function renderTabBar(hasProject){
  const bar = document.getElementById('viewTabBar');
  if(!hasProject){ bar.innerHTML = ''; return; }
  bar.innerHTML = `
    <div class="view-tabbar">
      <button class="view-tab ${currentView==='progress'?'active':''}" onclick="switchView('progress')">📊 Progress</button>
      <button class="view-tab ${currentView==='boq'?'active':''}" onclick="switchView('boq')">💰 Costing (BOQ)</button>
    </div>`;

  // Show/hide Setup button based on view
  const setupBtn = document.getElementById('setupBtn');
  if(setupBtn) setupBtn.style.display = currentView === 'progress' ? '' : 'none';
}

// ── Import banner ──────────────────────────────────────────────

function importBannerHTML(p){
  const viewLabel = currentView==='progress' ? 'Progress Tracking' : 'BOQ / Costing';
  return `
    <div class="import-banner">
      <span class="import-banner-label">📥 Data: <strong>${p.name}</strong> — ${viewLabel}</span>
      <button class="btn btn-outline btn-sm" onclick="downloadTemplate()">⬇ Template</button>
      <button class="btn btn-blue btn-sm" onclick="document.getElementById('xlInput').click()">📂 Import Excel</button>
      <button class="btn btn-outline btn-sm" onclick="toggleDropZone()">📋 Drop Zone</button>
    </div>
    <div class="drop-zone" id="dropZone"
      ondragover="event.preventDefault();document.getElementById('dropZone').classList.add('active')"
      ondragleave="document.getElementById('dropZone').classList.remove('active')"
      ondrop="handleDrop(event)">
      Drop your Excel (.xlsx) file here
    </div>`;
}

// ── Top-level render ───────────────────────────────────────────

function render(){
  const p = PROJECTS[currentProjectId];
  populateSelector();
  destroyCharts();
  const mc = document.getElementById('mainContent');
  if(!p){
    document.getElementById('tbTitle').textContent = 'GPL Power BI Dashboard';
    document.getElementById('tbSub').textContent = 'No projects yet';
    renderTabBar(false);
    mc.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:65vh;gap:24px;text-align:center">
        <div style="font-size:64px;opacity:.15">📊</div>
        <div>
          <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:8px">No projects yet</div>
          <div style="font-size:13px;color:var(--text2);max-width:360px;line-height:1.6">Create your first project to get started.</div>
        </div>
        <button class="btn btn-blue" onclick="openAddProject()" style="padding:11px 28px;font-size:13px">＋ Create First Project</button>
      </div>`;
    return;
  }
  document.getElementById('tbTitle').textContent = p.name;
  document.getElementById('tbSub').textContent = p.client || '';
  renderTabBar(true);
  mc.innerHTML = '';
  if(currentView === 'progress') renderProgress(mc, p);
  else renderBOQ(mc, p);
  if(typeof runPageAnimations === 'function') requestAnimationFrame(runPageAnimations);
}

// ── Progress view ──────────────────────────────────────────────

function renderProgress(mc, p){
  const acts = p.activities || [];

  // Compute metrics for all activities
  const actMetrics = acts.map(a => computeActivityMetrics(a, p));

  const totalQty = acts.reduce((s,a)=>s+(+a.qty||0),0);
  const totalPresent = acts.reduce((s,a)=>s+(+a.totalPresent||0),0);
  const totalPct = totalQty>0 ? (totalPresent/totalQty*100).toFixed(2) : '0.00';
  const todayRatePct = Math.min(100, actMetrics.reduce((s,m)=>s+m.pctToday,0)).toFixed(2);

  const todayD = new Date();
  const target = new Date(p.targetDate);
  const daysLeft = Math.max(0,Math.ceil((target-todayD)/(1000*60*60*24)));
  const startD = new Date(p.startDate);
  const totalDays = Math.ceil((target-startD)/(1000*60*60*24));
  const daysElapsed = Math.max(0,Math.ceil((todayD-startD)/(1000*60*60*24)));
  const timePct = totalDays>0 ? Math.min(100,(daysElapsed/totalDays*100)).toFixed(0) : 0;

  // Hardcode manpower as not available in log-based model
  const manpowerDeployed = 0;
  const manpowerRequired = 0;

  // Urgency coloring for Days Remaining
  let daysRemainingAccent = 'var(--green)';
  if(daysLeft <= 3) daysRemainingAccent = 'var(--red)';
  else if(daysLeft <= 7) daysRemainingAccent = 'var(--amber)';

  // Identify at-risk activities (0% progress or behind schedule)
  const atRiskActivities = actMetrics.filter(m => {
    const behindSchedule = m.pctTotal < (totalDays > 0 ? (daysElapsed / totalDays * 100) : 0);
    return m.pctTotal === 0 || behindSchedule;
  });

  mc.innerHTML = `
    ${importBannerHTML(p)}
    <div class="kpi-row">
      ${kpi('Overall % Complete', totalPct+'%','Sum of % Project Achievement','var(--blue)','📊')}
      ${kpi("Today's Rate %", todayRatePct+'%',"Sum of % Today's Achievement","var(--green)",'⚡')}
      ${kpi('Days Remaining', daysLeft+' days','Target: '+fmtDate(p.targetDate),daysRemainingAccent,'📅')}
      ${kpi('Manpower Today', manpowerDeployed,'vs '+manpowerRequired+' required','var(--purple)','👷')}
      ${kpi('Activities', acts.length,'Total tracked items','var(--blue)','📋')}
    </div>
    ${atRiskActivities.length > 0 ? `
    <div class="panel" style="border-left:4px solid var(--red)">
      <div class="panel-header"><h2 style="color:var(--red)">⚠ At-Risk Activities (${atRiskActivities.length})</h2></div>
      <div class="panel-body" style="font-size:12px">
        <div style="display:flex;flex-direction:column;gap:8px">
          ${atRiskActivities.map((m,i) => {
            const act = acts[i];
            return act ? `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:500;color:var(--text)">${act.name}</div>
                  <div style="font-size:10px;color:var(--text2)">${m.pctTotal>0?'Behind schedule':'No progress'}</div>
                </div>
                <div style="text-align:right;color:var(--red);font-weight:600">${m.pctTotal}%</div>
              </div>
            ` : '';
          }).join('')}
        </div>
      </div>
    </div>
    ` : ''}
    <div class="grid-3">
      <div class="panel">
        <div class="panel-header"><h2>Overall Completion</h2></div>
        <div class="panel-body">
          <div class="stat-row"><span class="stat-label">% Complete (computed)</span><span class="stat-value" style="color:var(--green)">${totalPct}%</span></div>
          <div class="stat-row"><span class="stat-label">Days Elapsed</span><span class="stat-value">${daysElapsed} / ${totalDays}</span></div>
          <div class="stat-row"><span class="stat-label">Time Used</span><span class="stat-value" style="color:var(--amber)">${timePct}%</span></div>
          <div class="stat-row"><span class="stat-label">Report Date</span><span class="stat-value">${p.reportDate||'—'}</span></div>
          <div class="stat-row"><span class="stat-label">Manpower Deployed</span><span class="stat-value">${manpowerDeployed}</span></div>
          <div class="stat-row"><span class="stat-label">Manpower Required</span><span class="stat-value">${manpowerRequired}</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Completion Ring</h2></div>
        <div class="panel-body">
          <div class="donut-wrap chart-wrap-sm">
            <canvas id="donutChart"></canvas>
            <div class="donut-center"><div class="donut-center-val" style="color:var(--blue)">${totalPct}%</div><div class="donut-center-sub">Complete</div></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Time Elapsed</h2></div>
        <div class="panel-body">
          <div class="donut-wrap chart-wrap-sm">
            <canvas id="timeDonut"></canvas>
            <div class="donut-center"><div class="donut-center-val" style="color:var(--amber)">${timePct}%</div><div class="donut-center-sub">Time Used</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-header"><h2>% Completion by Activity</h2></div>
        <div class="panel-body"><div class="chart-wrap-tall"><canvas id="barChart"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Required Manpower per Activity</h2></div>
        <div class="panel-body"><div class="chart-wrap-tall"><canvas id="manChart"></canvas></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header" style="flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="toggleDailyLogTable()" style="padding:5px 8px;border:none;background:transparent;color:var(--text2);cursor:pointer">
            <span id="logTableToggleIcon">▼</span>
          </button>
          <h2 style="margin:0">Daily Work Log <span style="color:var(--text2);font-size:10px">(${p.logs?.length||0} entries)</span></h2>
        </div>
        <div style="flex:1"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="logDateFilters">
          <button class="btn btn-outline btn-sm" onclick="filterLogsByDate('7')" style="color:var(--text2)">Last 7 days</button>
          <button class="btn btn-outline btn-sm" onclick="filterLogsByDate('30')" style="color:var(--text2)">Last 30 days</button>
          <button class="btn btn-outline btn-sm" onclick="filterLogsByDate('all')" style="color:var(--text2)">All</button>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openBulkLogModal()">⬆ Bulk</button>
          <button class="btn btn-green btn-sm" onclick="openAddLogModal()">+ Add</button>
        </div>
      </div>
      <div class="panel-body" style="padding:0" id="dailyLogTableContainer">
        <div class="tbl-wrap">
          <table>
            <thead><tr>
              <th>Date</th><th>Activity</th><th>Qty Done</th><th>Unit</th><th></th>
            </tr></thead>
            <tbody id="dailyLogTableBody">${(p.logs||[]).length ? (p.logs||[]).map((log,idx)=>{
              const activity = (acts||[]).find(a=>a.id===log.activity_id);
              return `<tr>
                <td>${log.date}</td>
                <td>${activity?.name||'—'}</td>
                <td style="text-align:right;font-weight:600">${fmt(log.qty_done)}</td>
                <td>${activity?.unit||''}</td>
                <td style="text-align:center;white-space:nowrap">
                  <button class="btn btn-outline btn-xs" onclick="deleteLog(${log.id})" title="Delete" style="color:var(--red)">🗑️</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:20px">No work logged yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>Activity Detail Table</h2></div>
      <div class="panel-body" style="padding:0">
        <div class="tbl-wrap">
          <table>
            <thead><tr>
              <th>Activity</th><th>Qty</th><th>Unit</th>
              <th>Today Achiev.</th><th>% Today</th>
              <th>Total Present</th><th>% Total Present</th><th>% Project</th>
              <th>Avg Rate (u/day)</th><th>Remaining</th>
              <th>Target Date</th><th>Avail Days</th>
              <th>Req Rate</th><th>Req Manpower</th><th>Person/Day</th><th>ECT (days)</th>
            </tr></thead>
            <tbody>${acts.map((a,i)=>{
              const qty = +a.qty||0;
              const totalPresent = +a.totalPresent||0;
              const m = actMetrics[i];
              const compPct = qty>0 ? (totalPresent/qty*100) : 0;
              const cls = compPct===0?'row-hl0':'';
              const badge = compPct>=60?'badge-green':compPct>0?'badge-amber':'badge-red';
              return `<tr class="${cls}">
                <td>${a.name||'—'}</td><td>${fmt(qty)}</td><td>${a.unit||''}</td>
                <td>${fmt(a.todayAchiev)}</td>
                <td><span class="badge badge-blue">${m.pctToday.toFixed(2)}%</span></td>
                <td>${fmt(totalPresent)}</td>
                <td><span class="badge ${badge}">${m.pctTotal.toFixed(2)}%</span></td>
                <td><span class="badge badge-blue">${m.pctProject.toFixed(2)}%</span></td>
                <td>${m.avgRate.toFixed(2)}</td>
                <td>${fmt(m.remaining)}</td>
                <td>${fmtDate(p.targetDate)}</td><td>${m.availDays}</td>
                <td>${m.reqRate.toFixed(2)}</td><td>—</td>
                <td>—</td>
                <td>${m.ect.toFixed(2)}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  setChartDefaults();
  const cd = {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, animation:{duration:900}};

  chartInstances.donut = new Chart(document.getElementById('donutChart'),{
    type:'doughnut',
    data:{datasets:[{data:[+totalPct,100-totalPct],backgroundColor:['#2478e8','#0f1e38'],borderWidth:0,hoverOffset:0}]},
    options:{...cd, cutout:'74%', plugins:{legend:{display:false}}}
  });

  chartInstances.timeDonut = new Chart(document.getElementById('timeDonut'),{
    type:'doughnut',
    data:{datasets:[{data:[+timePct,100-timePct],backgroundColor:['#f5a623','#0f1e38'],borderWidth:0,hoverOffset:0}]},
    options:{...cd, cutout:'74%', plugins:{legend:{display:false}}}
  });

  const barActs = acts.map((a,i)=>({a,m:actMetrics[i]})).sort((x,y)=>y.m.pctTotal-x.m.pctTotal).map(x=>x.a);
  const barMetrics = barActs.map(a=>actMetrics[acts.indexOf(a)]);
  chartInstances.bar = new Chart(document.getElementById('barChart'),{
    type:'bar',
    data:{
      labels: barActs.map(a=>{ const n=a.name||'Unnamed'; return n.length>22?n.slice(0,22)+'…':n; }),
      datasets:[{
        data: barMetrics.map(m=>m.pctTotal),
        backgroundColor: barMetrics.map(m=>{
          return m.pctTotal>=60?'rgba(0,212,136,.7)':m.pctTotal>0?'rgba(245,166,35,.7)':'rgba(255,77,109,.6)';
        }),
        borderRadius:4, barPercentage:.75
      }]
    },
    options:{...cd, indexAxis:'y',
      scales:{x:{grid:{color:'#1e3050'},ticks:{callback:v=>v+'%'},max:100},y:{grid:{display:false},ticks:{font:{size:10}}}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.parsed.x.toFixed(2)+'%'}}}
    }
  });

  chartInstances.man = new Chart(document.getElementById('manChart'),{
    type:'bar',
    data:{
      labels: acts.map(a=>{ const n=a.name||'Unnamed'; return n.length>22?n.slice(0,22)+'…':n; }),
      datasets:[
        {label:'Avg Daily Rate',data:actMetrics.map(m=>m.avgRate.toFixed(2)),backgroundColor:'rgba(79,156,249,.7)',borderRadius:4,barPercentage:.6}
      ]
    },
    options:{...cd, indexAxis:'y',
      plugins:{legend:{display:true,labels:{color:'#7e8da8',font:{size:10},boxWidth:10}},tooltip:{callbacks:{label:ctx=>' '+ctx.parsed.x}}},
      scales:{x:{grid:{color:'#1e3050'}},y:{grid:{display:false},ticks:{font:{size:10}}}}
    }
  });
}

// ── BOQ view ───────────────────────────────────────────────────

function renderBOQ(mc, p){
  const items = (p.items||[]).filter(i=>+i.totalPrice>0);
  const grandTotal = items.reduce((s,i)=>s+(+i.totalPrice||0),0);
  const grandCost  = items.reduce((s,i)=>s+(+i.totalCost||0),0);
  const grandOffer = items.reduce((s,i)=>s+(+i.offerPrice||0),0);
  const topItem = items.length ? items.reduce((best,i)=>(+i.totalPrice>(+best.totalPrice)?i:best),items[0]) : null;
  const expenses = p.expenses||[];
  const totalExpense = expenses.reduce((s,e)=>s+(+e.amount||0),0);
  const costUsedPct = grandCost>0 ? ((totalExpense/grandCost)*100).toFixed(1) : 0;
  const costRemaining = grandCost - totalExpense;
  const totalProfit = grandOffer - grandCost;

  mc.innerHTML = `
    ${importBannerHTML(p)}
    <div class="kpi-row">
      ${kpi('Total Estimated Cost','৳'+fmtBDT(grandCost),'Estimated project cost','var(--blue)','📊')}
      ${kpi('Total Project Expense','৳'+fmtBDT(totalExpense),'Actual expenses logged','var(--amber)','💸')}
      ${kpi('Cost Used %',costUsedPct+'%','Share of estimated cost','var('+(costUsedPct>100?'--red':'--green')+')','📈')}
      ${kpi('Cost Remaining',costRemaining>=0?'৳'+fmtBDT(costRemaining):'৳'+fmtBDT(Math.abs(costRemaining))+' OVER','Available budget','var('+(costRemaining>=0?'--green':'--red')+')','🎯')}
      ${kpi('Total Profit','৳'+fmtBDT(totalProfit),'Offer - Estimated Cost','var(--green)','💰')}
    </div>
    <div class="panel">
      <div class="panel-header" style="flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="toggleExpenseTable()" style="padding:5px 8px;border:none;background:transparent;color:var(--text2);cursor:pointer">
            <span id="expTableToggleIcon">▼</span>
          </button>
          <h2 style="margin:0">Expense History <span style="color:var(--text2);font-size:10px">(${expenses.length} entries)</span></h2>
        </div>
        <div style="flex:1"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="expenseDateFilters">
          <button class="btn btn-outline btn-sm" onclick="filterExpensesByDate('7')" style="color:var(--text2)">Last 7 days</button>
          <button class="btn btn-outline btn-sm" onclick="filterExpensesByDate('30')" style="color:var(--text2)">Last 30 days</button>
          <button class="btn btn-outline btn-sm" onclick="filterExpensesByDate('all')" style="color:var(--text2)">All</button>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openBulkExpenseModal()">⬆ Bulk</button>
          <button class="btn btn-green btn-sm" onclick="openExpenseLogger()">+ Add</button>
        </div>
      </div>
      <div class="panel-body" style="padding:0" id="expenseTableContainer">
        <div class="tbl-wrap">
          <table>
            <thead><tr>
              <th>Date</th><th>Category</th><th>Description</th><th>Amount (BDT)</th><th>Remarks</th><th></th>
            </tr></thead>
            <tbody id="expenseTableBody">${expenses.length ? expenses.map((e,idx)=>`<tr>
              <td>${e.date}</td>
              <td>${e.category}</td>
              <td>${e.description}</td>
              <td style="text-align:right;color:var(--amber);font-weight:600">৳${fmtBDT(+e.amount)}</td>
              <td style="font-size:11px;color:var(--text2)">${e.remarks||'—'}</td>
              <td style="text-align:center;white-space:nowrap">
                <button class="btn btn-outline btn-xs" onclick="editExpense(${e.id})" title="Edit">✏️</button>
                <button class="btn btn-outline btn-xs" onclick="deleteExpense(${e.id})" title="Delete" style="color:var(--red)">🗑️</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:20px">No expenses logged yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-header"><h2>Total Price by Item</h2></div>
        <div class="panel-body"><div class="chart-wrap-tall"><canvas id="costBar"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Cost Share (Top 5 vs Rest)</h2></div>
        <div class="panel-body"><div class="donut-wrap chart-wrap-tall"><canvas id="costDonut"></canvas></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>Expense vs Progress Over Time</h2></div>
      <div class="panel-body"><div class="chart-wrap-tall"><canvas id="expenseProgressChart"></canvas></div></div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>BOQ Line Items</h2></div>
      <div class="panel-body" style="padding:0">
        <div class="tbl-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Item Description</th><th>Qty</th><th>Unit</th>
              <th>Unit Price (BDT)</th><th>Total Price (BDT)</th>
              <th>Total Cost (BDT)</th><th>Offer Price (BDT)</th><th>Share %</th>
            </tr></thead>
            <tbody>${items.map((i,idx)=>{
              const share = grandTotal>0 ? ((+i.totalPrice/grandTotal)*100).toFixed(1) : 0;
              const w = Math.min(100,+share);
              return `<tr>
                <td>${i.sl||idx+1}</td>
                <td style="max-width:220px;white-space:normal;font-size:11px">${i.desc}</td>
                <td>${fmt(i.qty)}</td><td>${i.unit}</td>
                <td style="text-align:right">৳${fmtBDT(+i.unitPrice)}</td>
                <td style="text-align:right;font-weight:600;color:var(--blue)">৳${fmtBDT(+i.totalPrice)}</td>
                <td style="text-align:right;color:var(--amber)">৳${fmtBDT(+i.totalCost)}</td>
                <td style="text-align:right;color:var(--green)">৳${fmtBDT(+i.offerPrice)}</td>
                <td style="min-width:80px">
                  <div style="display:flex;align-items:center;gap:5px">
                    <div class="prog-bar" style="flex:1"><div class="prog-fill" style="width:${w}%;background:var(--blue2)"></div></div>
                    <span style="font-size:10px;color:var(--text2)">${share}%</span>
                  </div>
                </td>
              </tr>`;
            }).join('')}
            <tr style="background:var(--surface);font-weight:700">
              <td colspan="4" style="color:var(--text2);font-size:11px;text-transform:uppercase;letter-spacing:.5px">TOTAL</td>
              <td></td>
              <td style="text-align:right;color:var(--blue)">৳${fmtBDT(grandTotal)}</td>
              <td style="text-align:right;color:var(--amber)">৳${fmtBDT(grandCost)}</td>
              <td style="text-align:right;color:var(--green)">৳${fmtBDT(grandOffer)}</td>
              <td>100%</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

  setChartDefaults();
  const cd = {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, animation:{duration:900}};

  const sorted = [...items].sort((a,b)=>(+b.totalPrice)-(+a.totalPrice));
  chartInstances.costBar = new Chart(document.getElementById('costBar'),{
    type:'bar',
    data:{
      labels: sorted.map(i=>{ const d=i.desc||'Unnamed'; return d.length>28?d.slice(0,28)+'…':d; }),
      datasets:[{label:'Total Price',data:sorted.map(i=>+i.totalPrice),backgroundColor:'rgba(36,120,232,.75)',borderRadius:4,barPercentage:.75}]
    },
    options:{...cd, indexAxis:'y',
      scales:{x:{grid:{color:'#1e3050'},ticks:{callback:v=>'৳'+fmtBDT(v)}},y:{grid:{display:false},ticks:{font:{size:10}}}},
      plugins:{tooltip:{callbacks:{label:ctx=>' ৳'+fmtBDT(ctx.parsed.x)}}}
    }
  });

  const top5 = [...items].sort((a,b)=>(+b.totalPrice)-(+a.totalPrice)).slice(0,5);
  const restVal = items.slice(5).reduce((s,i)=>s+(+i.totalPrice),0);
  chartInstances.costDonut = new Chart(document.getElementById('costDonut'),{
    type:'doughnut',
    data:{
      labels:[...top5.map(i=>i.desc.length>20?i.desc.slice(0,20)+'…':i.desc),'Others'],
      datasets:[{data:[...top5.map(i=>+i.totalPrice),restVal],backgroundColor:['#2478e8','#4f9cf9','#00d488','#f5a623','#a78bfa','#3e5070'],borderWidth:1,borderColor:'#0f1e38',hoverOffset:6}]
    },
    options:{...cd, cutout:'60%',
      plugins:{
        legend:{display:true,position:'bottom',labels:{color:'#7e8da8',font:{size:10},boxWidth:10,padding:8}},
        tooltip:{callbacks:{label:ctx=>' ৳'+fmtBDT(ctx.parsed)+' ('+((ctx.parsed/grandTotal)*100).toFixed(1)+'%)'}}
      }
    }
  });

  const logs = p.logs || [];
  const activities = p.activities || [];

  // Create activity progress map by date
  const activityProgress = {}; // {activityId: {date: qtyDone, ...}, ...}
  logs.forEach(l=>{
    if(!activityProgress[l.activity_id]) activityProgress[l.activity_id] = {};
    activityProgress[l.activity_id][l.date] = (activityProgress[l.activity_id][l.date]||0) + (+l.qty_done||0);
  });

  const expByDate = {};
  expenses.forEach(e=>{
    const d = e.date;
    expByDate[d] = (expByDate[d]||0) + (+e.amount||0);
  });

  // Combine all dates from expenses and activities
  const allDates = new Set([
    ...Object.keys(expByDate),
    ...logs.map(l=>l.date)
  ]);
  const dates = Array.from(allDates).sort();

  let cumExp = 0;
  const expData = [], progData = [];

  dates.forEach(d=>{
    cumExp += expByDate[d]||0;
    expData.push(cumExp);

    // Calculate weighted project completion by date
    let weightedPct = 0;
    activities.forEach(a=>{
      const qty = +a.qty||0;
      const weight = (+a.weightPct||0) / 100;
      const cumQtyDone = Object.keys(activityProgress[a.id]||{}).filter(date=>date<=d).reduce((s,date)=>s+(+activityProgress[a.id][date]||0),0);
      const actPct = qty>0 ? (cumQtyDone/qty*100) : 0;
      weightedPct += actPct * weight;
    });

    progData.push(Math.min(100, weightedPct));
  });

  const progLabels = dates;

  chartInstances.expProg = new Chart(document.getElementById('expenseProgressChart'),{
    type:'line',
    data:{
      labels: progLabels,
      datasets:[
        {label:'Cumulative Expense (BDT)',data:expData,borderColor:'rgba(245,166,35,1)',backgroundColor:'rgba(245,166,35,.1)',borderWidth:2,fill:true,yAxisID:'y',tension:.3,pointRadius:3,pointBackgroundColor:'rgba(245,166,35,1)'},
        {label:'Progress %',data:progData,borderColor:'rgba(0,212,136,1)',backgroundColor:'rgba(0,212,136,.1)',borderWidth:2,fill:true,yAxisID:'y1',tension:.3,pointRadius:3,pointBackgroundColor:'rgba(0,212,136,1)'}
      ]
    },
    options:{...cd,
      scales:{
        x:{grid:{color:'#1e3050'},ticks:{font:{size:9}}},
        y:{type:'linear',position:'left',grid:{color:'#1e3050'},ticks:{callback:v=>'৳'+fmtBDT(v),font:{size:9}}},
        y1:{type:'linear',position:'right',grid:{display:false},ticks:{callback:v=>v.toFixed(0)+'%',font:{size:9}}}
      },
      plugins:{
        legend:{display:true,position:'top',labels:{color:'#7e8da8',font:{size:10},boxWidth:10}},
        tooltip:{callbacks:{label:ctx=>ctx.dataset.yAxisID==='y1'?ctx.parsed.y.toFixed(1)+'%':' ৳'+fmtBDT(ctx.parsed.y)}}
      }
    }
  });
}

// ── Daily log controls ────────────────────────────────────────

function toggleDailyLogTable(){
  dailyLogExpanded = !dailyLogExpanded;
  const container = document.getElementById('dailyLogTableContainer');
  const icon = document.getElementById('logTableToggleIcon');

  if(dailyLogExpanded){
    container.style.display = '';
    container.style.maxHeight = '0px';
    container.style.opacity = '0';
    container.style.overflow = 'hidden';
    container.style.transition = 'none';
    requestAnimationFrame(() => {
      const scrollH = container.scrollHeight;
      container.style.transition = 'max-height .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease';
      container.style.maxHeight = scrollH + 'px';
      container.style.opacity = '1';
    });
    icon.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
    icon.style.transform = 'rotate(0deg)';
    icon.textContent = '▼';
  } else {
    container.style.maxHeight = container.scrollHeight + 'px';
    container.style.transition = 'none';
    requestAnimationFrame(() => {
      container.style.transition = 'max-height .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease';
      container.style.maxHeight = '0px';
      container.style.opacity = '0';
    });
    icon.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
    icon.style.transform = 'rotate(-90deg)';
    icon.textContent = '▶';
    setTimeout(() => {
      container.style.display = 'none';
    }, 300);
  }
}

function filterLogsByDate(days){
  logDateFilter = days;
  const p = PROJECTS[currentProjectId];
  if(!p) return;

  const logs = p.logs || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filtered = logs;
  if(days !== 'all'){
    const daysNum = parseInt(days);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    filtered = logs.filter(l=>{
      try{
        const logDate = new Date(l.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate >= cutoffDate;
      } catch(e){ return true; }
    });
  }

  const tbody = document.getElementById('dailyLogTableBody');
  if(!tbody) return;

  const acts = p.activities || [];
  tbody.innerHTML = filtered.length ? filtered.map((log,idx)=>{
    const activity = acts.find(a=>a.id===log.activity_id);
    return `<tr>
      <td>${log.date}</td>
      <td>${activity?.name||'—'}</td>
      <td style="text-align:right;font-weight:600">${fmt(log.qty_done)}</td>
      <td>${activity?.unit||''}</td>
      <td style="color:var(--text2);font-size:11px">—</td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn btn-outline btn-xs" onclick="editLog(${log.id})" title="Edit">✏️</button>
        <button class="btn btn-outline btn-xs" onclick="deleteLog(${log.id})" title="Delete" style="color:var(--red)">🗑️</button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:20px">No work logged in this period</td></tr>';

  // Update button styles
  document.querySelectorAll('#logDateFilters button').forEach(btn=>{
    const btnDays = btn.textContent.includes('7')?'7':btn.textContent.includes('30')?'30':'all';
    if(btnDays === days){
      btn.style.color = 'var(--blue)';
      btn.style.borderColor = 'var(--blue)';
    } else {
      btn.style.color = 'var(--text2)';
      btn.style.borderColor = 'var(--border2)';
    }
  });
}

// ── Expense table controls ─────────────────────────────────────

function toggleExpenseTable(){
  expenseTableExpanded = !expenseTableExpanded;
  const container = document.getElementById('expenseTableContainer');
  const icon = document.getElementById('expTableToggleIcon');

  if(expenseTableExpanded){
    container.style.display = '';
    container.style.maxHeight = '0px';
    container.style.opacity = '0';
    container.style.overflow = 'hidden';
    container.style.transition = 'none';
    requestAnimationFrame(() => {
      const scrollH = container.scrollHeight;
      container.style.transition = 'max-height .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease';
      container.style.maxHeight = scrollH + 'px';
      container.style.opacity = '1';
    });
    icon.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
    icon.style.transform = 'rotate(0deg)';
    icon.textContent = '▼';
  } else {
    container.style.maxHeight = container.scrollHeight + 'px';
    container.style.transition = 'none';
    requestAnimationFrame(() => {
      container.style.transition = 'max-height .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease';
      container.style.maxHeight = '0px';
      container.style.opacity = '0';
    });
    icon.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
    icon.style.transform = 'rotate(-90deg)';
    icon.textContent = '▶';
    setTimeout(() => {
      container.style.display = 'none';
    }, 300);
  }
}

function filterExpensesByDate(days){
  expenseDateFilter = days;
  const p = PROJECTS[currentProjectId];
  if(!p) return;

  const expenses = p.expenses || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filtered = expenses;
  if(days !== 'all'){
    const daysNum = parseInt(days);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    filtered = expenses.filter(e=>{
      try{
        const expDate = new Date(e.date);
        expDate.setHours(0, 0, 0, 0);
        return expDate >= cutoffDate;
      } catch(e){ return true; }
    });
  }

  const tbody = document.getElementById('expenseTableBody');
  if(!tbody) return;

  tbody.innerHTML = filtered.length ? filtered.map((e,idx)=>`<tr>
    <td>${e.date}</td>
    <td>${e.category}</td>
    <td>${e.description}</td>
    <td style="text-align:right;color:var(--amber);font-weight:600">৳${fmtBDT(+e.amount)}</td>
    <td style="font-size:11px;color:var(--text2)">${e.remarks||'—'}</td>
    <td style="text-align:center;white-space:nowrap">
      <button class="btn btn-outline btn-xs" onclick="editExpense(${e.id})" title="Edit">✏️</button>
      <button class="btn btn-outline btn-xs" onclick="deleteExpense(${e.id})" title="Delete" style="color:var(--red)">🗑️</button>
    </td>
  </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:20px">No expenses in this period</td></tr>';

  // Update button styles
  document.querySelectorAll('#expenseDateFilters button').forEach(btn=>{
    const btnDays = btn.textContent.includes('7')?'7':btn.textContent.includes('30')?'30':'all';
    if(btnDays === days){
      btn.style.color = 'var(--blue)';
      btn.style.borderColor = 'var(--blue)';
    } else {
      btn.style.color = 'var(--text2)';
      btn.style.borderColor = 'var(--border2)';
    }
  });
}
