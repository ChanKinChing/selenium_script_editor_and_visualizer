// ============ Button definitions ============
const BTN_GROUPS = [
  {
    label: '導航／等待',
    items: [
      { action: 'open', fmt: ',URL,open', labels: ['URL'], desc: '開啟網頁' },
      { action: 'pause', fmt: ',秒數,pause', labels: ['秒數'], desc: '等待 N 秒' },
    ]
  },
  {
    label: '操作',
    items: [
      { action: 'click', fmt: ',XPath,click', labels: ['路徑'], desc: '點擊元素' },
      { action: 'type', fmt: ',XPath,値,type', labels: ['路徑','値'], desc: '輸入文字' },
      { action: 'dropdown', fmt: ',XPath,選項,dropdown', labels: ['路徑','選項'], desc: '下拉選取' },
      { action: 'press', fmt: ',XPath,按鍵,press', labels: ['路徑','按鍵'], desc: '按鍵操作' },
    ]
  },
  {
    label: '確認存在',
    items: [
      { action: 'present', fmt: ',XPath,present', labels: ['路徑'], desc: '存在 DOM' },
      { action: 'visible', fmt: ',XPath,visible', labels: ['路徑'], desc: '可見' },
      { action: 'not_present', fmt: ',XPath,not_present', labels: ['路徑'], desc: '不存在 DOM' },
      { action: 'not_visible', fmt: ',XPath,not_visible', labels: ['路徑'], desc: '不可見' },
    ]
  },
  {
    label: '斷言',
    items: [
      { action: 'assert_text', fmt: ',XPath,預期文字,assert_text', labels: ['路徑','預期'], desc: '斷言文字' },
      { action: 'assert_attribute_value', fmt: ',XPath,屬性名,assert_value', labels: ['路徑','屬性'], desc: '斷言屬性值' },
      { action: 'assert_class', fmt: ',XPath,class名,assert_class', labels: ['路徑','class'], desc: '斷言 class' },
      { action: 'compare_eq', fmt: ',變數A,變數B,compare_eq', labels: ['變數 A','變數 B'], desc: '比較變數' },
    ]
  },
  {
    label: '取值',
    items: [
      { action: 'get_text', fmt: ',XPath,變數名,get_text', labels: ['路徑','變數'], desc: '取文字' },
      { action: 'get_attribute_value', fmt: ',XPath,變數,get_attr', labels: ['路徑','變數'], desc: '取屬性值' },
    ]
  },
  {
    label: '條件區塊',
    items: [
      { action: 'check_presence_to_continue', fmt: ',XPath,check_presence', labels: ['路徑'], desc: '條件區塊', cls: 'block-key' },
      { action: 'end_check_presence_to_continue', fmt: ',,end_check', labels: [], desc: '結束區塊', cls: 'block-key' },
    ]
  },
  {
    label: '其他',
    items: [
      { action: 'print', desc: '輸出日誌' },
      { action: 'check_file_downloaded', desc: '確認下載' },
      { action: 'ENTER', desc: '按 ENTER', extra: { a: 'press', val: 'ENTER' } },
      { action: 'TAB', desc: '按 TAB', extra: { a: 'press', val: 'TAB' } },
      { action: 'DELETE', desc: '按 DELETE', extra: { a: 'press', val: 'DELETE' } },
      { action: 'CONTROL+A', desc: '全選', extra: { a: 'press', val: 'CONTROL+A' } },
      { action: 'custom', desc: '自訂動作', cls: 'custom-btn' },
    ]
  },
];

const BTN_ICONS = {
  'open':'open_in_new','pause':'hourglass_empty','click':'touch_app','type':'keyboard','dropdown':'arrow_drop_down_circle','press':'keyboard_return',
  'present':'visibility','visible':'visibility','not_present':'visibility_off','not_visible':'dangerous',
  'assert_text':'fact_check','assert_attribute_value':'verified','assert_class':'verified',
  'get_text':'description','get_attribute_value':'code','compare_eq':'compare_arrows',
  'check_presence_to_continue':'alt_route','end_check_presence_to_continue':'stop',
  'print':'print','check_file_downloaded':'download',
  'ENTER':'keyboard_return','TAB':'keyboard_tab','DELETE':'backspace','CONTROL+A':'select_all',
  'custom':'edit','paste':'content_paste',
};

// ============ State ============
let currentFileName = '';
let testCases = [];
let currentIdx = -1;
let steps = [];
let breakpoints = new Set();
let selectedRowIdx = -1;
let dragSrcIdx = -1;
let isDirty = false;
let isReadOnly = false;
let findMatchText = '';
let findMatchIdx = -1;
let isRenaming = false;
function saveFileName() {
  const input = document.getElementById('fileRenameInput');
  const val = input.value.trim() || 'Test_case.csv';
  currentFileName = val.replace(/\.csv$/i, '');
  document.getElementById('fileInfoHeader').textContent = '▾ ' + val;
}
function exitRenameMode() {
  if (!isRenaming) return;
  saveFileName();
  isRenaming = false;
  document.getElementById('fileInfoHeader').style.display = 'block';
  document.getElementById('fileRenameInput').style.display = 'none';
  renderTcList();
}

// ============ Auto-save localStorage ============
function saveState() {
  const data = {
    testCases: testCases.map(tc => ({
      name: tc.name,
      steps: tc.steps.map(s => ({...s})),
      breakpoints: [...tc.breakpoints]
    })),
    currentIdx,
    currentFileName
  };
  localStorage.setItem('selEditor', JSON.stringify(data));
}
function loadState() {
  const raw = localStorage.getItem('selEditor');
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    testCases = data.testCases.map(tc => ({
      name: tc.name,
      steps: tc.steps.map(s => ({...s})),
      breakpoints: new Set(tc.breakpoints)
    }));
    currentIdx = Math.min(data.currentIdx, testCases.length - 1);
    currentFileName = data.currentFileName || '';
    if (currentIdx >= 0) {
      steps = testCases[currentIdx].steps;
      breakpoints = testCases[currentIdx].breakpoints;
    }
    return true;
  } catch { return false; }
}

// ============ Undo / Redo ============
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 50;
function takeSnapshot() {
  return {
    testCases: testCases.map(tc => ({
      name: tc.name,
      steps: tc.steps.map(s => ({...s})),
      breakpoints: new Set(tc.breakpoints)
    })),
    currentIdx
  };
}
function pushSnapshot() {
  undoStack.push(takeSnapshot());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
  saveState();
}
function updateUndoButtons() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  if (u) u.disabled = undoStack.length === 0;
  if (r) r.disabled = redoStack.length === 0;
}
function restoreSnapshot(snap) {
  testCases = snap.testCases.map(tc => ({
    name: tc.name,
    steps: tc.steps.map(s => ({...s})),
    breakpoints: new Set(tc.breakpoints)
  }));
  currentIdx = Math.min(snap.currentIdx, testCases.length - 1);
  if (currentIdx >= 0) {
    steps = testCases[currentIdx].steps;
    breakpoints = testCases[currentIdx].breakpoints;
  } else { steps = []; breakpoints = new Set(); }
  selectedRowIdx = -1;
  isDirty = true;
  renderAll();
  renderTcList();
  updateUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(takeSnapshot());
  restoreSnapshot(undoStack.pop());
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(takeSnapshot());
  restoreSnapshot(redoStack.pop());
}

// ============ Help Modal ============
function toggleHelp() {
  document.getElementById('helpModal').classList.toggle('hidden');
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('helpBtn').addEventListener('click', toggleHelp);
  document.getElementById('helpModal').addEventListener('click', function(e) {
    if (e.target === this) toggleHelp();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !document.getElementById('helpModal').classList.contains('hidden')) toggleHelp();
  });
});

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
  if (!loadState()) {
    document.getElementById('fileInfoHeader').textContent = '▾ Test_case.csv';
  } else {
    document.getElementById('fileInfoHeader').textContent = '▾ ' + (currentFileName || 'Test_case') + '.csv';
    renderAll();
  }
  renderButtons();
  renderTcList();
  document.getElementById('fileInput').addEventListener('change', loadCSV);
  document.getElementById('findBtn').addEventListener('mouseenter', async function() {
    try {
      const text = await navigator.clipboard.readText();
      this.title = text.length > 30 ? text.slice(0, 30) + '...' : text;
    } catch {}
  });
  document.getElementById('fileEditBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    isRenaming = !isRenaming;
    const label = document.getElementById('fileInfoHeader');
    const input = document.getElementById('fileRenameInput');
    if (isRenaming) {
      input.value = label.textContent.replace('▾ ', '');
      label.style.display = 'none'; input.style.display = 'block';
      input.focus(); input.select();
    } else {
      label.style.display = 'block'; input.style.display = 'none';
    }
    renderTcList();
  });
  document.addEventListener('click', function(e) {
    if (!isRenaming) return;
    if (e.target.closest('.file-info-row') || e.target.closest('.tc-list')) return;
    exitRenameMode();
  });
  document.getElementById('fileRenameInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveFileName();
      exitRenameMode();
    }
  });
  document.getElementById('fileRenameInput').addEventListener('blur', function() {
    if (!isRenaming) return;
    saveFileName();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.activeElement?.blur();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); undo(); }
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); redo(); }
    }
    if (e.key === 'Delete') {
      const active = document.activeElement;
      if (active && !active.closest('.steps-col.btns') && !active.closest('header')) {
        const row = active.closest('.step-tr');
        if (row) { pushSnapshot(); const action = steps[parseInt(row.dataset.idx)].a||'自訂'; steps.splice(parseInt(row.dataset.idx), 1); isDirty = true; selectedRowIdx = -1; renderAll(); e.preventDefault(); showToast(`已刪除步驟 ${parseInt(row.dataset.idx)+1} (${action})`); }
      }
    }
  });
  // Header hide on scroll (main scroll container + buttons panel)
  const header = document.querySelector('header');
  const midScroll = document.getElementById('midScroll');
  const stepsArea = document.getElementById('stepsArea');
  const btnCol = document.querySelector('.steps-col.btns');
  // Set initial padding-top on midScroll and btnCol for fixed header
  midScroll.style.paddingTop = header.offsetHeight + 'px';
  btnCol.style.paddingTop = header.offsetHeight + 'px';

  // Hover matching on syntax fields
  const scrollArea = document.getElementById('stepsArea');
  scrollArea.addEventListener('mouseover', e => {
    const wrap = e.target.closest('.fld-wrap.p1');
    if (!wrap) { clearHoverMatch(); return; }
    const inp = wrap.querySelector('.fld');
    if (inp) applyHoverMatch(inp.value);
  });
  scrollArea.addEventListener('mouseout', e => {
    const wrap = e.target.closest('.fld-wrap.p1');
    if (!wrap) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.step-tr')) return;
    clearHoverMatch();
  });
  // Select row on click (exclude textarea, delete btn, index, semantic tags)
  document.getElementById('stepBody').addEventListener('click', (e) => {
    const tr = e.target.closest('.step-tr');
    if (!tr) return;
    if (e.target.closest('.fld, .del-btn, .td-idx, .sem-val, .sem-path, .sem-hl')) return;
    const idx = parseInt(tr.dataset.idx);
    selectedRowIdx = selectedRowIdx === idx ? -1 : idx;
    updateSelectedVisual();
  });
  scrollArea.addEventListener('mouseover', e => {
    const tdSem = e.target.closest('.td-sem');
    if (!tdSem) return;
    const tr = tdSem.closest('.step-tr');
    if (!tr) { clearHoverMatch(); return; }
    const idx = tr.dataset.idx;
    const inp = document.querySelector(`.step-tr[data-idx="${idx}"] .fld-wrap.p1 .fld`);
    if (inp) applyHoverMatch(inp.value);
  });
  scrollArea.addEventListener('mouseout', e => {
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.step-tr')) return;
    clearHoverMatch();
  });
  // Welcome modal on first visit
  if (testCases.length === 0 && !sessionStorage.getItem('welcomeDismissed'))
    document.getElementById('welcomeModal').classList.remove('hidden');
  // Copy semantic tag on click
  document.getElementById('stepBody').addEventListener('click', (e) => {
    const tag = e.target.closest('.sem-val, .sem-path, .sem-hl');
    if (!tag || !tag.closest('.sem-cell')) return;
    navigator.clipboard.writeText(tag.textContent).then(() => {
      showToast('已複製');
    }).catch(() => {
      showToast('複製失敗');
    });
  });
  // Drag & drop step reordering
  const body = document.getElementById('stepBody');
  body.addEventListener('dragstart', e => {
    if (isReadOnly) return;
    const tr = e.target.closest('.step-tr'); if (!tr) return;
    if (e.target.closest('.fld, .del-btn, .td-idx, .sem-val, .sem-path, .sem-hl')) return;
    dragSrcIdx = parseInt(tr.dataset.idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });
  body.addEventListener('dragover', e => {
    const tr = e.target.closest('.step-tr'); if (!tr || dragSrcIdx < 0) return;
    e.preventDefault();
    body.querySelectorAll('.step-tr.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (parseInt(tr.dataset.idx) !== dragSrcIdx) tr.classList.add('drag-over');
  });
  body.addEventListener('drop', e => {
    const tr = e.target.closest('.step-tr'); if (!tr || dragSrcIdx < 0) return;
    e.preventDefault();
    let t = parseInt(tr.dataset.idx);
    if (dragSrcIdx === t) { dragSrcIdx = -1; return; }
    pushSnapshot();
    const [m] = steps.splice(dragSrcIdx, 1);
    if (t > dragSrcIdx) t--;
    steps.splice(t, 0, m);
    isDirty = true; renderAll();
    showToast(`已移動步驟`);
    requestAnimationFrame(() => {
      const row = body.querySelector(`[data-idx="${t}"]`);
      if (row) row.classList.add('drop-flash');
    });
    dragSrcIdx = -1;
  });
  body.addEventListener('dragend', () => {
    dragSrcIdx = -1;
    body.querySelectorAll('.step-tr.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
  // Easter egg: firework on title click
  document.querySelector('header h1').addEventListener('click', function(e) {
    const COLORS = ['#0a5cff','#1a73e8','#3b82f6','#60a5fa','#93bbfc','#2563eb','#1d4ed8','#0047b3','#6699ff','#3388ff'];
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const particles = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * 6.2832;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: e.clientX, y: e.clientY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: COLORS[Math.random() * COLORS.length | 0],
        life: 1, decay: 0.005 + Math.random() * 0.008
      });
    }
    let running = true;
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.05;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (alive) requestAnimationFrame(frame);
      else { document.body.removeChild(canvas); running = false; }
    }
    frame();
  });
});

// ============ Beforeunload ============
window.addEventListener('beforeunload', e => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = '';
});

function renderButtons() {
  const wrap = document.querySelector('.btn-list-wrap');
  wrap.querySelectorAll('.btn-group').forEach(el => el.remove());
  for (const g of BTN_GROUPS) {
    const grp = document.createElement('div');
    grp.className = 'btn-group';
    const lbl = document.createElement('div');
    lbl.className = 'btn-group-label';
    lbl.textContent = g.label;
    grp.appendChild(lbl);
    for (const item of g.items) {
      const btn = document.createElement('button');
      btn.className = 'key-btn' + (item.cls ? ' ' + item.cls : '');
      const iconName = BTN_ICONS[item.action];
      const iconHtml = iconName ? `<span class="material-symbols-outlined">${iconName}</span>` : '';
      btn.innerHTML = `<span class="kb-act">${item.action}</span>${iconHtml ? '<span class="kb-icon">'+iconHtml+'</span>' : ''}<span class="kb-desc">${item.desc}</span>`;
      if (item.extra) {
        btn.onclick = () => addStep(item.extra.val, item.extra.a);
      } else {
        btn.onclick = () => addStep(item.action);
      }
      grp.appendChild(btn);
    }
    wrap.appendChild(grp);
  }
}

// ============ CSV ============
function parseCSVLine(line) {
  const r = []; let c = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && i+1 < line.length && line[i+1] === '"') { c += '"'; i++; }
      else if (q) { q = false; }
      else if (c === '') { q = true; }
      else { c += ch; }
    } else if (ch === ',' && !q) { r.push(c); c = ''; }
    else { c += ch; }
  }
  r.push(c);
  return r;
}

function loadCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  pushSnapshot();
  currentFileName = file.name.replace(/\.csv$/i, '');
  const reader = new FileReader();
  reader.onload = function(ev) {
    const txt = ev.target.result;
    const lines = txt.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return;
    testCases = [];
    let totalErr = 0;
    for (const line of lines) {
      const cells = parseCSVLine(line);
      const name = cells[0] || '';
      const fixed = [cells[0]];
      for (let i = 1; i + 2 < cells.length; i += 3) {
        const p1 = cells[i] || '';
        const p2 = cells[i+1] || '';
        const a = cells[i+2] || '';
        if (p2 && a && ALL_ACTIONS.includes(p2) && ALL_ACTIONS.includes(a)) {
          fixed.push(p1, '', p2);
          fixed.push('', '', a);
        } else {
          fixed.push(p1, p2, a);
        }
      }
      const tcSteps = [];
      for (let i = 1; i + 2 < fixed.length; i += 3) {
        const a = fixed[i+2] || '';
        const unknown = a !== '' && !ALL_ACTIONS.includes(a);
        if (unknown) totalErr++;
        tcSteps.push({ p1: fixed[i] || '', p2: fixed[i+1] || '', a, _error: unknown || undefined });
      }
      testCases.push({ name, steps: tcSteps, breakpoints: new Set() });
    }
    if (testCases.length) {
      currentIdx = 0;
      steps = testCases[0].steps;
      breakpoints = testCases[0].breakpoints;
    }
    if (totalErr) showToast(`已載入，但有 ${totalErr} 列無法識別的操作（已標紅）`);
    document.getElementById('fileInfoHeader').textContent = '▾ ' + file.name;
    showToast('已載入 ' + file.name);
    isDirty = false;
    saveState();
    renderAll();
    renderTcList();
  };
  reader.onerror = () => { showToast('無法讀取檔案'); };
  reader.readAsText(file);
  e.target.value = '';
}

// ============ Actions ============
function addStep(param2, actionOverride) {
  pushSnapshot();
  if (currentIdx < 0) {
    const name = 'TC ' + (testCases.length + 1);
    testCases.push({ name, steps: [], breakpoints: new Set() });
    currentIdx = testCases.length - 1;
    steps = testCases[currentIdx].steps;
    breakpoints = testCases[currentIdx].breakpoints;
    renderTcList();
  }
  let action, val;
  if (actionOverride) {
    val = param2;
    action = actionOverride;
  } else if (param2 === 'custom') {
    action = '';
    val = '';
  } else if (param2) {
    action = param2;
    val = '';
  } else {
    action = '';
    val = '';
  }
  const newStep = { p1: '', p2: val, a: action };
  let idx;
  if (selectedRowIdx >= 0) {
    steps.splice(selectedRowIdx + 1, 0, newStep);
    idx = selectedRowIdx + 1;
    selectedRowIdx = -1;
  } else {
    steps.push(newStep);
    idx = steps.length - 1;
  }
  isDirty = true;
  renderAll();
  if (NEEDS_ELEMENT.includes(action)) {
    focusField(idx, 'p1');
  } else if (NEEDS_VALUE.includes(action)) {
    focusField(idx, 'p2');
  }
  const sp = document.getElementById('stepsArea');
  if (sp) {
    const row = document.querySelector(`.step-tr[data-idx="${idx}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function focusField(idx, field) {
  setTimeout(() => {
    const wrap = document.querySelector(`.step-tr[data-idx="${idx}"] .fld-wrap.${field}`);
    if (wrap) { const inp = wrap.querySelector('.fld'); if (inp) { inp.focus(); inp.select(); } }
  }, 50);
}

function updateSelectedVisual() {
  document.querySelectorAll('.step-tr.selected').forEach(el => el.classList.remove('selected'));
  if (selectedRowIdx >= 0) {
    const tr = document.querySelector(`.step-tr[data-idx="${selectedRowIdx}"]`);
    if (tr) tr.classList.add('selected');
  }
}

function createNewTC() {
  document.getElementById('welcomeModal').classList.add('hidden');
  sessionStorage.setItem('welcomeDismissed', '1');
  addStep('custom');
}
function triggerImport() {
  document.getElementById('welcomeModal').classList.add('hidden');
  sessionStorage.setItem('welcomeDismissed', '1');
  document.getElementById('fileInput').click();
}
function closeWelcome() {
  document.getElementById('welcomeModal').classList.add('hidden');
  sessionStorage.setItem('welcomeDismissed', '1');
}
function toggleReadOnly() {
  isReadOnly = !isReadOnly;
  document.body.classList.toggle('readonly', isReadOnly);
  document.getElementById('readOnlyBtn').innerHTML = isReadOnly
    ? '<span class="material-symbols-outlined">lock_open</span> 編輯'
    : '<span class="material-symbols-outlined">lock</span> 唯讀';
}

// ============ Rendering ============
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const SEM = {
  'open': {icon:'🌐', desc:(p1,p2)=>`開啟網頁 <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'URL'}</span>`},
  'pause': {icon:'⏳', desc:(p1,p2)=>`等待 <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'秒數'}</span> 秒 ⏰`},
  'click': {icon:'🖱️', desc:(p1)=>`點擊元素 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span>`},
  'type': {icon:'⌨️', desc:(p1,p2)=>`在 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 輸入 <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'値'}</span>`},
  'dropdown': {icon:'📋', desc:(p1,p2)=>`從 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 選 <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'選項'}</span>`},
  'press': {icon:'🔘', desc:(p1,p2)=>`在 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 按 <span class="sem-hl">${esc(p2)||''}</span>`},
  'present': {icon:'👁️', desc:(p1)=>`確認 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 存在於 DOM`},
  'visible': {icon:'👁️', desc:(p1)=>`確認 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 可見`},
  'not_present': {icon:'🚫', desc:(p1)=>`確認 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 不存在`},
  'not_visible': {icon:'👻', desc:(p1)=>`確認 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 不可見`},
  'assert_text': {icon:'✅', desc:(p1,p2)=>`斷言 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 文字 = <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'預期'}</span>`},
  'assert_attribute_value': {icon:'✅', desc:(p1,p2)=>`斷言 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 屬性 = <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'屬性名'}</span>`},
  'assert_class': {icon:'✅', desc:(p1,p2)=>`斷言 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> class = <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'class名'}</span>`},
  'get_text': {icon:'📝', desc:(p1,p2)=>`從 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 取文字 → <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'變數'}</span>`},
  'get_attribute_value':{icon:'📝', desc:(p1,p2)=>`從 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 取屬性 → <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'變數'}</span>`},
  'compare_eq':{icon:'⚖️', desc:(p1,p2)=>`比較 <span class="sem-val ${p1?'filled':'empty'}">${esc(p1)||'變數A'}</span> = <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'變數B'}</span>`},
  'check_presence_to_continue':{icon:'🔀', desc:(p1,p2)=>`若 <span class="sem-path ${p1?'filled':'empty'}">${esc(p1)||'路徑'}</span> 存在 → 執行以下區塊`},
  'end_check_presence_to_continue':{icon:'🔚', desc:()=>`結束條件區塊`},
  'print':{icon:'📢', desc:(p1)=>`輸出日誌: <span class="sem-val ${p1?'filled':'empty'}">${esc(p1)||'訊息'}</span>`},
  'check_file_downloaded':{icon:'📎', desc:(p1,p2)=>`確認下載: <span class="sem-val ${p2?'filled':'empty'}">${esc(p2)||'檔名'}</span>`},
};

const NEEDS_ELEMENT = ['click','type','dropdown','press','present','visible','not_present','not_visible',
  'assert_text','assert_attribute_value','assert_class','get_text','get_attribute_value','check_presence_to_continue','print'];
const NEEDS_VALUE = ['open','type','dropdown','press','assert_text','assert_attribute_value','assert_class',
  'get_text','get_attribute_value','compare_eq','check_file_downloaded','pause'];
const NEEDS_NUMERIC = ['pause'];
const ALL_ACTIONS = ['open','pause','click','type','dropdown','press','present','visible','not_present','not_visible',
  'assert_text','assert_attribute_value','assert_class','get_text','get_attribute_value','compare_eq',
  'check_presence_to_continue','end_check_presence_to_continue','print','check_file_downloaded'];

const ACTION_EMOJI = ['open','click','type','dropdown','press','print','get_text','get_attribute_value','compare_eq','check_file_downloaded'];

const VALIDATORS = {
  'pause': { p2: v => /^\d*$/.test(v) || '' },
  'open': { p2: v => v === '' || /^https?:\/\//.test(v) || v.startsWith('/') || '' },
};
const XPATH_ACTIONS = ['click','type','dropdown','press','present','visible','not_present','not_visible',
  'assert_text','assert_attribute_value','assert_class','get_text','get_attribute_value','check_presence_to_continue'];
const XPATH_VALIDATOR = v => v === '' || /^(\/\/?|\(|\.\/)/.test(v) || '';

const PH = {
  p1: {
    'open':'','click':'XPath','type':'XPath','dropdown':'XPath','press':'XPath',
    'present':'XPath','visible':'XPath','not_present':'XPath','not_visible':'XPath',
    'assert_text':'XPath','assert_attribute_value':'XPath','assert_class':'XPath',
    'get_text':'XPath','get_attribute_value':'XPath','check_presence_to_continue':'XPath',
    'print':'訊息','check_file_downloaded':'','compare_eq':'變數A',
    'pause':'','end_check_presence_to_continue':'',
  },
  p2: {
    'open':'URL','pause':'0-9','type':'値','dropdown':'選項','press':'按鍵',
    'assert_text':'預期文字','assert_attribute_value':'屬性名','assert_class':'class名',
    'get_text':'變數','get_attribute_value':'變數','compare_eq':'變數B',
    'check_file_downloaded':'檔名',
    'click':'','present':'','visible':'','not_present':'','not_visible':'','print':'',
    'end_check_presence_to_continue':'',
    'check_presence_to_continue':'',
  },
};

function renderAll() {
  const body = document.getElementById('stepBody');
  const empty = document.getElementById('emptyState');
  // Remove all step rows
  body.querySelectorAll('.step-tr').forEach(el => el.remove());

  if (steps.length === 0) {
    empty.style.display = 'block';
    document.getElementById('rowCount').textContent = '0 行';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('rowCount').textContent = steps.length + ' 行';

  let blockDepth = 0;
  const blockDepths = new Map();
  steps.forEach((step, i) => {
    const a = step.a || '';
    if (a === 'check_presence_to_continue') blockDepth++;
    blockDepths.set(i, blockDepth);
    if (a === 'end_check_presence_to_continue') blockDepth = Math.max(0, blockDepth - 1);
  });

  const unmatchedCheck = new Set();
  const unmatchedEnd = new Set();
  const blockStack = [];
  steps.forEach((step, i) => {
    if (step.a === 'check_presence_to_continue') blockStack.push(i);
    else if (step.a === 'end_check_presence_to_continue') {
      if (blockStack.length) blockStack.pop();
      else unmatchedEnd.add(i);
    }
  });
  blockStack.forEach(i => unmatchedCheck.add(i));

  const actColors = {
    'open':'#059669','pause':'#059669','click':'#7c3aed','type':'#7c3aed','dropdown':'#7c3aed','press':'#7c3aed',
    'present':'#059669','visible':'#059669','not_present':'#059669','not_visible':'#059669',
    'assert_text':'#ea580c','assert_attribute_value':'#ea580c','assert_class':'#ea580c',
    'get_text':'#8b5cf6','get_attribute_value':'#8b5cf6','compare_eq':'#8b5cf6',
    'check_presence_to_continue':'#d97706','end_check_presence_to_continue':'#d97706',
    'print':'#6b7280','check_file_downloaded':'#6b7280',
  };

  steps.forEach((step, i) => {
    const a = step.a || '';
    const bd = blockDepths.get(i) || 0;

    const tr = document.createElement('tr');
    tr.className = 'step-tr' + (step._error ? ' row-error' : '');
    tr.draggable = !isReadOnly;
    tr.dataset.idx = i;

    // ── TD index ──
    const tdIdx = document.createElement('td');
    tdIdx.className = 'td-idx';
    const num = document.createElement('span');
    num.className = 'num' + (breakpoints.has(i) ? ' bp' : '');
    num.textContent = i + 1;
    num.title = '左鍵: 標記斷點 | 右鍵: 複製該行';
    num.onclick = () => {
      pushSnapshot();
      if (breakpoints.has(i)) breakpoints.delete(i); else breakpoints.add(i);
      num.classList.toggle('bp');
    };
    num.oncontextmenu = (e) => {
      e.preventDefault();
      const csvLine = [step.p1||'', step.p2||'', step.a||''].map(c => c.includes(',') ? '"'+c.replace(/"/g,'""')+'"' : c).join(',');
      navigator.clipboard.writeText(csvLine).then(() => showToast('已複製步驟 ' + (i+1))).catch(() => showToast('複製失敗'));
    };
    tdIdx.appendChild(num);
    tr.appendChild(tdIdx);

    // ── TD syntax ──
    const tdSyn = document.createElement('td');
    tdSyn.className = 'td-syn' + (bd > 0 ? ' has-block' : '');
    const grid = document.createElement('div');
    grid.className = 'syn-grid' + (a === 'print' ? ' syn-grid--print' : '');


    const ph1 = (PH.p1[a] || (NEEDS_ELEMENT.includes(a) ? 'XPath' : ''));
    const p1w = makeFieldWrap('p1', step, a, NEEDS_ELEMENT, ph1);
    grid.appendChild(p1w);

    if (a !== 'print') {
      const c1 = document.createElement('span');
      c1.className = 'comma'; c1.textContent = ',';
      grid.appendChild(c1);

      const ph2 = PH.p2[a] || '';
      const p2w = makeFieldWrap('p2', step, a, NEEDS_VALUE, ph2);
      if (NEEDS_NUMERIC.includes(a)) { const inp = p2w.querySelector('.fld'); inp.inputMode = 'numeric'; }
      grid.appendChild(p2w);

      const c2 = document.createElement('span');
      c2.className = 'comma'; c2.textContent = ',';
      grid.appendChild(c2);
    }

    // Action
    if (a === '') {
      const actInp = document.createElement('textarea');
      actInp.className = 'fld';
      actInp.rows = 1; actInp.placeholder = '動作';
      actInp.style.cssText = 'font-size:12px;font-weight:600;text-align:right;min-height:28px;resize:none;overflow:hidden;padding:2px 4px;font-family:var(--mono);border:2px solid var(--border);border-radius:4px;background:var(--surface)';
      const grow = () => { actInp.style.height = 'auto'; actInp.style.height = Math.max(actInp.scrollHeight, 28) + 'px'; };
      actInp.oninput = () => { step.a = actInp.value; grow(); };
      grow();
      grid.appendChild(actInp);
    } else {
    const actLbl = document.createElement('span');
    actLbl.className = 'act-lbl';
    actLbl.textContent = a;
    actLbl.style.color = actColors[a] || '#6b7280';
    grid.appendChild(actLbl);
    }

    const del = document.createElement('button');
    del.className = 'del-btn'; del.textContent = '✕';
    del.onclick = () => { pushSnapshot(); const action = steps[i].a||'自訂'; steps.splice(i, 1); isDirty = true; selectedRowIdx = -1; renderAll(); showToast(`已刪除步驟 ${i+1} (${action})`); };
    grid.appendChild(del);

    tdSyn.appendChild(grid);
    tr.appendChild(tdSyn);

    // ── TD semantic ──
    const tdSem = document.createElement('td');
    tdSem.className = 'td-sem';
    const semSpan = document.createElement('span');
    semSpan.className = 'sem-cell';
    if (step._error) {
      semSpan.innerHTML = `<span class="sem-prefix"></span><span style="color:var(--danger);font-weight:600">⚠ 無法識別的操作: ${esc(a)}</span>`;
    } else if (unmatchedCheck.has(i)) {
      semSpan.innerHTML = '<span class="sem-prefix"></span><span style="color:var(--danger);background:#fef2f2;padding:0 6px;border-radius:4px;font-weight:600">⚠ 缺少 end</span>';
      semSpan.title = '此 check_presence 沒有對應的 end_check_presence_to_continue';
    } else if (unmatchedEnd.has(i)) {
      semSpan.innerHTML = '<span class="sem-prefix"></span><span style="color:var(--danger);background:#fef2f2;padding:0 6px;border-radius:4px;font-weight:600">⚠ 缺少 check_presence_to_continue</span>';
      semSpan.title = '此 end_check 沒有對應的 check_presence_to_continue';
    } else if (a === '') {
      semSpan.innerHTML = '<span class="sem-prefix"></span>自定義指令';
    } else if (SEM[a]) {
      const isOp = ACTION_EMOJI.includes(a);
      semSpan.innerHTML = '<span class="sem-prefix">' + (isOp ? '▶' : '-') + '</span> ' + SEM[a].desc(step.p1, step.p2);
    } else {
      semSpan.innerHTML = '<span class="sem-prefix"></span><span class="sem-hl">' + esc(a) + '</span> p1=<span class="sem-val ' + (step.p1?'filled':'empty') + '">' + esc(step.p1) + '</span> p2=<span class="sem-val ' + (step.p2?'filled':'empty') + '">' + esc(step.p2) + '</span>';
    }
    tdSem.appendChild(semSpan);
    tr.appendChild(tdSem);

    body.appendChild(tr);
  });

  updateSelectedVisual();
}

function getValidator(a, cls) {
  const actionVal = VALIDATORS[a];
  if (actionVal && actionVal[cls]) return actionVal[cls];
  if (cls === 'p1' && XPATH_ACTIONS.includes(a)) return XPATH_VALIDATOR;
  return null;
}

function syncBadge(wrap) {
  const inp = wrap.querySelector('.fld');
  const badge = wrap.querySelector('.fld-badge');
  if (inp && badge) badge.classList.toggle('danger', inp.classList.contains('danger'));
}

function validateField(inp, a, cls) {
  const vfn = getValidator(a, cls);
  if (!vfn || !inp.value) return true;
  const result = vfn(inp.value);
  if (result === '') {
    inp.classList.add('danger');
    return false;
  }
  inp.classList.remove('danger');
  return true;
}

function makeFieldWrap(cls, step, a, needsList, placeholder) {
  const wrap = document.createElement('div');
  wrap.className = 'fld-wrap ' + cls;
  if (step[cls]) wrap.classList.add('has-value');

  const badge = document.createElement('div');
  badge.className = 'fld-badge';
  badge.textContent = step[cls] || placeholder;
  badge.onclick = () => { const inp = wrap.querySelector('.fld'); if (inp) { inp.focus(); inp.select(); } };
  wrap.appendChild(badge);

  const inp = document.createElement('textarea');
  inp.className = 'fld';
  inp.value = step[cls];
  inp.placeholder = placeholder;
  inp.rows = 1;
  inp.readOnly = a !== '' && !needsList.includes(a);
  if (inp.readOnly) wrap.classList.add('fld-ro');
  inp.addEventListener('focus', function() {
    if (!this.dataset.snap) { pushSnapshot(); this.dataset.snap = '1'; }
  });
  inp.addEventListener('blur', function() {
    this.dataset.snap = '';
  });
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
  });
  if (a !== '' && needsList.includes(a) && !(a === 'assert_attribute_value' && cls === 'p2') && !(a === 'assert_text' && cls === 'p2') && !step[cls]) inp.classList.add('danger');
  syncBadge(wrap);
  const autoGrow = () => {
    const hidden = inp.offsetParent === null;
    if (hidden) { inp.style.visibility = 'hidden'; inp.style.display = 'block'; }
    inp.style.height = 'auto';
    inp.style.height = Math.max(inp.scrollHeight, 28) + 'px';
    if (hidden) { inp.style.display = ''; inp.style.visibility = ''; }
  };
  const doUpdate = () => {
    step[cls] = inp.value;
    isDirty = true;
    autoGrow();
    if (inp.value) {
      inp.classList.remove('danger');
      wrap.classList.add('has-value');
      badge.textContent = inp.value;
      validateField(inp, a, cls);
      syncBadge(wrap);
    } else {
      wrap.classList.remove('has-value');
      badge.textContent = placeholder;
      if (a !== '' && needsList.includes(a) && !(a === 'assert_attribute_value' && cls === 'p2') && !(a === 'assert_text' && cls === 'p2')) inp.classList.add('danger');
      syncBadge(wrap);
    }
  };
  inp.oninput = doUpdate;
  inp.onblur = () => {
    if (a !== '' && needsList.includes(a) && !(a === 'assert_attribute_value' && cls === 'p2') && !(a === 'assert_text' && cls === 'p2') && !step[cls]) inp.classList.add('danger');
    else if (step[cls]) validateField(inp, a, cls);
    syncBadge(wrap);
  };
  inp.ondblclick = async () => {
    if (inp.readOnly) return;
    try {
      const t = await navigator.clipboard.readText();
      inp.value = t;
      step[cls] = t;
      isDirty = true;
      doUpdate();
      showToast('已貼上');
    } catch(e) {
      showToast('無法讀取剪貼簿');
    }
  };
  wrap.appendChild(inp);
  setTimeout(autoGrow, 0); // init height for existing value

  return wrap;
}

function updateBadge(wrap, val) {
  const badge = wrap.querySelector('.fld-badge');
  const inp = wrap.querySelector('.fld');
  if (badge) badge.textContent = val || inp?.placeholder || '—';
  if (val) wrap.classList.add('has-value');
  else wrap.classList.remove('has-value');
}

// ============ Validate ============
function hasValidationErrors() {
  if (!testCases.length) return '沒有 Test Case';
  for (const tc of testCases) {
    if (!tc.name.trim()) return '請填寫所有 Test Case 名稱';
    for (let i = 0; i < tc.steps.length; i++) {
      const s = tc.steps[i]; const a = s.a;
      if (NEEDS_ELEMENT.includes(a) && !s.p1) return `TC「${tc.name}」步驟 ${i+1}（${a}）：缺少路徑`;
      if (NEEDS_VALUE.includes(a) && !s.p2 && a !== 'pause' && a !== 'assert_attribute_value') return `TC「${tc.name}」步驟 ${i+1}（${a}）：缺少値`;
      if (a === 'pause' && s.p2 && !/^\d*$/.test(s.p2)) return `TC「${tc.name}」步驟 ${i+1}（pause）：秒數須為數字`;
      if (a === 'open' && s.p2 && !/^https?:\/\//.test(s.p2) && !s.p2.startsWith('/')) return `TC「${tc.name}」步驟 ${i+1}（open）：URL 格式不正確`;
      if (XPATH_ACTIONS.includes(a) && s.p1 && !/^(\/\/?|\(|\.\/)/.test(s.p1)) return `TC「${tc.name}」步驟 ${i+1}（${a}）：XPath 格式不正確`;
    }
  }
  return null;
}

// ============ Save ============
function saveCSV() {
  const err = hasValidationErrors();
  if (err) { showToast(err); return; }
  const lines = testCases.map(tc => {
    const cells = [tc.name.trim()];
    for (const s of tc.steps) { cells.push(s.p1||'', s.p2||'', s.a||''); }
    return cells.map(c => c.includes(',') ? '"'+c.replace(/"/g,'""')+'"' : c).join(',');
  });
  const blob = new Blob([lines.join('\r\n')+'\r\n'], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fname = currentFileName || 'test_cases';
  a.href = url; a.download = fname+'.csv'; a.click();
  URL.revokeObjectURL(url);
  isDirty = false;
  saveState();
  showToast('已儲存 CSV');
}

// ============ Clear ============
function clearAll() {
  if (testCases.some(tc => tc.steps.length) && !confirm('確定清空所有 Test Case？')) return;
  pushSnapshot();
  testCases = []; currentIdx = -1; steps = []; breakpoints = new Set(); selectedRowIdx = -1;
  currentFileName = 'Test_case';
  document.getElementById('fileInfoHeader').textContent = '▾ Test_case.csv';
  isDirty = false;
  localStorage.removeItem('selEditor');
  renderAll();
  renderTcList();
}

// ============ Copy TC ============
function copyTC() {
  if (currentIdx < 0) { showToast('沒有 Test Case'); return; }
  const tc = testCases[currentIdx];
  if (tc.steps.some(s => s._error)) { showToast('有欄位錯誤，先修正再複製'); return; }
  const cells = [tc.name || 'Untitled'];
  for (const s of tc.steps) { cells.push(s.p1||'', s.p2||'', s.a||''); }
  const csvLine = cells.map(c => c.includes(',') ? '"'+c.replace(/"/g,'""')+'"' : c).join(',');
  navigator.clipboard.writeText(csvLine).then(() => {
    showToast('已複製 testcase 到剪貼簿');
  }).catch(() => {
    showToast('複製失敗');
  });
}

// ============ TC Explorer ============
function renderTcList() {
  const list = document.getElementById('tcList');
  if (!list) return;
  list.innerHTML = '';
  testCases.forEach((tc, i) => {
    if (isRenaming) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'tc-list-input';
      inp.value = tc.name || '';
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          pushSnapshot();
          testCases[i].name = this.value.trim() || `TC ${i+1}`;
          exitRenameMode();
        }
      });
      inp.addEventListener('blur', function() {
        const v = this.value.trim() || `TC ${i+1}`;
        if (v !== (tc.name || `TC ${i+1}`)) { pushSnapshot(); testCases[i].name = v; }
        renderTcList();
      });
      list.appendChild(inp);
    } else {
      const item = document.createElement('div');
      item.className = 'tc-list-item' + (i === currentIdx ? ' active' : '');
      item.textContent = tc.name || `TC ${i+1}`;
      item.onclick = () => switchTC(i);
      list.appendChild(item);
    }
  });
}
function switchTC(idx) {
  if (idx === currentIdx || idx < 0 || idx >= testCases.length) return;
  currentIdx = idx;
  steps = testCases[idx].steps;
  breakpoints = testCases[idx].breakpoints;
  selectedRowIdx = -1;
  renderAll();
  renderTcList();
}

// ============ Hover matching ============
let hoverTimer = null;
function applyHoverMatch(val) {
  if (!val) { clearHoverMatch(); return; }
  clearTimeout(hoverTimer);
  document.querySelectorAll('.fld-wrap.p1 .fld').forEach(el => {
    el.classList.toggle('match-hover', el.value === val);
  });
}
function clearHoverMatch() {
  document.querySelectorAll('.fld.p1.match-hover').forEach(el => el.classList.remove('match-hover'));
}

// ============ Drag & Drop ============
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('dragover', e => {
    if (e.target.closest('#stepBody')) return;
    e.preventDefault();
  });
  document.body.addEventListener('drop', e => {
    if (e.target.closest('#stepBody')) return;
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length && files[0].name.endsWith('.csv')) {
      const inp = document.getElementById('fileInput');
      const dt = new DataTransfer(); dt.items.add(files[0]);
      inp.files = dt.files; inp.dispatchEvent(new Event('change'));
    }
  });
});

// ============ Find Clipboard ============
function findClipboard() {
  navigator.clipboard.readText().then(text => {
    if (!text.trim()) { showToast('剪貼簿為空'); return; }
    const rows = document.querySelectorAll('.step-tr');
    document.querySelectorAll('.step-tr.find-match').forEach(el => el.classList.remove('find-match'));
    if (text !== findMatchText) { findMatchIdx = -1; findMatchText = text; }
    let found = false;
    for (let i = findMatchIdx + 1; i < rows.length; i++) {
      const syn = rows[i].querySelector('.td-syn');
      const sem = rows[i].querySelector('.td-sem');
      const content = syn?.textContent + ' ' + sem?.textContent;
      if (content.includes(text)) {
        rows[i].classList.add('find-match');
        rows[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        findMatchIdx = i;
        found = true;
        showToast(`找到第 ${i+1} 行`);
        break;
      }
    }
    if (!found) {
      if (findMatchIdx >= 0) {
        findMatchIdx = -1;
        findClipboard();
        return;
      }
      showToast('未找到匹配');
    }
  }).catch(() => showToast('無法讀取剪貼簿'));
}

// ============ Toast ============
function showToast(m) {
  const t = document.getElementById('toast');
  t.textContent = m; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}
