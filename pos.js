/* ============================================
   Bang EX — Logistics Job Order System
   pos.js
   ============================================ */

// ===== DATA =====
const trucks = [
  { id:'moto',   icon:'🛵', name:'มอเตอร์ไซค์',  cap:'ไม่เกิน 30 กก.', pricePerHr:150,  badge:'FAST' },
  { id:'sedan',  icon:'🚗', name:'รถเก๋ง',        cap:'ไม่เกิน 200 กก.', pricePerHr:250, badge:'' },
  { id:'van',    icon:'🚐', name:'รถตู้ห้องเย็น',  cap:'ไม่เกิน 800 กก.', pricePerHr:450, badge:'COLD' },
  { id:'4w',     icon:'🚛', name:'4 ล้อ',         cap:'ไม่เกิน 2 ตัน',  pricePerHr:600, badge:'' },
  { id:'6w',     icon:'🚚', name:'6 ล้อ',         cap:'ไม่เกิน 5 ตัน',  pricePerHr:900, badge:'' },
  { id:'10w',    icon:'🏗️', name:'10 ล้อ',        cap:'ไม่เกิน 15 ตัน', pricePerHr:1400, badge:'HEAVY' },
];

const addons = [
  { id:'helper',   icon:'👷', name:'พนักงานยกของ',      desc:'1 คน ช่วยยก-ขน',           price:300 },
  { id:'helper2',  icon:'👷‍♂️', name:'พนักงานยกของ x2',  desc:'2 คน ช่วยยก-ขน',           price:550 },
  { id:'packing',  icon:'📦', name:'บริการแพ็คสินค้า',  desc:'กล่อง+กันกระแทก',           price:200 },
  { id:'express',  icon:'⚡', name:'Express (ด่วน)',     desc:'เพิ่มลำดับความสำคัญ',       price:350 },
  { id:'insure',   icon:'🛡️', name:'ประกันสินค้า',     desc:'คุ้มครองสูงสุด 50,000 บาท', price:150 },
  { id:'photo',    icon:'📸', name:'บันทึกภาพ',         desc:'ถ่ายรูปก่อน-หลังส่ง',       price:100 },
];

const presetLocations = [
  '🏭 นิคมอุตสาหกรรมลาดกระบัง',
  '🏪 ซีพี ออลล์ สำนักงานใหญ่',
  '✈️ สนามบินสุวรรณภูมิ',
  '🏬 มาบุญครอง MBK',
  '🏗️ คลังสินค้า บางนา กม.18',
  '🏥 โรงพยาบาลบำรุงราษฎร์',
  '🏢 สาทร สแควร์',
  '🏭 นิคมฯ อมตะซิตี้ ชลบุรี',
];

const banksList = [
  { name: 'PromptPay', account: '098-005-4338', color: '#512da8', flag: '🟣' },
  { name: 'SCB', account: '405-2-XXXXX-X', color: '#4a148c', flag: '🟣' },
  { name: 'KBank', account: '120-3-XXXXX-0', color: '#1b5e20', flag: '🟢' },
];

// ===== STATE =====
let state = {
  step: 1,
  truck: null,
  hours: 4,
  addons: [],
  tempMode: 'ห้องเย็น -18°C',
  cName:'', cPhone:'', cType:'นิติบุคคล',
  originAddr:'', destAddr:'',
  originPinned: false, destPinned: false,
  originCoords: null, destCoords: null,
  pickDate:'', pickTime:'',
  payTiming:'ต้นทาง',
  payMethod:'qr',
  discount: 0,
  jobCounter: 1,
};
let timerInterval = null;
let currentMapTarget = 'origin';

// ===== CLOCK =====
function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderTrucks();
  renderAddons();
  const today = new Date().toISOString().split('T')[0];
  const tEl = document.getElementById('pickDate');
  if (tEl) tEl.value = today;
  state.pickDate = today;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const tmEl = document.getElementById('pickTime');
  if (tmEl) tmEl.value = `${hh}:${mm}`;
  state.pickTime = `${hh}:${mm}`;

  recalc();
  renderPresets();
});

// ===== STEP NAVIGATION =====
function stepTab(n) {
  return document.querySelector(`[data-step="${n}"]`);
}

function goStep(n, tabEl) {
  // Save inputs on step change
  saveCurrentInputs();

  document.querySelectorAll('.step-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById(`step${n}`);
  if (panel) panel.classList.remove('hidden');
  if (tabEl) tabEl.classList.add('active');
  state.step = n;

  if (n === 4) buildSummary();
  updateRightPanel();
  recalc();
}

function saveCurrentInputs() {
  const get = (id) => (document.getElementById(id)||{}).value || '';
  state.cName    = get('cName');
  state.cPhone   = get('cPhone');
  state.cEmail   = get('cEmail');
  state.cNote    = get('cNote');
  state.originAddr = get('originAddr');
  state.destAddr   = get('destAddr');
  state.pickDate   = get('pickDate');
  state.pickTime   = get('pickTime');
  state.hours      = parseInt(document.getElementById('hoursNum')?.textContent || 4);
  state.discount   = parseFloat(get('discountInput')) || 0;
  updateRightPanel();
}

// ===== CHIP SELECTOR =====
function setChip(groupId, hiddenId, el, val) {
  const group = document.getElementById(groupId);
  if (group) group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = val;

  // Update state
  if (hiddenId === 'tempMode') state.tempMode = val;
  if (hiddenId === 'cType')    state.cType    = val;
  if (hiddenId === 'payTiming') { state.payTiming = val; updateRightPanel(); }

  recalc();
}

// ===== TRUCK SELECTION =====
function renderTrucks() {
  const grid = document.getElementById('truckGrid');
  if (!grid) return;
  grid.innerHTML = trucks.map(t => `
    <div class="truck-card" id="truck-${t.id}" onclick="selectTruck('${t.id}')">
      ${t.badge ? `<div class="truck-badge">${t.badge}</div>` : ''}
      <span class="truck-icon">${t.icon}</span>
      <div class="truck-name">${t.name}</div>
      <div class="truck-cap">${t.cap}</div>
      <div class="truck-price">฿${t.pricePerHr.toLocaleString()}/ชม.</div>
    </div>
  `).join('');
}

function selectTruck(id) {
  document.querySelectorAll('.truck-card').forEach(c => c.classList.remove('selected'));
  const el = document.getElementById(`truck-${id}`);
  if (el) el.classList.add('selected');
  state.truck = trucks.find(t => t.id === id);
  recalc();
  updateRightPanel();
}

// ===== HOUR SELECTOR =====
function adjustHours(delta) {
  state.hours = Math.max(2, state.hours + delta);
  const el = document.getElementById('hoursNum');
  if (el) el.textContent = state.hours;
  // update preset buttons
  document.querySelectorAll('.hour-pre-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === state.hours);
  });
  recalc();
  updateRightPanel();
}

function setHours(h) {
  state.hours = h;
  const el = document.getElementById('hoursNum');
  if (el) el.textContent = h;
  document.querySelectorAll('.hour-pre-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === h);
  });
  recalc();
  updateRightPanel();
}

// ===== ADD-ONS =====
function renderAddons() {
  const list = document.getElementById('addonList');
  if (!list) return;
  list.innerHTML = addons.map(a => `
    <div class="addon-item" id="addon-${a.id}" onclick="toggleAddon('${a.id}')">
      <div class="addon-check">✓</div>
      <span class="addon-icon">${a.icon}</span>
      <div class="addon-info">
        <div class="addon-name">${a.name}</div>
        <div class="addon-desc">${a.desc}</div>
      </div>
      <div class="addon-price-tag">+฿${a.price.toLocaleString()}</div>
    </div>
  `).join('');
}

function toggleAddon(id) {
  const el = document.getElementById(`addon-${id}`);
  const idx = state.addons.indexOf(id);
  if (idx === -1) {
    state.addons.push(id);
    el.classList.add('selected');
  } else {
    state.addons.splice(idx, 1);
    el.classList.remove('selected');
  }
  recalc();
  updateRightPanel();
}

// ===== COST CALC =====
function getBaseCost() {
  if (!state.truck) return 0;
  return state.truck.pricePerHr * state.hours;
}

function getAddonCost() {
  return state.addons.reduce((sum, id) => {
    const a = addons.find(x => x.id === id);
    return sum + (a ? a.price : 0);
  }, 0);
}

function recalc() {
  const discEl = document.getElementById('discountInput');
  const disc = Math.min(parseFloat((discEl||{}).value)||0, 100);
  state.discount = disc;

  const base    = getBaseCost();
  const addon   = getAddonCost();
  const subtot  = base + addon;
  const discAmt = subtot * disc / 100;
  const after   = subtot - discAmt;
  const vat     = after * 0.07;
  const grand   = after + vat;

  const fmt = (n) => n.toLocaleString('th',{minimumFractionDigits:0, maximumFractionDigits:0});
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };

  set('baseCost',  `฿${fmt(base)}`);
  set('addonCost', `฿${fmt(addon)}`);
  set('discountAmt', `-฿${fmt(discAmt)}`);
  set('vatAmt',    `฿${fmt(vat)}`);
  set('grandTotal', fmt(grand));

  const chargeBtn = document.getElementById('chargeBtn');
  if (chargeBtn) chargeBtn.disabled = !state.truck;

  // badge
  const badge = document.getElementById('itemCountBadge');
  if (badge) badge.textContent = state.truck ? (1 + state.addons.length) : 0;
}

function getGrandTotal() {
  const base  = getBaseCost();
  const addon = getAddonCost();
  const subtot = base + addon;
  const disc  = Math.min(state.discount||0, 100);
  const after  = subtot * (1 - disc/100);
  return Math.round(after * 1.07);
}

// ===== UPDATE RIGHT PANEL =====
function updateRightPanel() {
  
  const container = document.getElementById('orderItems');
  if (!container) return;

  if (!state.truck) {
    container.innerHTML = `<div class="order-empty"><div class="order-empty-icon">🚛</div><div class="order-empty-text">กรอกข้อมูลด้านซ้าย</div></div>`;
    return;
  }

  const addonNames = state.addons.map(id => addons.find(a=>a.id===id)?.name || '').filter(Boolean);

  container.innerHTML = `
    <div class="job-card">
      <div class="job-section">
        <div class="job-sec-label">รถขนส่ง</div>
        <div class="job-sec-val">${state.truck.icon} ${state.truck.name} · ${state.hours} ชม.</div>
        <div style="margin-top:4px">
          <span class="job-tag">${state.tempMode}</span>
          ${addonNames.map(n=>`<span class="job-tag red">${n}</span>`).join('')}
        </div>
      </div>

      ${state.cName ? `
      <div class="job-section">
        <div class="job-sec-label">ลูกค้า</div>
        <div class="job-sec-val">${state.cName}</div>
        ${state.cPhone ? `<div style="font-size:13px;color:rgba(255,255,255,0.45);margin-top:2px">📞 ${state.cPhone}</div>` : ''}
        <span class="job-tag green">${state.cType}</span>
      </div>` : ''}

      ${state.originAddr || state.destAddr ? `
      <div class="job-section">
        <div class="job-sec-label">เส้นทาง</div>
        ${state.originAddr ? `
        <div class="job-route-row">
          <div class="job-route-icon">📍</div>
          <div class="job-route-addr">${state.originAddr}${state.originPinned?' <span style="color:var(--green);font-size:10px">✓ ปักหมุด</span>':''}</div>
        </div>` : ''}
        ${state.destAddr ? `
        <div class="job-route-row">
          <div class="job-route-icon">🏁</div>
          <div class="job-route-addr">${state.destAddr}${state.destPinned?' <span style="color:var(--green);font-size:10px">✓ ปักหมุด</span>':''}</div>
        </div>` : ''}
      </div>` : ''}

      ${state.pickDate ? `
      <div class="job-section">
        <div class="job-sec-label">วันเวลา</div>
        <div class="job-sec-val">📅 ${state.pickDate}${state.pickTime ? ' ⏰ '+state.pickTime : ''}</div>
      </div>` : ''}

      <div class="job-section">
        <div class="job-sec-label">ชำระเงิน</div>
        <div class="job-sec-val">${state.payTiming === 'ต้นทาง' ? '🏠 ต้นทาง (ก่อนส่ง)' : '🏁 ปลายทาง (หลังส่ง)'}</div>
      </div>
    </div>`;
}

// ===== MAP =====
function openMap(target) {
  currentMapTarget = target;
  const titleEl = document.getElementById('mapModalTitle');
  if (titleEl) titleEl.textContent = target === 'origin' ? '📍 ปักหมุดต้นทาง' : '🏁 ปักหมุดปลายทาง';

  const addrInput = document.getElementById('mapAddrInput');
  if (addrInput) addrInput.value = target === 'origin' ? (state.originAddr||'') : (state.destAddr||'');

  const pin = document.getElementById('droppedPin');
  if (pin) pin.classList.add('hidden');

  const modal = document.getElementById('mapModal');
  if (modal) modal.classList.add('open');
}

function closeMapModal() {
  const modal = document.getElementById('mapModal');
  if (modal) modal.classList.remove('open');
}

function renderPresets() {
  const container = document.getElementById('presetChips');
  if (!container) return;
  container.innerHTML = presetLocations.map(loc => `
    <button class="preset-chip" onclick="usePreset('${loc.replace(/'/g,"\'")}')">${loc}</button>
  `).join('');
}

function usePreset(loc) {
  const addrInput = document.getElementById('mapAddrInput');
  if (addrInput) addrInput.value = loc;
  simulatePinDrop(loc);
}

function handleMapClick(e) {
  const map = document.getElementById('mapInteractive');
  if (!map) return;
  const rect = map.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);

  const pin = document.getElementById('droppedPin');
  if (pin) {
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
    pin.classList.remove('hidden');
    const labelEl = document.getElementById('droppedPinLabel');
    if (labelEl) labelEl.textContent = currentMapTarget === 'origin' ? 'ต้นทาง' : 'ปลายทาง';
  }

  const hint = document.querySelector('.map-crosshair-label');
  if (hint) hint.style.display = 'none';
}

function simulatePinDrop(address) {
  const pin = document.getElementById('droppedPin');
  if (pin) {
    pin.style.left = `${30 + Math.random()*40}%`;
    pin.style.top = `${30 + Math.random()*40}%`;
    pin.classList.remove('hidden');
    const labelEl = document.getElementById('droppedPinLabel');
    if (labelEl) labelEl.textContent = address.substring(0, 15) + '...';
    const hint = document.querySelector('.map-crosshair-label');
    if (hint) hint.style.display = 'none';
  }
}

function confirmMapPin() {
  const addrInput = document.getElementById('mapAddrInput');
  const addr = (addrInput||{}).value || '';

  if (currentMapTarget === 'origin') {
    state.originAddr = addr;
    state.originPinned = true;
    const inp = document.getElementById('originAddr');
    if (inp) inp.value = addr;
    const status = document.getElementById('originPinStatus');
    if (status) { status.textContent = '✓ ปักหมุดแล้ว'; status.className = 'pin-status pinned'; }
  } else {
    state.destAddr = addr;
    state.destPinned = true;
    const inp = document.getElementById('destAddr');
    if (inp) inp.value = addr;
    const status = document.getElementById('destPinStatus');
    if (status) { status.textContent = '✓ ปักหมุดแล้ว'; status.className = 'pin-status pinned'; }
  }

  // Simulate distance
  if (state.originPinned && state.destPinned) {
    const dist = Math.floor(15 + Math.random() * 60);
    const el = document.getElementById('distKm');
    if (el) el.textContent = dist;
    const hint = document.getElementById('mapHint');
    if (hint) hint.textContent = `ระยะทางโดยประมาณ ${dist} กม.`;
  }

  updateRightPanel();
  closeMapModal();
}

// ===== SUMMARY STEP =====
function buildSummary() {
  saveCurrentInputs();
  const box = document.getElementById('summaryBox');
  if (!box) return;

  const addonNames = state.addons.map(id => addons.find(a=>a.id===id)?.name||'').filter(Boolean);
  const base  = getBaseCost();
  const addon = getAddonCost();
  const disc  = Math.min(state.discount||0,100);
  const subtot = base + addon;
  const discAmt = subtot * disc / 100;
  const after  = subtot - discAmt;
  const vat    = after * 0.07;
  const grand  = after + vat;
  const fmt = (n) => n.toLocaleString('th',{minimumFractionDigits:0});

  box.innerHTML = `
    <div class="sum-section">
      <div class="sum-section-title">ข้อมูลลูกค้า</div>
      <div class="sum-row"><span class="k">ชื่อ</span><span class="v">${state.cName||'—'}</span></div>
      <div class="sum-row"><span class="k">เบอร์</span><span class="v">${state.cPhone||'—'}</span></div>
      <div class="sum-row"><span class="k">ประเภท</span><span class="v">${state.cType}</span></div>
    </div>
    <div class="sum-section">
      <div class="sum-section-title">รถ &amp; บริการ</div>
      <div class="sum-row"><span class="k">รถ</span><span class="v">${state.truck ? `${state.truck.icon} ${state.truck.name}` : '—'}</span></div>
      <div class="sum-row"><span class="k">ชั่วโมง</span><span class="v">${state.hours} ชม.</span></div>
      <div class="sum-row"><span class="k">อุณหภูมิ</span><span class="v sum-temp">${state.tempMode}</span></div>
      ${addonNames.length ? `<div class="sum-row"><span class="k">บริการเสริม</span><span class="v">${addonNames.join(', ')}</span></div>` : ''}
    </div>
    <div class="sum-section">
      <div class="sum-section-title">เส้นทาง</div>
      <div class="sum-row"><span class="k">ต้นทาง</span><span class="v" style="text-align:right;max-width:60%">${state.originAddr||'—'}</span></div>
      <div class="sum-row"><span class="k">ปลายทาง</span><span class="v" style="text-align:right;max-width:60%">${state.destAddr||'—'}</span></div>
      <div class="sum-row"><span class="k">วัน-เวลา</span><span class="v">${state.pickDate||'—'} ${state.pickTime||''}</span></div>
    </div>
    <div class="sum-section">
      <div class="sum-section-title">ค่าบริการ</div>
      <div class="sum-row"><span class="k">ค่ารถ (${state.truck?.pricePerHr||0}×${state.hours}ชม.)</span><span class="v">฿${fmt(base)}</span></div>
      ${addon ? `<div class="sum-row"><span class="k">บริการเสริม</span><span class="v">฿${fmt(addon)}</span></div>` : ''}
      ${disc ? `<div class="sum-row"><span class="k">ส่วนลด ${disc}%</span><span class="v" style="color:var(--green)">-฿${fmt(discAmt)}</span></div>` : ''}
      <div class="sum-row"><span class="k">VAT 7%</span><span class="v" style="opacity:.5">฿${fmt(vat)}</span></div>
      <div class="sum-row" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;margin-top:4px">
        <span class="k" style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:rgba(255,255,255,0.7)">ยอดรวม</span>
        <span class="v" style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--red-light);letter-spacing:2px">฿${fmt(grand)}</span>
      </div>
      <div class="sum-row" style="margin-top:6px"><span class="k">ชำระ</span><span class="v" style="color:#81c784">${state.payTiming === 'ต้นทาง' ? '🏠 ต้นทาง' : '🏁 ปลายทาง'}</span></div>
    </div>
  `;
}

// ===== PAYMENT =====
function selectPayMethod(method, el) {
  state.payMethod = method;
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function openPayment() {
  saveCurrentInputs();
  if (!state.truck) return;

  const grand = getGrandTotal();
  const fmt = (n) => n.toLocaleString('th',{minimumFractionDigits:0});
  const ref  = `BEX-${String(state.jobCounter).padStart(5,'0')}`;

  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('modalAmount', fmt(grand));
  set('cashTotalDisplay', fmt(grand));
  set('transferAmtDisplay', fmt(grand));
  set('creditAmtDisplay', fmt(grand));
  set('qrRef', `JOB: ${ref}`);
  set('qrPayTiming', state.payTiming);

  // Build transfer banks
  const tb = document.getElementById('transferBanks');
  if (tb) {
    tb.innerHTML = banksList.map(b => `
      <div class="transfer-bank-item">
        <div>
          <div class="tb-name">${b.flag} ${b.name}</div>
          <div class="tb-account">${b.account}</div>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:1px">BANG EX</div>
      </div>
    `).join('');
  }

  const cashEl = document.getElementById('cashReceived');
  if (cashEl) cashEl.value = '';
  const changeEl = document.getElementById('changeDisplay');
  if (changeEl) changeEl.textContent = '฿0';

  const successEl = document.getElementById('successOverlay');
  if (successEl) successEl.classList.remove('show');

  // Show correct section
  ['qrSection','cashSection','transferSection','creditSection'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    el.classList && el.classList.remove('show');
  });

  const secMap = { qr:'qrSection', cash:'cashSection', transfer:'transferSection', credit:'creditSection' };
  const active = document.getElementById(secMap[state.payMethod]);
  if (active) {
    active.style.display = 'block';
    if (active.classList) active.classList.add('show');
  }

  if (state.payMethod === 'qr') {
    generateQR(grand, ref);
    startTimer();
  }

  const modal = document.getElementById('payModal');
  if (modal) modal.classList.add('open');
}

function closePayModal() {
  const modal = document.getElementById('payModal');
  if (modal) modal.classList.remove('open');
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ===== QR CANVAS =====
function generateQR(amount, ref) {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 196;
  ctx.fillStyle = 'white';
  ctx.fillRect(0,0,size,size);

  const seed = amount + ref.split('').reduce((a,c) => a+c.charCodeAt(0), 0);
  const modules = 25;
  const cellSize = Math.floor((size-20) / modules);
  const padding = Math.floor((size - cellSize*modules)/2);

  function rnd(s) { const x = Math.sin(s)*10000; return x-Math.floor(x); }

  ctx.fillStyle = '#111';
  for (let r=0; r<modules; r++) {
    for (let c=0; c<modules; c++) {
      if ((r<8&&c<8)||(r<8&&c>=modules-8)||(r>=modules-8&&c<8)) continue;
      if (rnd(seed+r*modules+c) > 0.5) {
        ctx.fillRect(padding+c*cellSize, padding+r*cellSize, cellSize-1, cellSize-1);
      }
    }
  }
  [[0,0],[0,modules-7],[modules-7,0]].forEach(([r,c]) => {
    ctx.fillStyle='#111'; ctx.fillRect(padding+c*cellSize, padding+r*cellSize, 7*cellSize, 7*cellSize);
    ctx.fillStyle='white'; ctx.fillRect(padding+(c+1)*cellSize, padding+(r+1)*cellSize, 5*cellSize, 5*cellSize);
    ctx.fillStyle='#111'; ctx.fillRect(padding+(c+2)*cellSize, padding+(r+2)*cellSize, 3*cellSize, 3*cellSize);
  });
  ctx.fillStyle='#111';
  for (let i=8; i<modules-8; i++) {
    if (i%2===0) {
      ctx.fillRect(padding+i*cellSize, padding+6*cellSize, cellSize-1, cellSize-1);
      ctx.fillRect(padding+6*cellSize, padding+i*cellSize, cellSize-1, cellSize-1);
    }
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  let secs = 300;
  timerInterval = setInterval(() => {
    secs--;
    const m = Math.floor(secs/60), s = secs%60;
    const txt = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const el = document.getElementById('timerText');
    if (el) el.textContent = txt;
    if (secs <= 0) { clearInterval(timerInterval); timerInterval = null; }
  }, 1000);
}

function switchQrTab(bank, el) {
  document.querySelectorAll('.qr-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const banks = {
    promptpay: { name:'พร้อมเพย์ · PromptPay', account:'098-005-4338' },
    scb:       { name:'ธนาคารไทยพาณิชย์ (SCB)', account:'405-2-XXXXX-X' },
    kbank:     { name:'ธนาคารกสิกรไทย (KBank)', account:'120-3-XXXXX-0' },
  };
  const b = banks[bank];
  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('qrBankName', b.name);
  set('qrAccount', b.account);
  generateQR(getGrandTotal() + bank.length*37, `BEX-${String(state.jobCounter).padStart(5,'0')}-${bank}`);
}

// ===== CASH =====
function setCash(amount) {
  const el = document.getElementById('cashReceived');
  if (el) { el.value = amount; calcChange(); }
}
function setExact() {
  const el = document.getElementById('cashReceived');
  if (el) { el.value = getGrandTotal(); calcChange(); }
}
function calcChange() {
  const received = parseFloat((document.getElementById('cashReceived')||{}).value) || 0;
  const grand = getGrandTotal();
  const change = received - grand;
  const el = document.getElementById('changeDisplay');
  if (el) {
    el.textContent = `฿${Math.max(0,change).toLocaleString('th')}`;
    el.style.color = change < 0 ? '#ef9a9a' : 'var(--blue-cold)';
  }
}

// ===== CONFIRM =====
function confirmPayment() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  const grand = getGrandTotal();
  const ref = `BEX-${String(state.jobCounter).padStart(5,'0')}`;
  const payLabel = { qr:'QR Code', cash:'เงินสด', transfer:'โอนเงิน', credit:'เครดิตรายเดือน' }[state.payMethod] || '';
  const timingLabel = state.payTiming === 'ต้นทาง' ? '🏠 ต้นทาง (ก่อนส่ง)' : '🏁 ปลายทาง (หลังส่ง)';

  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('receiptJobId', ref);
  set('receiptAmt', `฿${grand.toLocaleString('th')} · ${payLabel}`);
  set('receiptPayTiming', `ชำระ: ${timingLabel}`);

  const overlay = document.getElementById('successOverlay');
  if (overlay) overlay.classList.add('show');
}

function newJob() {
  state.jobCounter++;
  state.truck = null;
  state.hours = 4;
  state.addons = [];
  state.originAddr = '';
  state.destAddr = '';
  state.originPinned = false;
  state.destPinned = false;
  state.cName = state.cPhone = state.cEmail = state.cNote = '';
  state.discount = 0;

  const clear = (id) => { const e=document.getElementById(id); if(e) e.value=''; };
  ['cName','cPhone','cEmail','cNote','originAddr','destAddr','discountInput','jobNote','cashReceived'].forEach(clear);

  document.querySelectorAll('.truck-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.addon-item').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.hour-pre-btn').forEach(b => b.classList.remove('active'));

  const hn = document.getElementById('hoursNum');
  if (hn) hn.textContent = '4';
  const ji = document.getElementById('jobId');
  if (ji) ji.textContent = String(state.jobCounter).padStart(5,'0');

  const ps1 = document.getElementById('originPinStatus');
  const ps2 = document.getElementById('destPinStatus');
  if (ps1) { ps1.textContent='ยังไม่ได้ปักหมุด'; ps1.className='pin-status'; }
  if (ps2) { ps2.textContent='ยังไม่ได้ปักหมุด'; ps2.className='pin-status'; }

  const dist = document.getElementById('distKm');
  if (dist) dist.textContent = '—';

  recalc();
  updateRightPanel();
  goStep(1, stepTab(1));
  closePayModal();
}

// ===== RESET =====
function resetAll() {
  if (!confirm('รีเซ็ตใบสั่งงานทั้งหมด?')) return;
  newJob();
  state.jobCounter--; // keep same number
  const ji = document.getElementById('jobId');
  if (ji) ji.textContent = String(state.jobCounter).padStart(5,'0');
}

// ===== PRINT =====
function doPrint() {
  buildSummary();
  window.print();
}

// ===== SUMMARY LIVE UPDATE =====
function updateSummary() {
  saveCurrentInputs();
  updateRightPanel();
}
