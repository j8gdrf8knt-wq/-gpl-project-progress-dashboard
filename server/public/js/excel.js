// ── Excel Import ───────────────────────────────────────────────

function handleDrop(e){
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('active');
  const f = e.dataTransfer.files[0];
  if(f) readExcelFile(f);
}

function handleFileSelect(e){
  const f = e.target.files[0];
  if(f) readExcelFile(f);
  e.target.value = '';
}

function readExcelFile(file){
  const reader = new FileReader();
  reader.onload = ev => {
    try{
      const wb = XLSX.read(ev.target.result, {type:'array'});
      if(currentView === 'boq'){
        // Try to detect data type: BOQ vs Expenses
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        const headers = (rows[0]||[]).map(h=>String(h||'').toLowerCase().trim());

        // Check for expense markers
        const hasDate = headers.some(h=>h.includes('date'));
        const hasAmount = headers.some(h=>h.includes('amount')||h.includes('cost'));
        const hasCategory = headers.some(h=>h.includes('category')||h.includes('type'));
        const hasDesc = headers.some(h=>h.includes('desc')||h.includes('item')||h.includes('note'));

        const hasBOQ = headers.some(h=>h.includes('sl')||h.includes('qty'));

        if(hasDate && hasAmount && hasCategory && hasDesc && !hasBOQ){
          // Expense data detected
          pendingXLData = {headers:rows[0]||[], rows:rows.slice(1), sheetName, type:'expenses'};
          openExpenseColMapper(rows[0]||[], rows.slice(1));
        } else {
          // BOQ data — use column-mapper instead of positional guessing
          pendingXLData = {headers:rows[0]||[], rows:rows.slice(1), sheetName, type:'boq'};
          openBOQColMapper(rows[0]||[], rows.slice(1));
        }
      } else {
        // Progress view - show import type selector
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:''});

        if(!rows.length){
          showToast('✕','Excel file appears to be empty','red');
          return;
        }

        // Check if first row looks like headers or data
        const firstRow = rows[0] || [];
        const headerStrings = firstRow.map(h=>String(h||'').toLowerCase().trim());
        const isLikelyHeader = headerStrings.some(h=>
          h.includes('date')||h.includes('activity')||h.includes('qty')||
          h.includes('name')||h.includes('unit')||h.includes('rate')||h.includes('amount')
        );

        // If no clear headers, use generic column names and include first row as data
        let headerList, dataRows;
        if(!isLikelyHeader && firstRow.some(v=>v)){
          // First row is data, not headers - use generic headers
          headerList = firstRow.map((v,i)=>['Date','Area/Activity','Activity','Qty Done','Remarks','Notes'][i]||`Col ${i+1}`);
          dataRows = rows; // Include first row as data
        } else {
          // First row is headers
          headerList = firstRow;
          dataRows = rows.slice(1);
        }

        pendingXLData = {headers:headerList, rows:dataRows, sheetName:wb.SheetNames[0]};
        document.getElementById('importTypeOverlay').classList.add('open');
      }
    } catch(e){ showToast('✕','Failed to read Excel file','red'); }
  };
  reader.readAsArrayBuffer(file);
}

function selectImportType(type){
  const headerList = pendingXLData.headers || [];
  const rows = pendingXLData.rows || [];

  closeModal('importTypeOverlay');

  if(type === 'activities'){
    // Master activity data
    openColMapper(headerList, rows);
  } else if(type === 'logs'){
    // Daily work log data
    openLogColMapper(headerList, rows);
  }
}

function openBOQColMapper(headers, rows){
  const fields = [
    {key:'sl',label:'SL / Item No.',required:false},
    {key:'desc',label:'Item Description',required:true},
    {key:'qty',label:'Quantity',required:true},
    {key:'unit',label:'Unit',required:true},
    {key:'unitPrice',label:'Unit Price (BDT)',required:false},
    {key:'totalPrice',label:'Total Price (BDT)',required:true},
    {key:'totalCost',label:'Total Cost (BDT)',required:false},
    {key:'offerPrice',label:'Offer Price (BDT)',required:false},
  ];
  const preview = rows.slice(0,3).map(r=>'['+r.slice(0,6).map(c=>String(c).slice(0,15)).join(', ')+']').join('\n');
  document.getElementById('colMapBody').innerHTML = `
    <p style="font-size:11px;color:var(--text2);margin-bottom:12px">📦 BOQ Import • Headers found: <strong style="color:var(--text)">${headers.join(' | ')}</strong></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${fields.map(f=>`
        <div class="form-group">
          <label>${f.label}${f.required?'<span style="color:var(--red)"> *</span>':''}</label>
          <select data-field="${f.key}">
            <option value="">— skip —</option>
            ${headers.map((h,i)=>`<option value="${i}" ${guessBOQCol(h,f.key)?'selected':''}>${h||'Col '+i}</option>`).join('')}
          </select>
        </div>`).join('')}
    </div>
    <pre style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-size:10px;color:var(--text2);white-space:pre-wrap">${preview}</pre>
  `;
  document.getElementById('colMapBody').dataset.type = 'boq';
  document.getElementById('colMapOverlay').classList.add('open');
}

function guessBOQCol(header, field){
  const h = header.toLowerCase().trim().replace(/[^\w\s]/g,'');
  const map = {
    sl:['sl','item no','sequence','number'],
    desc:['desc','description','item','name'],
    qty:['qty','quantity'],
    unit:['unit','uom','measurement'],
    unitPrice:['unit price','unit cost','rate'],
    totalPrice:['total price','line price','extended price'],
    totalCost:['total cost','total','cost'],
    offerPrice:['offer','offer price','quoted price']
  };
  if((map[field]||[]).some(k=>h.includes(k))) return true;
  if(h.includes(field)) return true;
  return false;
}

function validateAndImportBOQ(colMap){
  if(colMap.desc===undefined || colMap.qty===undefined || colMap.unit===undefined || colMap.totalPrice===undefined){
    showToast('✕','Description, Quantity, Unit, and Total Price columns are required','red');
    return;
  }
  const rows = pendingXLData.rows;
  const validated = rows.map((r,idx)=>{
    const desc = String(r[colMap.desc]||'').split('\n')[0].trim().slice(0,120);
    const qty = +r[colMap.qty]||0;
    const unit = String(r[colMap.unit]||'').split('\n')[0].trim();
    const totalPrice = +r[colMap.totalPrice]||0;

    let error = null;
    if(!desc) error = 'Missing description';
    else if(!qty || qty <= 0) error = 'Invalid/missing quantity';
    else if(!unit) error = 'Missing unit';
    else if(!totalPrice || totalPrice <= 0) error = 'Invalid/missing total price';

    return {
      idx, desc, qty, unit, totalPrice, valid: !error, error,
      sl: +r[colMap.sl]||idx+1,
      unitPrice: +r[colMap.unitPrice]||0,
      totalCost: +r[colMap.totalCost]||0,
      offerPrice: +r[colMap.offerPrice]||0,
      _row: r
    };
  });

  const valid = validated.filter(v=>v.valid);
  const invalid = validated.filter(v=>!v.valid);

  if(!valid.length){
    showToast('✕','No valid BOQ rows found','red');
    return;
  }

  if(invalid.length > 0){
    showValidationPreview('boq', valid, invalid, ()=>commitBOQImport(valid));
  } else {
    commitBOQImport(valid);
  }
}

function commitBOQImport(validItems){
  PROJECTS[currentProjectId].items = validItems;
  persist();
  closeModal('colMapOverlay');
  destroyCharts();
  render();
  showToast('✓','Imported '+validItems.length+' BOQ items','green');
}

function parseBOQFromRows(rows){
  // ── Find main header row (has SL + QTY) ────────────────────
  let hdrIdx = -1;
  for(let i=0; i<Math.min(rows.length,10); i++){
    const txt = rows[i].map(c=>String(c||'').toUpperCase().trim());
    if(txt.some(h=>h.startsWith('SL')) && txt.some(h=>h==='QTY'||h==='QUANTITY')){
      hdrIdx=i; break;
    }
  }
  const startRow = hdrIdx>=0 ? hdrIdx+1 : 3;

  // ── Column map with safe defaults (GPL format) ──────────────
  // GPL layout: SL | Desc | Spec(skip) | QTY | Unit | UnitPrice | TotalPrice | ... | TotalCost(14) | ... | OfferPrice(16)
  const cm = { sl:0, desc:1, qty:3, unit:4, unitPrice:5, totalPrice:6, totalCost:14, offerPrice:16 };

  // Override from headers — scan ALL rows up to and including hdrIdx
  for(let ri=0; ri<=Math.max(hdrIdx,0); ri++){
    (rows[ri]||[]).forEach((cell,ci)=>{
      if(typeof cell !== 'string') return;          // skip numeric header cells
      const h = cell.toLowerCase().replace(/\s+/g,' ').trim();
      if(!h) return;
      if(/^sl/.test(h) && ci===0)                  cm.sl = ci;
      if(/local item|item desc|^description/.test(h)) cm.desc = ci;
      if(h==='qty'||h==='quantity')                 cm.qty = ci;
      if(h==='unit')                                cm.unit = ci;
      if(h.includes('unit price') && ci<10)         cm.unitPrice = ci;   // ci<10 avoids duplicate 'Unit Price' in far-right cols
      if(h.includes('total price')&&!h.includes('offer')&&!h.includes('cost')) cm.totalPrice = ci;
      if(h.includes('total cost')&&!h.includes('offer')&&!h.includes('soft')) cm.totalCost = ci;
      if(h.includes('offer price')||h.includes('total offer')) cm.offerPrice = ci;
    });
  }

  // ── Self-correction: if qty col returns long text, it's the spec column — shift ──
  const probe = rows[startRow];
  if(probe){
    const probeQty = probe[cm.qty];
    if(typeof probeQty === 'string' && probeQty.length > 20){
      cm.qty++;
      cm.unit++;
    }
  }

  // ── Parse items ─────────────────────────────────────────────
  const items = [];
  for(let i=startRow; i<rows.length; i++){
    const r = rows[i];
    const desc       = String(r[cm.desc]||'').split('\n')[0].trim().slice(0,120);
    const totalPrice = +r[cm.totalPrice] || 0;
    if(!desc || totalPrice<=0) continue;
    items.push({
      sl:         +r[cm.sl] || items.length+1,
      desc,
      qty:        +r[cm.qty]        || 0,
      unit:       String(r[cm.unit]||'').split('\n')[0].trim(),
      unitPrice:  +r[cm.unitPrice]  || 0,
      totalPrice,
      totalCost:  +r[cm.totalCost]  || 0,
      offerPrice: +r[cm.offerPrice] || 0,
    });
  }

  if(items.length){
    PROJECTS[currentProjectId].items = items;
    persist(); destroyCharts(); render();
    showToast('✓','Imported '+items.length+' BOQ items','green');
  } else {
    showToast('✕','No valid BOQ rows found — check column layout','red');
  }
}

function openColMapper(headers, rows){
  const fields = [
    {key:'name',label:'Activity Name',required:true},
    {key:'qty',label:'Qty'},
    {key:'unit',label:'Unit'},
    {key:'todayAchiev',label:"Today's Achievement"},
    {key:'pctToday',label:"% of Today's Achievement"},
    {key:'avgRate',label:'Average Rate of Achievement [Unit/Day]'},
    {key:'totalPresent',label:'Total Present Achievement'},
    {key:'pctTotal',label:'% of Total Present Achievements'},
    {key:'pctProject',label:'% Project Achievement'},
    {key:'ect',label:'Estimated Completion Time [ECT] (Days)'},
    {key:'targetDate',label:'Target Completion Date'},
    {key:'availDays',label:'Available Days to Achieve Target'},
    {key:'reqRate',label:'Required Rate of Achievement (unit/Day)'},
    {key:'reqManpower',label:'Required Manpower to Achieve Target'},
    {key:'personsDay',label:'Person Supposed to be Engaged per Day'},
  ];
  const preview = rows.slice(0,3).map(r=>'['+r.slice(0,6).map(c=>String(c).slice(0,15)).join(', ')+']').join('\n');
  document.getElementById('colMapBody').innerHTML = `
    <p style="font-size:11px;color:var(--text2);margin-bottom:12px">Headers found: <strong style="color:var(--text)">${headers.join(' | ')}</strong></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${fields.map(f=>`
        <div class="form-group">
          <label>${f.label}${f.required?'<span style="color:var(--red)"> *</span>':''}</label>
          <select data-field="${f.key}">
            <option value="">— skip —</option>
            ${headers.map((h,i)=>`<option value="${i}" ${guessCol(h,f.key)?'selected':''}>${h||'Col '+i}</option>`).join('')}
          </select>
        </div>`).join('')}
    </div>
    <pre style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-size:10px;color:var(--text2);white-space:pre-wrap">${preview}</pre>
  `;
  document.getElementById('colMapOverlay').classList.add('open');
}

function guessCol(header, field){
  const h = header.toLowerCase().trim().replace(/[^\w\s]/g,'');
  const map = {
    name:['activit','item','work','task','name','activities','description'],
    qty:['qty','quant','quantity','target','total qty'],
    unit:['unit','measurement','uom','measure'],
    todayAchiev:["today","daily",'achieved today'],
    pctToday:["pct today",'pct','percent','today'],
    avgRate:['average rate','avg rate','rate'],
    totalPresent:['total present','cumulative','total achieve'],
    pctTotal:['total present','cumulative','pct total'],
    pctProject:['project','overall'],
    ect:['ect','completion time','estimated','days remaining'],
    targetDate:['target','deadline','date','completion date'],
    availDays:['available','avail','days','remaining'],
    reqRate:['required rate','req rate','rate needed','needed'],
    reqManpower:['required manpower','req manpower','manpower','people','persons'],
    personsDay:['person','manpower','per day','daily']
  };
  if((map[field]||[]).some(k=>h.includes(k))) return true;
  if(h.includes(field)) return true;
  return false;
}

function guessExpenseCol(header, field){
  const h = header.toLowerCase().trim().replace(/[^\w\s]/g,'');
  const map = {
    date:['date','entry','when','day'],
    amount:['amount','cost','expense','total','price','value','bdt'],
    category:['category','type','group','class'],
    description:['desc','item','details','remarks','what','title'],
    remarks:['remark','note','comment','memo','notes']
  };
  if((map[field]||[]).some(k=>h.includes(k))) return true;
  if(h.includes(field)) return true;
  return false;
}

function guessLogCol(header, field){
  const h = header.toLowerCase().trim().replace(/[^\w\s]/g,'');
  const map = {
    date:['date','entry','logged','day','when'],
    area:['area','building','location','zone','site','place','section'],
    activity:['activity','task','work','item','description','what','mark','marking'],
    qty_done:['qty','quantity','done','complete','completed','achievement','amount','how much','achieved']
  };

  // Priority 1: Exact field name match
  if(h === field) return true;

  // Priority 2: Check if any alias matches (but not for compound headers)
  const hasSlash = header.includes('/');
  const isCompound = hasSlash || header.split(/\s+/).length > 2;

  if(!isCompound && (map[field]||[]).some(k=>h.includes(k))) return true;

  // Priority 3: if field name itself appears in header (but is primary content)
  if(!isCompound && h.includes(field) && h.length < 30) return true;

  return false;
}

function openExpenseColMapper(headers, rows){
  const fields = [
    {key:'date',label:'Date',required:true},
    {key:'amount',label:'Amount (BDT)',required:true},
    {key:'category',label:'Category',required:true},
    {key:'description',label:'Description',required:true},
    {key:'remarks',label:'Remarks'},
  ];
  const preview = rows.slice(0,3).map(r=>'['+r.slice(0,5).map(c=>String(c).slice(0,15)).join(', ')+']').join('\n');
  document.getElementById('colMapBody').innerHTML = `
    <p style="font-size:11px;color:var(--text2);margin-bottom:12px">📊 Expense Import • Headers found: <strong style="color:var(--text)">${headers.join(' | ')}</strong></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${fields.map(f=>`
        <div class="form-group">
          <label>${f.label}${f.required?'<span style="color:var(--red)"> *</span>':''}</label>
          <select data-field="${f.key}">
            <option value="">— skip —</option>
            ${headers.map((h,i)=>`<option value="${i}" ${guessExpenseCol(h,f.key)?'selected':''}>${h||'Col '+i}</option>`).join('')}
          </select>
        </div>`).join('')}
    </div>
    <pre style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-size:10px;color:var(--text2);white-space:pre-wrap">${preview}</pre>
  `;
  document.getElementById('colMapBody').dataset.type = 'expenses';
  document.getElementById('colMapOverlay').classList.add('open');
}

function openLogColMapper(headers, rows){
  const fields = [
    {key:'date',label:'Date',required:true},
    {key:'area',label:'Area / Building',required:true},
    {key:'activity',label:'Activity Name',required:true},
    {key:'qty_done',label:'Quantity Done',required:true},
  ];
  const preview = rows.slice(0,3).map(r=>'['+r.slice(0,5).map(c=>String(c).slice(0,12)).join(', ')+']').join('\n');
  document.getElementById('colMapBody').innerHTML = `
    <p style="font-size:11px;color:var(--text2);margin-bottom:12px">📋 Daily Work Log Import • Headers found: <strong style="color:var(--text)">${headers.join(' | ')}</strong></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${fields.map(f=>`
        <div class="form-group">
          <label>${f.label}${f.required?'<span style="color:var(--red)"> *</span>':''}</label>
          <select data-field="${f.key}">
            <option value="">— skip —</option>
            ${headers.map((h,i)=>`<option value="${i}" ${guessLogCol(h,f.key)?'selected':''}>${h||'Col '+i}</option>`).join('')}
          </select>
        </div>`).join('')}
    </div>
    <pre style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-size:10px;color:var(--text2);white-space:pre-wrap">${preview}</pre>
  `;
  document.getElementById('colMapBody').dataset.type = 'logs';
  document.getElementById('colMapOverlay').classList.add('open');
}

function previewAndImport(){
  const selects = document.querySelectorAll('#colMapBody [data-field]');
  const colMap = {};
  selects.forEach(s=>{ if(s.value!=='') colMap[s.dataset.field]=+s.value; });

  const colMapBody = document.getElementById('colMapBody');
  const type = colMapBody.dataset.type;

  // Delegate to validation/import based on type
  if(type === 'expenses') validateAndImportExpenses(colMap);
  else if(type === 'logs') validateAndImportLogs(colMap);
  else if(type === 'boq') validateAndImportBOQ(colMap);
  else validateAndImportActivities(colMap);
}

function applyColMap(){
  previewAndImport();
}

function validateAndImportExpenses(colMap){
  if(colMap.date===undefined || colMap.amount===undefined || colMap.category===undefined || colMap.description===undefined){
    showToast('✕','Date, Amount, Category, and Description columns are required','red');
    return;
  }
  const rows = pendingXLData.rows;
  const validated = rows.map((r,idx)=>{
    const date = String(r[colMap.date]||'').trim();
    const amount = +r[colMap.amount]||0;
    const category = String(r[colMap.category]||'').trim();
    const description = String(r[colMap.description]||'').trim();
    const remarks = colMap.remarks !== undefined ? String(r[colMap.remarks]||'').trim() : '';

    let error = null;
    if(!date) error = 'Missing date';
    else if(!amount || amount <= 0) error = 'Invalid/missing amount';
    else if(!category) error = 'Missing category';
    else if(!description) error = 'Missing description';

    return {
      idx, date, amount, category, description, remarks, valid: !error, error,
      _row: r
    };
  });

  const valid = validated.filter(v=>v.valid);
  const invalid = validated.filter(v=>!v.valid);

  if(!valid.length){
    showToast('✕','No valid expense rows found','red');
    return;
  }

  if(invalid.length > 0){
    showValidationPreview('expenses', valid, invalid, ()=>commitExpenseImport(valid));
  } else {
    commitExpenseImport(valid);
  }
}

function commitExpenseImport(validRows){
  const expenses = validRows.map(v=>({
    date: v.date, amount: v.amount, category: v.category,
    description: v.description, remarks: v.remarks
  }));

  apiFetch(`/api/projects/${currentProjectId}/expenses/bulk/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({expenses})
  }).then(r=>r.json()).then(data=>{
    if(data.created){
      const p = PROJECTS[currentProjectId];
      if(!p.expenses) p.expenses = [];
      expenses.forEach(e=>p.expenses.unshift({...e}));
      closeModal('colMapOverlay');
      destroyCharts();
      render();
      showToast('✓','Imported '+data.created+' expenses','green');
    } else {
      showToast('✕','Failed to import expenses','red');
    }
  }).catch(e=>{
    showToast('✕','Error importing expenses','red');
  });
}

function validateAndImportLogs(colMap){
  if(colMap.date===undefined || colMap.area===undefined || colMap.activity===undefined || colMap.qty_done===undefined){
    showToast('✕','Date, Area, Activity, and Quantity Done columns are required','red');
    return;
  }
  const rows = pendingXLData.rows;
  const p = PROJECTS[currentProjectId];
  const areas = p.areas || [];
  const activities = p.activities || [];

  const validated = rows.map((r,idx)=>{
    let dateVal = r[colMap.date];
    let date;
    if(dateVal instanceof Date) {
      date = dateVal.toISOString().split('T')[0];
    } else if(typeof dateVal === 'number') {
      const excelEpoch = new Date(1900, 0, 1).getTime();
      const jsDate = new Date(excelEpoch + (dateVal - 1) * 86400000);
      date = jsDate.toISOString().split('T')[0];
    } else {
      date = String(dateVal||'').trim();
    }

    const areaName = String(r[colMap.area]||'').trim();
    const activityName = String(r[colMap.activity]||'').trim();
    const qty = +r[colMap.qty_done]||0;

    let error = null;
    if(!date) error = 'Missing date';
    else if(!areaName) error = 'Missing area';
    else if(!activityName) error = 'Missing activity';
    else if(!qty || qty <= 0) error = 'Invalid/missing quantity';
    else {
      const area = areas.find(a=>a.name.toLowerCase()===areaName.toLowerCase());
      if(!area) error = `Area "${areaName}" not found in project setup`;
      else {
        const activity = activities.find(a=>a.name.toLowerCase()===activityName.toLowerCase());
        if(!activity) error = `Activity "${activityName}" not found in project setup`;
      }
    }

    const area = areas.find(a=>a.name.toLowerCase()===areaName.toLowerCase());
    const activity = activities.find(a=>a.name.toLowerCase()===activityName.toLowerCase());

    return {
      idx, date, areaName, activityName, qty, valid: !error, error,
      area_id: area?.id, activity_id: activity?.id,
      _row: r
    };
  });

  const valid = validated.filter(v=>v.valid);
  const invalid = validated.filter(v=>!v.valid);

  if(!valid.length){
    showToast('✕','No valid work log rows found','red');
    return;
  }

  if(invalid.length > 0){
    showValidationPreview('logs', valid, invalid, ()=>commitLogImport(valid));
  } else {
    commitLogImport(valid);
  }
}

function commitLogImport(validRows){
  const p = PROJECTS[currentProjectId];
  const logs = validRows.map(v=>({
    date: v.date, area_id: v.area_id, activity_id: v.activity_id, qty_done: v.qty
  }));

  if(!p.logs) p.logs = [];
  logs.forEach(log=>p.logs.unshift({...log, id: Math.random()}));

  persist();
  closeModal('colMapOverlay');
  destroyCharts();
  render();
  showToast('✓','Imported '+logs.length+' work log entries','green');
}

function validateAndImportActivities(colMap){
  if(colMap.name===undefined){
    showToast('✕','Activity Name column is required','red');
    return;
  }
  const rows = pendingXLData.rows;
  const validated = rows.map((r,idx)=>{
    const name = String(r[colMap.name]||'').trim();
    let error = null;
    if(!name) error = 'Missing activity name';

    return {
      idx, name,
      qty: +r[colMap.qty]||0, unit: String(r[colMap.unit]||''),
      valid: !error, error,
      _row: r
    };
  });

  const valid = validated.filter(v=>v.valid).map(v=>({
    name: v.name, qty: v.qty, unit: v.unit,
    todayAchiev: 0, pctToday: 0, totalPresent: 0, pctTotal: 0, pctProject: 0,
    targetDate: '', availDays: 0, reqRate: 0, reqManpower: 0, personsDay: 0, highlighted: false
  }));
  const invalid = validated.filter(v=>!v.valid);

  if(!valid.length){
    showToast('✕','No valid activity rows found','red');
    return;
  }

  if(invalid.length > 0){
    showValidationPreview('activities', valid, invalid, ()=>commitActivityImport(valid));
  } else {
    commitActivityImport(valid);
  }
}

function commitActivityImport(validActivities){
  PROJECTS[currentProjectId].activities = validActivities;
  persist();
  closeModal('colMapOverlay');
  destroyCharts();
  render();
  showToast('✓','Imported '+validActivities.length+' activities','green');
}

function showValidationPreview(type, valid, invalid, onConfirm){
  const typeLabel = {expenses:'Expenses', logs:'Work Logs', boq:'BOQ Items', activities:'Activities'}[type] || type;
  const preview = `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">
        <span style="color:var(--green);font-weight:600">✓ ${valid.length} valid</span>
        <span style="color:var(--red);font-weight:600"> • ✗ ${invalid.length} skipped</span>
      </div>
      ${invalid.length > 0 ? `
        <div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:10px;max-height:200px;overflow-y:auto">
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px"><strong>Skipped rows:</strong></div>
          ${invalid.map(inv=>`
            <div style="font-size:10.5px;color:var(--red);padding:4px 0;border-bottom:1px solid var(--border)">
              Row ${inv.idx+2}: ${inv.error}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn btn-outline btn-sm" onclick="closeModal('colMapOverlay')">Cancel</button>
      <button class="btn btn-green btn-sm" onclick="(${onConfirm.toString()})()">Import ${valid.length} ${typeLabel}</button>
    </div>
  `;

  document.getElementById('colMapBody').innerHTML = `
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px"><strong>Review before import</strong></p>
    ${preview}
  `;
}

}

// ── Template Download ──────────────────────────────────────────

function downloadTemplate(){
  let wb;
  if(currentView === 'progress'){
    wb = XLSX.utils.book_new();
    const data=[
      ['Activities','Qty','Unit',"Today's Achievement","% of Today's Achievement",
       'Average Rate of Achievement [Unit/Day]','Total Present Achievement',
       '% of Total Present Achievements','% Project Achievement',
       'Estimated Completion Time [ECT] (Days)','Target Completion Date',
       'Available Days to Achieve Target','Required Rate of Achievement (unit/Day)',
       'Required Manpower to Achieve Target','Person Supposed to be Engaged per Day'],
      ['Earthing',39,'Nos',2,0.23,0.10,7,17.9,0.81,713.14,'2026-06-18',16.0,5,8,3]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Progress');
  } else {
    wb = XLSX.utils.book_new();
    const data=[
      ['SL No.','Item Description','QTY','UNIT','Unit Price (BDT)','Total Price (BDT)','Total Cost (BDT)','Offer Price (BDT)'],
      [1,'Example Item',1,'Lot',10000,10000,11000,12650]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Costing');
  }
  XLSX.writeFile(wb, 'GPL_Template_'+(currentView==='progress'?'Progress':'BOQ')+'.xlsx');
}

function toggleDropZone(){
  const dz = document.getElementById('dropZone');
  dz.style.display = dz.style.display==='block' ? 'none' : 'block';
}
