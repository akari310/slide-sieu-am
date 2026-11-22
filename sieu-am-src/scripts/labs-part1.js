/* ============================================================
   LAB FRAMEWORK + LABS 00–06
   ============================================================ */
const LABS = [];
function fit(cv) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(2, Math.round(r.width));
  const h = Math.max(2, Math.round(r.height));
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r); g.closePath();
}
function grid(g, w, h, step = 26) {
  g.save();
  g.strokeStyle = 'rgba(120,215,220,.08)';
  g.lineWidth = 1;
  for (let x = 0; x < w; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.restore();
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function lab(el, api) {
  api.el = el;
  LABS.push(api);
  return api;
}

let _last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - _last) / 1000 || 0);
  _last = t;
  for (const L of LABS) {
    const slide = L.el.closest('.slide');
    if (slide && !slide.classList.contains('is-active') && window.innerWidth > 780) continue;
    try { L.tick(t / 1000, dt); } catch (e) { /* keep loop alive */ }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ============================================================
   LAB 00 — Mô phỏng B-scan thai nhi (Slide 2)
   ============================================================ */
(function () {
  const cv = $('#fetalCanvas');
  if (!cv) return;
  const img = new Image();
  let loaded = false;
  img.onload = () => { loaded = true; };
  img.src = '__FETAL_DATA_URL__';

  lab(cv, {
    tick(t) {
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#040b12';
      g.fillRect(0, 0, w, h);

      if (loaded) {
        /* Giữ đúng tỉ lệ 16:9 bên trong khung tối */
        const ir = img.width / img.height;
        const cr = w / h;
        let dw = w, dh = h, dx = 0, dy = 0;
        if (cr > ir) { dh = h; dw = h * ir; dx = (w - dw) / 2; }
        else { dw = w; dh = w / ir; dy = (h - dh) / 2; }
        g.drawImage(img, dx, dy, dw, dh);

        /* Vệt tia quét qua vùng quạt siêu âm */
        const ox = w * 0.5, oy = -h * 0.42, R = h * 1.42;
        const sweep = Math.PI * 0.5 + Math.sin(t * 1.35) * 0.48;
        const grad = g.createLinearGradient(ox, oy, ox + Math.cos(sweep) * R, oy + Math.sin(sweep) * R);
        grad.addColorStop(0, 'rgba(63,227,200,0)');
        grad.addColorStop(0.3, 'rgba(63,227,200,.35)');
        grad.addColorStop(1, 'rgba(63,227,200,.1)');
        g.strokeStyle = grad;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + Math.cos(sweep) * R, oy + Math.sin(sweep) * R);
        g.stroke();

        /* Điểm nhịp tim thai ở vùng ngực */
        const hx = dx + dw * 0.54, hy = dy + dh * 0.62;
        const pulse = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 7.2)), 4);
        g.fillStyle = `rgba(63,227,200,${pulse * 0.85})`;
        g.beginPath(); g.arc(hx, hy, 3.2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = `rgba(63,227,200,${pulse * 0.45})`;
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(hx, hy, 7 + pulse * 3, 0, Math.PI * 2); g.stroke();
      }

      /* Thang đo độ sâu bên phải */
      g.strokeStyle = 'rgba(139,211,255,.38)'; g.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        const yy = h * (0.14 + i * 0.14);
        g.beginPath(); g.moveTo(w - 14, yy); g.lineTo(w - 6, yy); g.stroke();
      }

      g.fillStyle = 'rgba(220,238,242,.85)';
      g.font = '12px "JetBrains Mono", monospace';
      g.fillText('B-MODE · 3,5 MHz', 10, 18);
      g.textAlign = 'right';
      g.fillText('ĐỘ SÂU 14 cm', w - 10, 18);
      g.textAlign = 'left';
    }
  });
})();

/* ============================================================
   LAB 01 — Thang tần số + Web Audio API nghe thử ngưỡng 20 kHz
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="freq"]'); if (!el) return;
  const range = $('#fqRange'), needle = $('#fqNeedle'), val = $('#fqVal'), cls = $('#fqCls');
  const audioBtn = $('#fqAudio');
  const zones = $$('.fz', el), animals = $$('.animal', el);
  const hzOf = v => Math.pow(10, (v / 1000) * 7);
  const vOfHz = hz => Math.round((Math.log10(hz) / 7) * 1000);
  const fmtF = x => x < 1000 ? fmt(x, x < 10 ? 1 : 0) + ' Hz'
    : x < 1e6 ? fmt(x / 1000, 1) + ' kHz'
      : fmt(x / 1e6, 2) + ' MHz';

  let actx = null, osc = null, gainNode = null, playing = false;
  function updateAudio(hz) {
    if (!playing || !osc || !gainNode || !actx) return;
    const now = actx.currentTime;
    const audible = hz >= 25 && hz <= 19500;
    osc.frequency.setTargetAtTime(clamp(hz, 25, 19500), now, 0.03);
    gainNode.gain.setTargetAtTime(audible ? 0.06 : 0.0, now, 0.04);
  }
  function stopAudio() {
    playing = false;
    if (gainNode && actx) gainNode.gain.setTargetAtTime(0, actx.currentTime, 0.03);
    if (audioBtn) {
      audioBtn.textContent = '🔊 Nghe thử tần số';
      audioBtn.classList.remove('on');
    }
  }
  window._stopFreqAudio = stopAudio;
  if (audioBtn) {
    audioBtn.onclick = () => {
      if (playing) { stopAudio(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { toast('Trình duyệt không hỗ trợ Web Audio'); return; }
      if (!actx) {
        actx = new Ctx();
        osc = actx.createOscillator();
        gainNode = actx.createGain();
        gainNode.gain.value = 0;
        osc.type = 'sine';
        osc.connect(gainNode);
        gainNode.connect(actx.destination);
        osc.start();
      }
      if (actx.state === 'suspended') actx.resume();
      playing = true;
      audioBtn.textContent = '🔇 Tắt loa thử';
      audioBtn.classList.add('on');
      const hz = hzOf(+range.value);
      updateAudio(hz);
      if (hz > 20000) toast('Đang ở miền siêu âm (> 20 kHz) — điều chỉnh xuống dưới 20 kHz để nghe âm thanh.');
    };
  }

  function paint() {
    const v = +range.value, hz = hzOf(v);
    needle.style.left = (v / 10) + '%';
    val.textContent = fmtF(hz);
    const z = hz < 16 ? 'infra' : hz <= 20000 ? 'audio' : 'ultra';
    cls.textContent = z === 'infra' ? 'HẠ ÂM' : z === 'audio' ? 'ÂM NGHE ĐƯỢC' : 'SIÊU ÂM';
    cls.style.color = z === 'infra' ? 'var(--accent-rose)' : z === 'audio' ? 'var(--accent-teal)' : 'var(--accent-2)';
    zones.forEach(x => x.classList.toggle('on', x.dataset.z === z));
    animals.forEach(a => a.classList.toggle('on', hz <= +a.dataset.lim));
    updateAudio(hz);
  }
  animals.forEach(a => {
    a.style.cursor = 'pointer';
    a.title = 'Nhấn để nhảy tới ngưỡng nghe của loài này';
    a.onclick = () => {
      range.value = vOfHz(+a.dataset.lim);
      paint();
    };
  });
  range.addEventListener('input', paint);
  paint();
})();

/* ============================================================
   LAB 02 — Bước sóng λ & độ phân giải (Slide 6)
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="lambda"]'); if (!el) return;
  const f = $('#lamF'), med = $('#lamMed'), val = $('#lamVal'), out = $('#lamFout'), cmp = $('#lamCmp');
  const resEl = $('#lamRes');
  const cv = $('#lamCanvas');
  let currentMm = 0.77, ph = 0;

  function paint() {
    const mm = (+med.value) / ((+f.value) * 1e6) * 1000;
    currentMm = mm;
    val.textContent = fmt(mm, 2);
    out.textContent = fmt(+f.value, 1) + ' MHz';
    const r = mm / 0.07;
    cmp.textContent = '× ' + (r >= 10 ? fmt(r, 0) : fmt(r, 1));
    if (resEl) {
      resEl.textContent = mm <= 0.5 ? 'Phân biệt rõ chi tiết < 0,5 mm'
        : mm <= 1.2 ? 'Phân biệt cấu trúc cỡ milimét'
          : 'Bước sóng dài — chi tiết nhỏ khó phân biệt';
      resEl.style.color = mm <= 0.5 ? 'var(--accent-teal)' : mm <= 1.2 ? 'var(--accent-2)' : 'var(--accent-amber)';
    }
  }
  f.addEventListener('input', paint);
  med.addEventListener('change', paint);
  $('#lamPreset').onclick = () => {
    f.value = 2;
    med.value = 5700;
    paint();
    toast('Đã nạp bài toán: 2 MHz · thạch anh → λ = 2,85 mm');
  };
  paint();

  lab(el, {
    tick(t, dt) {
      const fVal = +f.value;
      const spanMm = (+med.value) >= 3500 ? 15 : (+med.value) <= 500 ? 1.5 : 5;
      const pxPerMm = (fit(cv).w - 28) / spanMm;
      const { g, w, h } = fit(cv);

      /* Tốc độ truyền sóng trên cửa sổ tỉ lệ với tốc độ môi trường thực tế */
      const speedVis = 70 + ((+med.value) / 5900) * 90;
      const lamPx = currentMm * pxPerMm;
      const k = (2 * Math.PI) / Math.max(4, lamPx);
      ph += dt * k * speedVis;

      g.clearRect(0, 0, w, h);
      grid(g, w, h, 24);

      const amp = h * 0.21, base = h * 0.44;

      /* Đường sóng */
      g.strokeStyle = '#3fe3c8';
      g.lineWidth = 2.2;
      g.beginPath();
      for (let x = 14; x <= w - 14; x += 1.5) {
        const y = base + amp * Math.sin(k * (x - 14) - ph);
        x === 14 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();

      /* Hàng hạt môi trường nén - dãn theo sóng dọc */
      const py = h * 0.74;
      for (let x0 = 18; x0 <= w - 18; x0 += 12) {
        const disp = 4.2 * Math.sin(k * (x0 - 14) - ph);
        const dense = Math.cos(k * (x0 - 14) - ph);
        g.fillStyle = dense > 0.35 ? '#ffb454' : 'rgba(139,211,255,.55)';
        g.beginPath();
        g.arc(x0 + disp, py, dense > 0.35 ? 2.6 : 1.9, 0, Math.PI * 2);
        g.fill();
      }

      /* Thước đo đúng 1 bước sóng λ */
      const xStart = 14 + Math.max(0, lamPx * 0.25);
      const yB = base - amp - 10;
      if (xStart + lamPx <= w - 12) {
        g.strokeStyle = '#ffb454';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(xStart, yB); g.lineTo(xStart + lamPx, yB);
        g.moveTo(xStart, yB - 4); g.lineTo(xStart, yB + 4);
        g.moveTo(xStart + lamPx, yB - 4); g.lineTo(xStart + lamPx, yB + 4);
        g.stroke();
      }
      g.fillStyle = '#ffb454';
      g.font = '13px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText('λ = ' + fmt(currentMm, 2) + ' mm (' + fmt(fVal, 1) + ' MHz)', clamp(xStart + lamPx / 2, 110, w - 110), yB - 7);

      /* Thước mm thực ở đáy */
      const ry = h - 11;
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(14, ry - 4); g.lineTo(w - 14, ry - 4); g.stroke();
      g.fillStyle = 'rgba(220,238,242,.78)';
      g.font = '12px "JetBrains Mono", monospace';
      const stepMm = spanMm <= 2 ? 0.5 : spanMm <= 6 ? 1 : 3;
      for (let m = 0; m <= spanMm + 0.001; m += stepMm) {
        const xm = 14 + m * pxPerMm;
        g.beginPath(); g.moveTo(xm, ry - 8); g.lineTo(xm, ry - 2); g.stroke();
        g.textAlign = m === 0 ? 'left' : m >= spanMm - 0.01 ? 'right' : 'center';
        g.fillText(fmt(m, spanMm <= 2 ? 1 : 0) + ' mm', xm, ry + 1);
      }
      g.textAlign = 'left';
    }
  });
})();

/* ============================================================
   LAB 03 — Tấm gốm áp điện (Slide 8): ĐỒNG BỘ 1:1 GỐM ↔ U(t) ↔ SÓNG
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="piezo"]'); if (!el) return;
  const cv = $('#pzCanvas'), fR = $('#pzF'), fOut = $('#pzFout');
  const stateEl = $('#pzState'), waveEl = $('#pzWave'), lamEl = $('#pzLam');
  let mode = 'ac', phase = 0, fMHz = 2;
  const hzOf = v => 20000 * Math.pow(10, (v / 1000) * Math.log10(10e6 / 20000));
  const LABEL = {
    off: 'chưa cấp điện',
    dcp: 'nén lại (một chiều)',
    dcn: 'dãn ra (đảo cực)',
    ac: 'co – dãn đồng bộ với U(f)'
  };
  function paintF() {
    fMHz = hzOf(+fR.value) / 1e6;
    fOut.textContent = fMHz >= 1 ? fmt(fMHz, 2) + ' MHz' : fmt(fMHz * 1000, 0) + ' kHz';
    waveEl.textContent = mode === 'ac' ? fOut.textContent : '—';
    if (lamEl) {
      const lamMm = 1540 / (fMHz * 1e6) * 1000;
      lamEl.textContent = mode === 'ac' ? fmt(lamMm, lamMm >= 1 ? 2 : 3) + ' mm' : '—';
    }
  }
  $$('#pzModes .btn').forEach(b => {
    b.onclick = () => {
      mode = b.dataset.mode;
      $$('#pzModes .btn').forEach(x => x.classList.toggle('on', x === b));
      stateEl.textContent = LABEL[mode];
      paintF();
    };
  });
  fR.addEventListener('input', paintF);
  paintF();

  lab(el, {
    tick(t, dt) {
      const tNorm = clamp(Math.log10(fMHz / 0.02) / Math.log10(10 / 0.02), 0, 1);
      /* Tần số hiển thị chung duy nhất (Hz trên màn hình đã làm chậm ~10^6 lần) */
      const freqVis = 0.65 + tNorm * 2.45;
      const vVis = 190; // tốc độ sóng không đổi trong cùng môi trường (px/s)
      phase += dt * 2 * Math.PI * freqVis;

      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 30);

      const cx = w * 0.24, cy = h * 0.44;
      const slabW = Math.min(w * 0.14, 76), slabH = h * 0.34;

      let drive = 0;
      if (mode === 'dcp') drive = -1;
      else if (mode === 'dcn') drive = 1;
      else if (mode === 'ac') drive = Math.sin(phase);

      /* Độ nén/dãn tấm gốm khóa pha 1:1 với drive = sin(phase) */
      const strain = 0.13 * drive;
      const sh = slabH * (1 + strain);
      const sw = slabW * (1 - strain * 0.35);
      const x0 = cx - sw / 2, y0 = cy - sh / 2;

      /* Điện cực trên & dưới */
      g.fillStyle = 'rgba(220,238,242,.82)';
      rr(g, x0 - 7, y0 - 8, sw + 14, 5, 2); g.fill();
      rr(g, x0 - 7, y0 + sh + 3, sw + 14, 5, 2); g.fill();

      /* Gốm áp điện */
      const grd = g.createLinearGradient(x0, 0, x0 + sw, 0);
      grd.addColorStop(0, '#0b7a6f'); grd.addColorStop(0.5, '#3fe3c8'); grd.addColorStop(1, '#0b7a6f');
      g.fillStyle = grd;
      rr(g, x0, y0, sw, sh, 3); g.fill();
      g.strokeStyle = 'rgba(220,255,250,.75)'; g.lineWidth = 1.2;
      rr(g, x0, y0, sw, sh, 3); g.stroke();

      /* Mũi tên điện trường đảo chiều đúng theo drive */
      if (mode !== 'off' && Math.abs(drive) > 0.06) {
        const up = drive > 0;
        g.strokeStyle = up ? '#ffb454' : '#8bd3ff';
        g.fillStyle = g.strokeStyle; g.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
          const xx = x0 + sw * i / 4;
          const y1 = up ? y0 + sh - 5 : y0 + 5, y2 = up ? y0 + 5 : y0 + sh - 5;
          g.beginPath(); g.moveTo(xx, y1); g.lineTo(xx, y2); g.stroke();
          g.beginPath();
          g.moveTo(xx, y2); g.lineTo(xx - 3.5, y2 + (up ? 6 : -6)); g.lineTo(xx + 3.5, y2 + (up ? 6 : -6));
          g.closePath(); g.fill();
        }
      }

      g.fillStyle = '#dceef2';
      g.font = '12.5px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText('Gốm PZT', cx, cy + slabH * 0.5 + 34);
      g.textAlign = 'left';

      /* Sóng phát ra từ mặt phải gốm: v_vis = lamPx * freqVis = hằng số */
      const xs = cx + slabW * 0.56 + 18;
      if (mode === 'ac') {
        const lamPx = vVis / freqVis;
        const k = (2 * Math.PI) / lamPx;
        const amp = h * 0.16;
        g.beginPath();
        for (let x = xs; x < w - 12; x += 1.5) {
          const fade = Math.exp(-(x - xs) / (w * 0.82));
          /* Khóa pha tại x = xs bằng đúng sin(phase) của tấm gốm */
          const y = cy + amp * fade * Math.sin(phase - k * (x - xs));
          x === xs ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = '#3fe3c8'; g.lineWidth = 2.2; g.stroke();

        if (lamPx < w * 0.52) {
          const ly = cy - amp - 12;
          g.strokeStyle = '#ffb454'; g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(xs, ly); g.lineTo(xs + lamPx, ly);
          g.moveTo(xs, ly - 4); g.lineTo(xs, ly + 4);
          g.moveTo(xs + lamPx, ly - 4); g.lineTo(xs + lamPx, ly + 4);
          g.stroke();
          g.fillStyle = '#ffb454';
          g.font = 'bold 13px "JetBrains Mono", monospace';
          g.textAlign = 'center';
          g.fillText('λ', xs + lamPx / 2, ly - 8);
        }
        g.fillStyle = '#9cb6c2';
        g.font = '12.5px "JetBrains Mono", monospace';
        g.textAlign = 'left';
        g.fillText('Sóng siêu âm phát ra (cùng tần số f với tấm gốm)', xs, h - 14);
      } else {
        g.fillStyle = '#9cb6c2';
        g.font = '13px "JetBrains Mono", monospace';
        g.textAlign = 'left';
        g.fillText(mode === 'off' ? 'Chưa có điện áp — không có sóng' : 'Biến dạng tĩnh — không phát ra sóng liên tục', xs, cy + 4);
      }

      /* Đồ thị điện áp nuôi U(t) phía dưới: đồng bộ pha & tần số 1:1 với gốm */
      const by = h * 0.87;
      const xL = 14, xR = cx;
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(xL, by); g.lineTo(xR + 24, by); g.stroke();
      g.strokeStyle = '#ffb454'; g.lineWidth = 1.9;
      g.beginPath();
      if (mode === 'ac') {
        const kU = (2 * Math.PI * freqVis) / vVis;
        for (let x = xL; x <= xR; x += 1.5) {
          const y = by - 10 * Math.sin(phase - kU * (xR - x));
          x === xL ? g.moveTo(x, y) : g.lineTo(x, y);
        }
      } else {
        const lv = 10 * drive;
        g.moveTo(xL, by - lv); g.lineTo(xR, by - lv);
      }
      g.stroke();
      /* Chấm đỏ-cam ngay đầu cực hiển thị điện áp tức thời khớp với trạng thái gốm */
      g.fillStyle = '#ffb454';
      g.beginPath();
      g.arc(xR, by - 10 * drive, 3.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#9cb6c2';
      g.font = '12px "JetBrains Mono", monospace';
      g.fillText('U(t)', xL, by - 16);
    }
  });
})();

/* ============================================================
   LAB 04 — Sóng dừng siêu âm nâng giọt nước (Slide 13): Nén – dãn dọc + nút áp suất
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="levitate"]'); if (!el) return;
  const cv = $('#levCanvas'), fR = $('#levF'), fOut = $('#levFout'), lamEl = $('#levLam'), btn = $('#levPow');
  let powerOn = true, ph = 0;

  const rng = mulberry32(413);
  const airCols = 13, airRows = 30;
  const airPts = [];
  for (let c = 0; c < airCols; c++) {
    for (let r = 0; r < airRows; r++) {
      airPts.push({
        u: (c + 0.5) / airCols + (rng() - 0.5) * 0.03,
        v: (r + 0.5) / airRows
      });
    }
  }

  function paint() {
    const fKhz = +fR.value;
    fOut.textContent = fmt(fKhz, 0) + ' kHz';
    const halfLamMm = (343 / (fKhz * 1000)) * 1000 / 2;
    if (lamEl) lamEl.textContent = fmt(halfLamMm, 2) + ' mm';
  }
  fR.addEventListener('input', paint);
  if (btn) {
    btn.onclick = () => {
      powerOn = !powerOn;
      btn.textContent = powerOn ? '⏸ Tắt sóng (thả vật)' : '▶ Bật sóng siêu âm';
      btn.classList.toggle('solid', !powerOn);
    };
  }
  paint();

  let dropOffset = 0, dropVel = 0;
  lab(el, {
    tick(t, dt) {
      const fKhz = +fR.value;
      ph += dt * (4 + fKhz * 0.14);

      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 26);

      const cx = w * 0.34, topY = 34, botY = h - 34, span = botY - topY;
      const colW = 124;
      if (powerOn) {
        dropOffset += (0 - dropOffset) * Math.min(1, dt * 8);
        dropVel = 0;
      } else {
        dropVel += 340 * dt;
        dropOffset = Math.min(span, dropOffset + dropVel * dt);
      }

      /* Đầu phát trên (rung dọc nhẹ khi bật sóng) & bộ phản xạ dưới */
      const srcDy = powerOn ? Math.sin(ph) * 2.2 : 0;
      g.fillStyle = '#12464f'; g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.5;
      rr(g, cx - 58, topY - 12 + srcDy, 116, 14, 3); g.fill(); g.stroke();
      rr(g, cx - 58, botY - 2, 116, 14, 3); g.fill(); g.stroke();
      g.fillStyle = '#dceef2'; g.font = '12.5px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText('Đầu phát siêu âm', cx, topY - 17);
      g.fillText('Mặt phản xạ', cx, botY + 25);

      /* Số nửa bước sóng vừa khít khoảng cách (tỉ lệ theo tần số) */
      const nNodes = Math.max(2, Math.round(fKhz / 10));
      const k = (nNodes * Math.PI) / span;
      const c = Math.cos(ph);

      /* Các phân tử không khí dao động dọc (↕) tạo các vùng nén – dãn tại bụng/nút */
      const maxAirDisp = (span / nNodes) * 0.22;
      for (const p of airPts) {
        const dyEq = p.v * span;
        /* Tại nút áp suất (sin = 0): phân tử 2 bên dồn vào nhau khi cos < 0 hoặc tản ra */
        const disp = powerOn ? Math.sin(k * dyEq) * c * maxAirDisp : 0;
        const density = powerOn ? clamp(0.45 + 0.55 * Math.abs(Math.cos(k * dyEq) * c), 0, 1) : 0.25;
        const px = cx - colW * 0.5 + clamp(p.u, 0.04, 0.96) * colW;
        const py = clamp(topY + 4 + dyEq + disp, topY + 3, botY - 4);
        g.fillStyle = powerOn
          ? `rgba(63,227,200,${(0.16 + 0.36 * density).toFixed(2)})`
          : 'rgba(139,211,255,0.16)';
        g.beginPath();
        g.arc(px, py, 1.5 + density * 0.8, 0, Math.PI * 2);
        g.fill();
      }

      /* Đường bao & biên độ áp suất sóng dừng (bụng áp suất nén tại mặt phản xạ, nút giữ vật) */
      if (powerOn) {
        const amp = 42;
        g.strokeStyle = 'rgba(63,227,200,.42)'; g.lineWidth = 1.2;
        g.setLineDash([3, 3]);
        g.beginPath();
        for (let y = topY; y <= botY; y += 2) {
          const env = amp * Math.abs(Math.sin(k * (y - topY)));
          y === topY ? g.moveTo(cx - env, y) : g.lineTo(cx - env, y);
        }
        g.stroke();
        g.beginPath();
        for (let y = topY; y <= botY; y += 2) {
          const env = amp * Math.abs(Math.sin(k * (y - topY)));
          y === topY ? g.moveTo(cx + env, y) : g.lineTo(cx + env, y);
        }
        g.stroke();
        g.setLineDash([]);

        /* Đồ thị sóng dừng tức thời */
        g.strokeStyle = '#3fe3c8'; g.lineWidth = 2;
        g.beginPath();
        for (let y = topY; y <= botY; y += 2) {
          const x = cx + amp * Math.sin(k * (y - topY)) * c;
          y === topY ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }

      /* Các nút áp suất & giọt nước lơ lửng tại nút */
      for (let i = 1; i < nNodes; i++) {
        const ny = topY + (i * span) / nNodes;
        g.strokeStyle = 'rgba(255,180,84,.34)'; g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(cx - 64, ny); g.lineTo(cx + 64, ny); g.stroke();

        const yy = Math.min(botY - 8, ny + 3 + dropOffset + (powerOn ? Math.sin(t * 4 + i) * 1.4 : 0));
        g.fillStyle = '#8bd3ff';
        g.strokeStyle = '#ffffff'; g.lineWidth = 1;
        g.beginPath(); g.arc(cx, yy, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
      }

      /* Nhãn giải thích bên phải */
      const rx = cx + 76;
      g.textAlign = 'left';
      g.fillStyle = '#3fe3c8'; g.font = '12.5px "JetBrains Mono", monospace';
      g.fillText('Hạt khí nén – dãn (↕)', rx, h * 0.25);
      g.fillStyle = '#ffb454';
      g.fillText('Vạch vàng: nút sóng dừng', rx, h * 0.39);
      g.fillStyle = '#8bd3ff';
      g.fillText('Giọt nước bị giữ ở nút', rx, h * 0.53);
      g.fillStyle = '#b4ccd6';
      g.fillText('Khoảng cách nút = λ / 2', rx, h * 0.67);
      if (!powerOn) {
        g.fillStyle = '#ff6f85';
        g.fillText('Đã tắt sóng → vật rơi tự do', rx, h * 0.80);
      }
    }
  });
})();

/* ============================================================
   LAB 05 — Phản xạ & khúc xạ (Hình 7.3 SGK): Rayleigh R(i), Snell, 2 cặp môi trường
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="reflect"]'); if (!el) return;
  const cv = $('#rfCanvas'), aR = $('#rfAngle'), aOut = $('#rfOut');
  const pctEl = $('#rfPct'), stEl = $('#rfState'), zeroBtn = $('#rfZero');
  const pairBtns = $$('#rfPair button');

  const PAIRS = {
    sb: {
      v1: 1540, z1: 1.63, lab1: 'Mô mềm · v₁ = 1540 m/s', bg1: 'rgba(18,52,68,.85)',
      v2: 4080, z2: 7.80, lab2: 'Xương · v₂ = 4080 m/s', bg2: 'rgba(65,50,36,.85)',
      defAngle: 15
    },
    bs: {
      v1: 4080, z1: 7.80, lab1: 'Xương · v₁ = 4080 m/s', bg1: 'rgba(65,50,36,.85)',
      v2: 1540, z2: 1.63, lab2: 'Mô mềm · v₂ = 1540 m/s', bg2: 'rgba(18,52,68,.85)',
      defAngle: 30
    }
  };
  let pairKey = 'sb', theta = 15, curR = 0.53, curT2 = 0, isTir = false;

  const rng = mulberry32(404);
  const dotsTop = Array.from({ length: 45 }, () => [rng(), rng()]);
  const dotsBot = Array.from({ length: 35 }, () => [rng(), rng(), 1 + rng() * 1.8]);

  function paint() {
    const P = PAIRS[pairKey];
    theta = +aR.value;
    aOut.textContent = theta + '°';
    const th1 = theta * Math.PI / 180;
    const s2 = (P.v2 / P.v1) * Math.sin(th1);
    isTir = s2 >= 1;
    if (isTir) {
      curR = 1;
      curT2 = Math.PI / 2;
    } else {
      curT2 = Math.asin(s2);
      /* Hệ số phản xạ năng lượng âm học Rayleigh chính xác cho góc tới i */
      const c1 = Math.cos(th1), c2 = Math.cos(curT2);
      const num = P.z2 * c1 - P.z1 * c2;
      const den = P.z2 * c1 + P.z1 * c2;
      curR = clamp(Math.pow(num / den, 2), 0, 1);
    }
    pctEl.textContent = fmt(curR * 100, 0) + '%';
    const rDeg = Math.round(curT2 * 180 / Math.PI);
    stEl.textContent = isTir ? 'phản xạ toàn phần (i > 22,2°)'
      : theta === 0 ? 'vuông góc · thu tín hiệu tối đa'
        : `i′ = ${theta}° · góc khúc xạ r = ${rDeg}°`;
    stEl.style.color = isTir ? 'var(--accent-amber)' : theta === 0 ? 'var(--accent-teal)' : 'var(--accent-2)';
  }
  aR.addEventListener('input', paint);
  if (zeroBtn) {
    zeroBtn.onclick = () => { aR.value = 0; paint(); };
  }
  pairBtns.forEach(b => {
    b.onclick = () => {
      pairKey = b.dataset.pair;
      pairBtns.forEach(x => x.classList.toggle('on', x === b));
      aR.value = PAIRS[pairKey].defAngle;
      paint();
    };
  });
  paint();

  function arrow(g, x1, y1, x2, y2, color, wid = 2.2) {
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = wid;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1), s = 8;
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - s * Math.cos(a - 0.4), y2 - s * Math.sin(a - 0.4));
    g.lineTo(x2 - s * Math.cos(a + 0.4), y2 - s * Math.sin(a + 0.4));
    g.closePath(); g.fill();
  }

  /* Vẽ các vạch mặt sóng chạy dọc tia để minh hoạ chiều truyền sóng */
  function drawRayPulses(g, x1, y1, x2, y2, phase, color, count = 3) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 16) return;
    const nx = -dy / len, ny = dx / len;
    g.strokeStyle = color; g.lineWidth = 1.6;
    for (let k = 0; k < count; k++) {
      const u = (phase + k / count) % 1;
      const px = x1 + dx * u, py = y1 + dy * u;
      g.beginPath();
      g.moveTo(px - nx * 6, py - ny * 6);
      g.lineTo(px + nx * 6, py + ny * 6);
      g.stroke();
    }
  }

  lab(el, {
    tick(t) {
      const cfg = PAIRS[pairKey];
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      const iy = h * 0.54, P = { x: w * 0.50, y: iy };

      g.fillStyle = cfg.bg1; g.fillRect(0, 0, w, iy);
      g.fillStyle = cfg.bg2; g.fillRect(0, iy, w, h - iy);
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(0, iy); g.lineTo(w, iy); g.stroke();

      g.fillStyle = 'rgba(255,255,255,.06)';
      dotsTop.forEach(([rx, ry]) => g.fillRect(rx * w, ry * iy, 1.5, 1.5));
      dotsBot.forEach(([rx, ry, r]) => {
        g.beginPath(); g.arc(rx * w, iy + ry * (h - iy), r, 0, Math.PI * 2); g.fill();
      });

      /* Nhãn hai môi trường & Mặt phân cách */
      g.fillStyle = '#dceef2';
      g.font = '12px "JetBrains Mono", monospace';
      g.fillText(cfg.lab1, 10, 18);
      g.fillText(cfg.lab2, 10, h - 10);

      g.fillStyle = '#3fe3c8';
      g.textAlign = 'right';
      g.fillText('Mặt phân cách', w - 10, iy - 6);
      g.textAlign = 'left';

      /* Pháp tuyến nét đứt + nhãn Pháp tuyến (đặt góc dưới trái pháp tuyến để không bao giờ đè tia hay đầu dò) */
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(P.x, 16); g.lineTo(P.x, h - 12); g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(220,238,242,.74)';
      g.font = '11px "JetBrains Mono", monospace';
      g.textAlign = 'right';
      g.fillText('Pháp tuyến', P.x - 8, h - 10);
      g.textAlign = 'left';

      const L = Math.min(w * 0.36, P.y - 38);
      const th = theta * Math.PI / 180;
      const S = { x: P.x - L * Math.sin(th), y: P.y - L * Math.cos(th) };
      const E = { x: P.x + L * Math.sin(th), y: P.y - L * Math.cos(th) };
      const pulsePh = (t * 0.55) % 1;

      /* Tia tới (xanh ngọc) */
      arrow(g, S.x, S.y, P.x, P.y, '#3fe3c8', 2.4);
      drawRayPulses(g, S.x, S.y, P.x, P.y, pulsePh, 'rgba(63,227,200,.72)', 3);

      /* Tia phản xạ (xanh dương nhạt; nếu θ = 0° lệch nhẹ 6px để nhìn rõ cả 2 chiều) */
      const off = theta === 0 ? 6 : 0;
      const refCol = `rgba(139,211,255,${(0.5 + 0.5 * curR).toFixed(2)})`;
      arrow(g, P.x + off, P.y, E.x + off, E.y, refCol, 1.5 + 1.6 * curR);
      drawRayPulses(g, P.x + off, P.y, E.x + off, E.y, pulsePh, 'rgba(139,211,255,.68)', 3);

      /* Nhãn sóng tới & sóng phản xạ */
      g.font = 'bold 11.5px "JetBrains Mono", monospace';
      if (theta >= 8) {
        g.fillStyle = '#3fe3c8';
        g.textAlign = 'right';
        g.fillText('Sóng tới', (S.x + P.x) * 0.5 - 10, (S.y + P.y) * 0.5 - 2);
        g.fillStyle = '#8bd3ff';
        g.textAlign = 'left';
        g.fillText('Sóng phản xạ', (E.x + P.x) * 0.5 + 10, (E.y + P.y) * 0.5 - 2);
      } else {
        g.fillStyle = '#8bd3ff';
        g.textAlign = 'left';
        g.fillText('Phản xạ ngược về đầu dò', P.x + 14, P.y - L * 0.52);
      }

      /* Tia khúc xạ (vàng cam) hoặc phản xạ toàn phần */
      const L2 = Math.min(w * 0.36, h - iy - 22);
      if (!isTir) {
        const R2 = { x: P.x + L2 * Math.sin(curT2), y: P.y + L2 * Math.cos(curT2) };
        const trAlpha = clamp(1 - curR, 0.32, 0.95);
        arrow(g, P.x, P.y, R2.x, R2.y, `rgba(255,180,84,${trAlpha.toFixed(2)})`, 1.4 + 1.6 * (1 - curR));
        drawRayPulses(g, P.x, P.y, R2.x, R2.y, pulsePh, `rgba(255,180,84,${(0.75 * trAlpha).toFixed(2)})`, 3);
        const rDeg = Math.round(curT2 * 180 / Math.PI);
        g.fillStyle = '#ffb454';
        g.textAlign = 'left';
        g.fillText('Sóng khúc xạ (' + rDeg + '°)', R2.x + 8, Math.min(h - 16, R2.y + 4));

        /* Cung góc khúc xạ r */
        if (rDeg > 0) {
          const arcR = 30;
          g.strokeStyle = 'rgba(255,180,84,.78)'; g.lineWidth = 1.3;
          g.beginPath(); g.arc(P.x, P.y, arcR, Math.PI / 2 - curT2, Math.PI / 2); g.stroke();
          const midA = Math.PI / 2 - curT2 * 0.5;
          g.fillStyle = '#ffb454'; g.font = '11px "JetBrains Mono", monospace';
          g.fillText('r', P.x + Math.cos(midA) * (arcR + 10) - 3, P.y + Math.sin(midA) * (arcR + 10) + 3);
        }
      } else {
        g.fillStyle = '#ffb454';
        g.font = 'bold 12px "JetBrains Mono", monospace';
        g.fillText('Phản xạ toàn phần (R = 100%)', P.x + 12, P.y + 26);
      }

      /* Đầu dò gắn ở đầu tia tới */
      g.save();
      g.translate(S.x, S.y); g.rotate(-th);
      g.fillStyle = '#12464f'; g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.5;
      rr(g, -15, -10, 30, 20, 4); g.fill(); g.stroke();
      g.restore();
      g.fillStyle = '#3fe3c8';
      g.font = '11.5px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText('Đầu dò', S.x, S.y - 15);
      g.textAlign = 'left';

      /* Cung góc tới i và góc phản xạ i' */
      if (theta > 0) {
        const arcR = 34;
        g.strokeStyle = 'rgba(63,227,200,.88)'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(P.x, P.y, arcR, -Math.PI / 2 - th, -Math.PI / 2); g.stroke();
        g.strokeStyle = 'rgba(139,211,255,.82)'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(P.x, P.y, arcR - 6, -Math.PI / 2, -Math.PI / 2 + th); g.stroke();

        const midI = -Math.PI / 2 - th * 0.5;
        const midIr = -Math.PI / 2 + th * 0.5;
        g.font = 'bold 11.5px "JetBrains Mono", monospace';
        g.textAlign = 'center';
        g.fillStyle = '#3fe3c8';
        g.fillText('i', P.x + Math.cos(midI) * (arcR + 11), P.y + Math.sin(midI) * (arcR + 11) + 3);
        g.fillStyle = '#8bd3ff';
        g.fillText('i′', P.x + Math.cos(midIr) * (arcR + 6), P.y + Math.sin(midIr) * (arcR + 6) + 3);
        g.textAlign = 'left';
      }
    }
  });
})();

/* ============================================================
   LAB 06 — Lớp gel tiếp âm (Slide 15)
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="gel"]'); if (!el) return;
  const range = $('#gelRange'), ref = $('#gelRef'), tr = $('#gelTr'),
    refT = $('#gelRefTxt'), trT = $('#gelTrTxt'), gap = $('#gelGap'),
    disc = $('#gelDisc'), discT = $('#gelDiscTxt'), out = $('#gelOut');
  function paint() {
    const p = +range.value;
    const T = 0.0005 + 0.9977 * Math.pow(1 - p / 100, 2.2);
    const R = 1 - T;
    ref.style.width = (R * 100).toFixed(2) + '%';
    tr.style.width = Math.max(0.4, T * 100).toFixed(2) + '%';
    refT.textContent = fmt(R * 100, R * 100 > 99 ? 2 : 1) + '%';
    trT.textContent = fmt(T * 100, T * 100 < 1 ? 2 : 1) + '%';
    gap.style.setProperty('--gap', (14 + p * 0.22).toFixed(0) + 'px');
    gap.textContent = p === 0 ? 'lớp gel dẫn âm (0% khí)' : 'khe khí còn ' + p + '%';
    disc.style.setProperty('--b', (T * 0.95).toFixed(3));
    discT.textContent = T < 0.01 ? 'KHÔNG TẠO ẢNH' : T < 0.2 ? 'RẤT MỜ' : T < 0.6 ? 'KHÁ RÕ' : 'RÕ NÉT';
    out.textContent = p + '%';
  }
  range.addEventListener('input', paint);
  $('#gelOn').onclick = () => { range.value = 0; paint(); toast('Đã bôi gel kín — hơn 99,8% năng lượng truyền vào mô'); };
  $('#gelOff').onclick = () => { range.value = 100; paint(); toast('Không bôi gel — 99,95% năng lượng bị phản xạ trở lại'); };
  paint();
})();

/* ============================================================
   LAB 04b — Xung phát & tiếng dội (Slide 13)
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="pulseecho"]'); if (!el) return;
  const cv = $('#peCanvas'), dR = $('#peD'), dOut = $('#peDout'), dtEl = $('#peDt'), resEl = $('#peRes');
  const V = 1540, DMAX = 14, TMAX = 2 * (DMAX / 100) / V;
  let depthCm = 6.0, prog = 0;

  function updateReadout() {
    depthCm = (+dR.value) / 10;
    const dt = 2 * (depthCm / 100) / V;
    dOut.textContent = fmt(depthCm, 1) + ' cm';
    dtEl.textContent = fmt(dt * 1e6, 1) + ' µs';
    resEl.textContent = fmt(depthCm, 1) + ' cm';
  }
  dR.addEventListener('input', () => { updateReadout(); prog = 0; });
  $('#peFire').onclick = () => { prog = 0; };
  updateReadout();

  lab(el, {
    tick(t, dt) {
      prog += dt * 0.45;
      if (prog > 1.35) prog = 0;
      const pRun = Math.min(1, prog);
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 24);

      const tissueW = Math.min(w * 0.35, 195);
      const top = 28, bot = h - 18, th = bot - top;
      const x0 = 14, bw = tissueW - 22;
      const yAt = d => top + (d / DMAX) * th;
      const yTarget = yAt(depthCm);

      /* Khối mô */
      const gr = g.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, 'rgba(139,211,255,.16)');
      gr.addColorStop(1, 'rgba(20,55,75,.28)');
      g.fillStyle = gr;
      rr(g, x0, top, bw, th, 4); g.fill();
      g.strokeStyle = 'rgba(139,211,255,.45)'; g.lineWidth = 1.2; g.stroke();

      /* Đầu dò trên đỉnh khối mô */
      g.fillStyle = 'rgba(63,227,200,.35)'; g.strokeStyle = '#3fe3c8';
      rr(g, x0 + bw * 0.28, top - 14, bw * 0.44, 12, 3); g.fill(); g.stroke();

      /* Mặt phản xạ ở độ sâu d */
      g.strokeStyle = '#ffb454'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x0 + 3, yTarget); g.lineTo(x0 + bw - 3, yTarget); g.stroke();
      g.fillStyle = '#ffb454'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.fillText('Mặt mô (' + fmt(depthCm, 1) + ' cm)', x0 + 6, yTarget - 6);

      /* Xung đi (từ 0 → d) và echo dội ngược về (từ d → 0) */
      const tHit = depthCm / (2 * DMAX);
      const tBack = 2 * tHit;
      const cx = x0 + bw * 0.5;
      if (pRun <= tHit) {
        const dNow = (pRun / tHit) * depthCm;
        const py = yAt(dNow);
        g.fillStyle = '#3fe3c8';
        g.beginPath(); g.arc(cx, py, 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9eeadf'; g.font = '12px "JetBrains Mono", monospace';
        g.fillText('xung đi ↓', cx + 8, py + 4);
      } else if (pRun <= tBack) {
        const dNow = depthCm * (1 - (pRun - tHit) / tHit);
        const py = yAt(dNow);
        g.fillStyle = '#ffb454';
        g.beginPath(); g.arc(cx, py, 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffd18a'; g.font = '12px "JetBrains Mono", monospace';
        g.fillText('phản xạ ↑', cx + 8, py + 4);
      }

      /* Dao động kí bên phải: vẽ xung phát & xung dội khi về tới đầu dò */
      const ox = tissueW + 14, ow = w - ox - 14;
      const baseY = h * 0.72, amp = h * 0.5;
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(ox, baseY); g.lineTo(ox + ow, baseY); g.stroke();
      g.fillStyle = '#b4ccd6'; g.font = '12px "JetBrains Mono", monospace';
      g.fillText('Tín hiệu điện áp đầu dò', ox, 18);
      g.fillText('t = 0', ox, baseY + 16);
      g.textAlign = 'right'; g.fillText('t (µs)', ox + ow, baseY + 16); g.textAlign = 'left';

      const tEcho = 2 * (depthCm / 100) / V;
      const revealT = pRun * TMAX;
      const N = Math.max(2, Math.round(ow));
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const tt = (i / N) * TMAX;
        if (tt > revealT) break;
        let u = 0.95 * Math.exp(-Math.pow(tt / 2.2e-6, 2));
        if (revealT >= tEcho * 0.96) {
          u += 0.65 * Math.exp(-Math.pow((tt - tEcho) / 2.8e-6, 2));
        }
        const px = ox + (tt / TMAX) * ow;
        const py = baseY - u * amp;
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 2; g.stroke();

      /* Nhãn xung phát + echo + Δt */
      g.fillStyle = '#3fe3c8'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.fillText('phát', ox + 4, baseY - amp * 0.92);
      if (revealT >= tEcho) {
        const ex = ox + (tEcho / TMAX) * ow;
        g.fillStyle = '#ffb454';
        g.fillText('phản xạ', ex + 5, baseY - amp * 0.64);
        g.strokeStyle = '#ffb454'; g.lineWidth = 1.2;
        const yBr = baseY - amp * 0.82;
        g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(ox, baseY); g.lineTo(ox, yBr); g.moveTo(ex, baseY); g.lineTo(ex, yBr); g.stroke();
        g.setLineDash([]);
        g.beginPath(); g.moveTo(ox, yBr); g.lineTo(ex, yBr); g.stroke();
        g.textAlign = 'center';
        g.fillText('Δt = ' + fmt(tEcho * 1e6, 0) + ' µs', (ox + ex) / 2, yBr - 5);
        g.textAlign = 'left';
      }
    }
  });
})();
