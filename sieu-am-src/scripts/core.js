/* ============================================================
   CORE — điều hướng, bút vẽ bảng, con trỏ laser, đồng hồ, checkpoint
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const slides = $$('.slide');
const TOTAL = slides.length;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (n, d = 0) => n.toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pad2 = n => String(n).padStart(2, '0');

let cur = 0, wheelLock = 0, touchY = 0, touchTarget = null;
let penOn = false, laserOn = false, drawing = false, hasInk = false;

function readHashSlide() {
  const m = location.hash.match(/s?(\d+)/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    if (!Number.isNaN(idx)) return clamp(idx, 0, TOTAL - 1);
  }
  return 0;
}
cur = readHashSlide();

const winId = Math.random().toString(36).slice(2);
const syncChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sieu-am-sync') : null;
let speakerWin = null;
function broadcastSlide(idx) {
  try { syncChannel?.postMessage({ type: 'goto', idx, from: winId }); } catch (_) {}
  try { localStorage.setItem('sieu-am-slide', JSON.stringify({ idx, from: winId, t: Date.now() })); } catch (_) {}
  try {
    if (speakerWin && !speakerWin.closed) speakerWin.postMessage({ type: 'sieu-am-goto', idx, from: winId }, '*');
  } catch (_) {}
}
function openSpeakerView() {
  const url = new URL(location.href);
  url.searchParams.set('speaker', '1');
  url.hash = '#s' + pad2(cur + 1);
  speakerWin = window.open(url.toString(), 'sieu-am-speaker', 'width=540,height=800,resizable=yes,scrollbars=yes');
  if (!speakerWin) {
    toast('Trình duyệt đang chặn cửa sổ bật lên — hãy mở speaker.html hoặc cho phép pop-up.');
    return;
  }
  speakerWin.focus?.();
  toast('Đã mở trang riêng cho người thuyết trình');
}

/* --- rail + overview (gom theo phần SGK) --- */
const rail = $('#rail'), ovGrid = $('#ovGrid');
const ovButtons = new Array(TOTAL);
const secGroups = [];
slides.forEach((s, i) => {
  const b = document.createElement('button');
  b.innerHTML = '<i></i>';
  b.title = `${pad2(i + 1)}. ${s.dataset.title || ''}`;
  b.setAttribute('aria-label', `Slide ${i + 1}: ${s.dataset.title || ''}`);
  b.onclick = () => go(i);
  rail.appendChild(b);

  const secName = s.dataset.sec || 'Khác';
  let g = secGroups.find(x => x.sec === secName);
  if (!g) { g = { sec: secName, min: 0, items: [] }; secGroups.push(g); }
  g.min += parseFloat(s.dataset.min || '0');
  g.items.push({ s, i });
});
secGroups.forEach(g => {
  const wrap = document.createElement('div');
  const head = document.createElement('div');
  head.className = 'ov-sec-head';
  head.innerHTML = `<span>${g.sec}</span><span>${String(g.min).replace('.', ',')}′</span>`;
  const list = document.createElement('div');
  list.className = 'ov-sec-items';
  g.items.forEach(({ s, i }) => {
    const o = document.createElement('button');
    o.innerHTML = `<span class="i">${pad2(i + 1)}</span><span class="t">${s.dataset.title || ''}</span><span class="m">${s.dataset.min ? s.dataset.min.replace('.', ',') + '′' : ''}</span>`;
    o.onclick = () => { go(i); closeAll(); };
    ovButtons[i] = o;
    list.appendChild(o);
  });
  wrap.appendChild(head);
  wrap.appendChild(list);
  ovGrid.appendChild(wrap);
});
$$('[data-jump-sec]').forEach(btn => {
  btn.onclick = () => {
    const target = btn.dataset.jumpSec;
    const idx = slides.findIndex(s => s.dataset.sec === target);
    if (idx >= 0) go(idx);
  };
});
$('#totNum').textContent = pad2(TOTAL);
const ovTitle = $('#ovTitle');
if (ovTitle) ovTitle.textContent = `Mục lục bài trình chiếu · ${TOTAL} slide`;

/* --- đồng hồ tiết học --- */
let elapsed = 0, ticking = false, tickId = null;
function paintClock() {
  $('#timeChip').innerHTML = `⏱ <b>${pad2(Math.floor(elapsed / 60))}:${pad2(elapsed % 60)}</b>`;
}
function startClock() {
  if (ticking) return;
  ticking = true;
  tickId = setInterval(() => { elapsed++; paintClock(); }, 1000);
  toast('Đã bật đồng hồ');
}
function stopClock() {
  ticking = false;
  clearInterval(tickId);
  toast('Tạm dừng đồng hồ');
}

/* --- bút vẽ bảng (P) & con trỏ Laser (L) --- */
const drawCv = $('#drawCanvas'), penBtn = $('#penBtn'), laserBtn = $('#laserBtn'), clearPenBtn = $('#clearPenBtn'), laserDot = $('#laserDot');
let laserTargetX = -100, laserTargetY = -100, laserCurX = -100, laserCurY = -100, laserRaf = 0;
function tickLaser() {
  if (!laserOn || !laserDot) { laserRaf = 0; return; }
  laserCurX += (laserTargetX - laserCurX) * 0.48;
  laserCurY += (laserTargetY - laserCurY) * 0.48;
  laserDot.style.transform = `translate3d(${laserCurX.toFixed(2)}px, ${laserCurY.toFixed(2)}px, 0)`;
  if (Math.abs(laserTargetX - laserCurX) > 0.15 || Math.abs(laserTargetY - laserCurY) > 0.15) {
    laserRaf = requestAnimationFrame(tickLaser);
  } else {
    laserCurX = laserTargetX; laserCurY = laserTargetY;
    laserDot.style.transform = `translate3d(${laserCurX}px, ${laserCurY}px, 0)`;
    laserRaf = 0;
  }
}
function fitDraw() {
  if (!drawCv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  if (drawCv.width !== Math.round(w * dpr) || drawCv.height !== Math.round(h * dpr)) {
    drawCv.width = Math.round(w * dpr);
    drawCv.height = Math.round(h * dpr);
  }
}
function clearInk() {
  if (!drawCv) return;
  const g = drawCv.getContext('2d');
  g.clearRect(0, 0, drawCv.width, drawCv.height);
  hasInk = false;
  if (clearPenBtn) clearPenBtn.hidden = true;
}
function togglePen() {
  penOn = !penOn;
  if (penOn) {
    laserOn = false;
    document.body.classList.remove('laser-active');
    if (laserBtn) laserBtn.classList.remove('on');
    if (laserDot) laserDot.classList.remove('on');
  }
  if (penBtn) penBtn.classList.toggle('on', penOn);
  if (drawCv) drawCv.classList.toggle('drawing', penOn);
  toast(penOn ? 'Đã bật bút vẽ (E để xoá)' : 'Đã tắt bút vẽ');
}
function toggleLaser() {
  laserOn = !laserOn;
  if (laserOn) { penOn = false; if (penBtn) penBtn.classList.remove('on'); if (drawCv) drawCv.classList.remove('drawing'); }
  document.body.classList.toggle('laser-active', laserOn);
  if (laserBtn) laserBtn.classList.toggle('on', laserOn);
  if (laserDot) laserDot.classList.toggle('on', laserOn);
  toast(laserOn ? 'Đã bật con trỏ Laser' : 'Đã tắt Laser');
}
if (drawCv) {
  fitDraw();
  window.addEventListener('resize', fitDraw);
  drawCv.addEventListener('pointerdown', e => {
    if (!penOn) return;
    drawing = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const g = drawCv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.strokeStyle = '#c92a2a';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(e.clientX, e.clientY);
  });
  drawCv.addEventListener('pointermove', e => {
    if (!drawing || !penOn) return;
    const g = drawCv.getContext('2d');
    g.lineTo(e.clientX, e.clientY);
    g.stroke();
    hasInk = true;
    if (clearPenBtn) clearPenBtn.hidden = false;
  });
  window.addEventListener('pointerup', () => { drawing = false; });
}
window.addEventListener('pointermove', e => {
  if (!laserOn || !laserDot) return;
  if (laserCurX < 0) { laserCurX = e.clientX; laserCurY = e.clientY; }
  laserTargetX = e.clientX;
  laserTargetY = e.clientY;
  if (!laserRaf) laserRaf = requestAnimationFrame(tickLaser);
}, { passive: true });
if (penBtn) penBtn.onclick = togglePen;
if (laserBtn) laserBtn.onclick = toggleLaser;
if (clearPenBtn) clearPenBtn.onclick = () => { clearInk(); toast('Đã xoá nét vẽ'); };

/* --- điều hướng & hiệu ứng chuyển tiếp theo hướng --- */
const prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn');
function pauseSlideMedia(slide) {
  if (!slide) return;
  $$('video', slide).forEach(v => v.pause?.());
  $$('iframe', slide).forEach(f => f._ytPlayer?.pauseVideo?.());
  if (slide.querySelector('[data-widget="freq"]')) window._stopFreqAudio?.();
}

function update(prevIdx = -1, silentSync = false) {
  const s = slides[cur];
  slides.forEach((el, i) => {
    el.classList.toggle('is-active', i === cur);
    el.classList.toggle('is-before', i < cur);
    el.classList.toggle('is-after', i > cur);
    if (i === cur) {
      clearTimeout(el._leaveT);
      el.classList.remove('is-leaving');
    }
  });
  if (prevIdx >= 0 && prevIdx !== cur && slides[prevIdx]) {
    const old = slides[prevIdx];
    pauseSlideMedia(old);
    old.classList.add('is-leaving');
    clearTimeout(old._leaveT);
    old._leaveT = setTimeout(() => old.classList.remove('is-leaving'), 600);
  }
  $('#bar').style.width = ((cur + 1) / TOTAL * 100).toFixed(2) + '%';
  $('#curNum').textContent = pad2(cur + 1);
  $('#curSec').textContent = (s.dataset.sec || '').toUpperCase();
  $('#secName').textContent = s.dataset.sec || '';
  $('#planChip').innerHTML = `⌛ <b>${s.dataset.min ? s.dataset.min.replace('.', ',') + '′' : '—'}</b>`;
  $('#noteSlide').textContent = pad2(cur + 1);
  $('#noteBody').textContent = s.dataset.note || '—';
  $('#noteTime').textContent = '⌛ ' + (s.dataset.min ? s.dataset.min.replace('.', ',') + ' phút' : '—');
  $$('#rail button').forEach((b, i) => b.classList.toggle('cur', i === cur));
  ovButtons.forEach((b, i) => b && b.classList.toggle('cur', i === cur));
  if (prevBtn) prevBtn.disabled = cur === 0;
  if (nextBtn) nextBtn.disabled = cur === TOTAL - 1;
  if (!document.body.classList.contains('is-speaker-only')) {
    try { history.replaceState(null, '', '#s' + pad2(cur + 1)); } catch (_) {}
  }
  if (!silentSync) broadcastSlide(cur);
}

function go(n, silentSync = false) {
  n = clamp(n, 0, TOTAL - 1);
  if (n === cur && !silentSync) return;
  if (hasInk) clearInk();
  const prev = cur;
  cur = n;
  if (window.innerWidth <= 780) {
    slides[cur].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  update(prev, silentSync);
}
if (prevBtn) prevBtn.onclick = () => go(cur - 1);
if (nextBtn) nextBtn.onclick = () => go(cur + 1);

function closeAll() {
  $('#notes').classList.remove('open');
  $('#overview').classList.remove('open');
  $('#help').classList.remove('open');
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* --- đồng bộ scroll (chỉ chế độ cuộn mobile <= 780px) --- */
let raf = false;
addEventListener('scroll', () => {
  if (document.body.classList.contains('is-speaker-only')) return;
  if (window.innerWidth > 780) return;
  if (raf) return;
  raf = true;
  requestAnimationFrame(() => {
    raf = false;
    const h = window.innerHeight || 1;
    const i = clamp(Math.round(window.scrollY / h), 0, TOTAL - 1);
    if (i !== cur) { const prev = cur; cur = i; update(prev); }
  });
}, { passive: true });

/* --- wheel --- */
addEventListener('wheel', e => {
  if (document.body.classList.contains('is-speaker-only')) return;
  if (window.innerWidth <= 780) return;
  if (e.target.closest('.notes, .overlay, input, select')) return;
  if (e.ctrlKey) return;
  e.preventDefault();
  const now = Date.now();
  if (now - wheelLock < 460) return;
  if (Math.abs(e.deltaY) < 6) return;
  wheelLock = now;
  go(cur + (e.deltaY > 0 ? 1 : -1));
}, { passive: false });

/* --- touch --- */
addEventListener('touchstart', e => {
  if (document.body.classList.contains('is-speaker-only')) return;
  touchY = e.touches[0].clientY;
  touchTarget = e.target;
}, { passive: true });
addEventListener('touchend', e => {
  if (document.body.classList.contains('is-speaker-only')) return;
  if (window.innerWidth <= 780) return;
  if (touchTarget && touchTarget.closest('input, select, .notes, .overlay, canvas')) return;
  const dy = touchY - e.changedTouches[0].clientY;
  if (Math.abs(dy) > 55) go(cur + (dy > 0 ? 1 : -1));
}, { passive: true });

/* --- bàn phím --- */
addEventListener('keydown', e => {
  if (document.body.classList.contains('is-speaker-only')) return;
  if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
  const k = e.key;
  if (k === 'Escape') { closeAll(); if (penOn) togglePen(); if (laserOn) toggleLaser(); return; }
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown') {
    e.preventDefault(); go(cur + 1); return;
  }
  if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); go(cur - 1); return; }
  if (k === 'Home') { e.preventDefault(); go(0); return; }
  if (k === 'End') { e.preventDefault(); go(TOTAL - 1); return; }
  const low = k.toLowerCase();
  if (low === 'n') { $('#notes').classList.toggle('open'); }
  if (low === 's') { openSpeakerView(); }
  if (low === 'o') { $('#overview').classList.toggle('open'); $('#help').classList.remove('open'); }
  if (low === '?') { $('#help').classList.toggle('open'); $('#overview').classList.remove('open'); }
  if (low === 't') { ticking ? stopClock() : startClock(); }
  if (low === 'r') { elapsed = 0; paintClock(); toast('Đã đặt lại đồng hồ 00:00'); }
  if (low === 'p') { togglePen(); }
  if (low === 'l') { toggleLaser(); }
  if (low === 'd') { toggleTheme(); }
  if (low === 'e') { clearInk(); toast('Đã xoá nét vẽ'); }
  if (low === 'f') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
});

/* --- nút topbar & overlay --- */
const themeBtn = $('#themeBtn');
function toggleTheme() {
  const isLight = document.documentElement.dataset.theme === 'light';
  if (isLight) {
    delete document.documentElement.dataset.theme;
    if (themeBtn) themeBtn.textContent = 'Sáng';
    toast('Giao diện tối');
  } else {
    document.documentElement.dataset.theme = 'light';
    if (themeBtn) themeBtn.textContent = 'Tối';
    toast('Giao diện sáng');
  }
}
if (themeBtn) themeBtn.onclick = toggleTheme;
$('#notesBtn').onclick = () => $('#notes').classList.toggle('open');
if ($('#speakerBtn')) $('#speakerBtn').onclick = openSpeakerView;
$('#gridBtn').onclick = () => { $('#overview').classList.toggle('open'); $('#help').classList.remove('open'); };
$('#helpBtn').onclick = () => { $('#help').classList.toggle('open'); $('#overview').classList.remove('open'); };
$('#ovClose').onclick = closeAll;
$('#helpClose').onclick = closeAll;
$$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeAll(); }));

/* --- poll khởi động --- */
$$('#poll button').forEach(b => {
  b.onclick = () => {
    const ok = b.dataset.ok === '1';
    b.classList.add('open', ok ? 'ok' : 'no');
    if (!ok) toast('Phương án chưa chính xác, hãy chọn lại.');
  };
});

/* --- nút hiện/ẩn đáp án (strict hidden toggle) --- */
$$('[data-reveal]').forEach(b => {
  if (!b.dataset.label) b.dataset.label = b.textContent;
  b.onclick = () => {
    const el = document.getElementById(b.dataset.reveal);
    if (!el) return;
    el.hidden = !el.hidden;
    b.textContent = el.hidden ? b.dataset.label : 'Ẩn đáp án';
  };
});

/* --- slide kiểm tra nhanh chuyên biệt (.checkpoint-box) --- */
$$('.checkpoint-box').forEach(box => {
  const btns = $$('.checkpoint-opts button', box);
  btns.forEach(b => {
    b.addEventListener('click', () => {
      if (box.classList.contains('answered')) return;
      const ok = b.dataset.ok === '1';
      box.classList.add('answered');
      btns.forEach(x => {
        if (x === b) x.classList.add(ok ? 'ok' : 'no');
        else if (x.dataset.ok === '1') x.classList.add('ok');
      });
    }, { once: true });
  });
});

/* --- đồng hồ thảo luận 90 giây --- */
(function () {
  const timeEl = $('#discTime'), startBtn = $('#discStart'), resetBtn = $('#discReset'), box = $('#discBox');
  if (!timeEl || !startBtn || !resetBtn) return;
  let left = 90, id = null, running = false;
  function render() {
    timeEl.textContent = `${pad2(Math.floor(left / 60))}:${pad2(left % 60)}`;
    if (box) box.classList.toggle('hot', left <= 15 && left > 0);
  }
  function stop() {
    running = false;
    clearInterval(id);
    id = null;
    startBtn.textContent = left === 0 ? '✓ Hết giờ' : '▶ Tiếp tục';
  }
  startBtn.onclick = () => {
    if (running) { stop(); return; }
    if (left <= 0) left = 90;
    running = true;
    startBtn.textContent = '⏸ Tạm dừng';
    id = setInterval(() => {
      left--;
      render();
      if (left <= 0) {
        stop();
        toast('Đã hết 90 giây thảo luận.');
      }
    }, 1000);
  };
  resetBtn.onclick = () => {
    clearInterval(id);
    id = null;
    running = false;
    left = 90;
    startBtn.textContent = '▶ Bắt đầu';
    render();
  };
  render();
})();

/* --- đồng hồ 90s cho slide ca thực tế --- */
(function () {
  const txt = $('#caseClockText'), btn = $('#caseClockBtn');
  if (!txt || !btn) return;
  let left = 90, id = null, running = false;
  const paint = () => { txt.textContent = `${pad2(Math.floor(left / 60))}:${pad2(left % 60)}`; };
  btn.onclick = () => {
    if (running) {
      running = false; clearInterval(id); id = null;
      btn.textContent = left === 0 ? '↻ Làm lại 90s' : '▶ Tiếp tục';
      return;
    }
    if (left <= 0) left = 90;
    running = true;
    btn.textContent = '⏸ Tạm dừng';
    id = setInterval(() => {
      left--;
      paint();
      if (left <= 0) {
        running = false; clearInterval(id); id = null;
        btn.textContent = '↻ Làm lại 90s';
        toast('Đã hết 90 giây phân tích tình huống.');
      }
    }, 1000);
  };
  paint();
})();

/* --- đồng bộ iframe YouTube + tự động bật phụ đề dịch Tiếng Việt --- */
const ytApiQueue = [];
let ytApiRequested = false;
function ensureYtApi(cb) {
  if (location.protocol === 'file:') return;
  if (window.YT && typeof window.YT.Player === 'function') { cb(); return; }
  ytApiQueue.push(cb);
  if (!ytApiRequested) {
    ytApiRequested = true;
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      while (ytApiQueue.length) ytApiQueue.shift()();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  }
}

function applyViCaptions(player) {
  try {
    player.loadModule?.('captions');
    const tracks = player.getOption?.('captions', 'tracklist') || [];
    const cur = player.getOption?.('captions', 'track') || {};
    const vi = tracks.find(t => t.languageCode === 'vi');
    if (vi) {
      player.setOption('captions', 'track', vi);
      return true;
    }
    const base = tracks[0] || (cur.languageCode ? cur : { languageCode: 'en', kind: 'asr', vss_id: 'a.en' });
    player.setOption('captions', 'track', {
      languageCode: base.languageCode,
      vss_id: base.vss_id,
      kind: base.kind,
      translationLanguage: { languageCode: 'vi', languageName: 'Tiếng Việt' }
    });
    return true;
  } catch (_) { return false; }
}

function attachYtViCaptions(iframe) {
  if (!iframe || iframe._ytAttached || !iframe.id) return;
  iframe._ytAttached = true;
  ensureYtApi(() => {
    try {
      iframe._ytPlayer = new window.YT.Player(iframe.id, {
        events: {
          onReady: e => applyViCaptions(e.target),
          onApiChange: e => applyViCaptions(e.target),
          onStateChange: e => {
            if (e.data === 1) {
              applyViCaptions(e.target);
              setTimeout(() => applyViCaptions(e.target), 450);
            }
          }
        }
      });
    } catch (_) { iframe._ytAttached = false; }
  });
}

function syncYtFrame(iframe, active = true) {
  if (!iframe) return;
  const fileBox = iframe.parentElement?.querySelector('[data-yt-file]');
  if (location.protocol === 'file:') {
    iframe.hidden = true;
    if (fileBox) fileBox.hidden = false;
  } else {
    iframe.hidden = false;
    if (fileBox) fileBox.hidden = true;
    if (active) {
      if (!iframe.getAttribute('src') && iframe.dataset.ytSrc) {
        iframe.addEventListener('load', () => attachYtViCaptions(iframe), { once: true });
        const sep = iframe.dataset.ytSrc.includes('?') ? '&' : '?';
        iframe.src = `${iframe.dataset.ytSrc}${sep}origin=${encodeURIComponent(location.origin)}`;
      } else {
        attachYtViCaptions(iframe);
      }
    } else {
      iframe._ytPlayer?.pauseVideo?.();
    }
  }
}

/* --- chuyển đổi Mô phỏng <-> Video thật <-> Ảnh thật ngay trong khung --- */
$$('[data-vid-switch]').forEach(seg => {
  const labEl = seg.closest('.lab');
  if (!labEl) return;
  const canvas = labEl.querySelector('.canvas-box canvas');
  const video = labEl.querySelector('.canvas-box video');
  const photo = labEl.querySelector('.canvas-box img');
  const ytWrap = labEl.querySelector('.canvas-box [data-yt-wrap]');
  const ytFrame = ytWrap?.querySelector('[data-yt-src]');
  if (!canvas && !photo && !video && !ytWrap) return;
  const btns = $$('button', seg);
  btns.forEach(b => {
    b.onclick = () => {
      const mode = b.dataset.view;
      btns.forEach(x => x.classList.toggle('on', x === b));
      if (canvas) canvas.hidden = mode !== 'sim';
      if (video) {
        video.hidden = mode !== 'vid';
        if (mode === 'vid') video.play?.().catch(() => {});
        else video.pause?.();
      }
      if (photo) photo.hidden = mode !== 'img';
      if (ytWrap) {
        ytWrap.hidden = mode !== 'yt';
        syncYtFrame(ytFrame, mode === 'yt');
      }
      $$('[data-view-only]', labEl).forEach(el => {
        el.hidden = el.dataset.viewOnly !== mode;
      });
    };
  });
});

/* --- hotspot đầu dò --- */
const PROBE = {
  crystal: 'Tinh thể áp điện (thạch anh / gốm PZT): bộ phận trung tâm vừa phát xung siêu âm vừa thu sóng phản xạ. Bề dày tinh thể quyết định tần số cộng hưởng.',
  electrode: 'Hai bản điện cực ở hai mặt tinh thể: đưa điện áp xoay chiều vào khi phát và dẫn tín hiệu điện áp cảm ứng ra mạch xử lí khi thu.',
  backing: 'Lớp giảm rung (backing): hấp thụ phần sóng truyền ngược về phía sau để xung phát rất ngắn, giúp phân tách rõ các lớp mô sát nhau.',
  matching: 'Lớp đệm (matching layer): có trở kháng âm trung gian giữa tinh thể và da, giảm phản xạ ngay mặt đầu dò để sóng truyền vào cơ thể hiệu quả hơn.',
  lens: 'Lớp tiếp âm / thấu kính âm học: bảo vệ tinh thể, tiếp xúc sát bề mặt da và hội tụ chùm tia siêu âm.',
  housing: 'Vỏ đầu dò: bảo vệ các lớp bên trong, cách điện và che chắn nhiễu điện từ từ môi trường ngoài.',
  gel: 'Gel tiếp âm: lấp kín khe không khí mỏng giữa đầu dò và da, hạn chế sự phản xạ tới 99,95% năng lượng sóng.'
};
const probeDesc = $('#probeDesc');
function highlightPart(p) {
  $$('#probeList li').forEach(x => x.classList.toggle('on', x.dataset.part === p));
  $$('svg .part').forEach(g => g.classList.toggle('hi', g.dataset.part === p));
  if (probeDesc && PROBE[p]) probeDesc.innerHTML = PROBE[p];
}
$$('#probeList li').forEach(li => {
  li.onclick = () => highlightPart(li.dataset.part);
});
$$('svg .part').forEach(g => {
  g.addEventListener('click', () => highlightPart(g.dataset.part));
  g.addEventListener('mouseenter', () => g.classList.add('hi'));
  g.addEventListener('mouseleave', () => {
    const active = $('#probeList li.on');
    if (!active || active.dataset.part !== g.dataset.part) g.classList.remove('hi');
  });
});

/* --- khởi động --- */
slides.forEach((s, i) => {
  if (s.dataset.fx) return;
  const prevSec = i > 0 ? slides[i - 1].dataset.sec : '';
  const isNewSec = i === 0 || i === TOTAL - 1 || (s.dataset.sec && s.dataset.sec !== prevSec);
  if (isNewSec) s.dataset.fx = 'zoom';
  else if (s.querySelector('.checkpoint-box, [data-widget="quiz"]')) s.dataset.fx = 'rise';
  else if (s.querySelector('.hist-grid, .photo-card, .tbl')) s.dataset.fx = 'curtain';
  else if (s.querySelector('.lab[data-widget]')) s.dataset.fx = (i % 2 === 0) ? 'swing' : 'glide';
  else s.dataset.fx = 'glide';
});
/* --- đồng bộ với cửa sổ Người thuyết trình (BroadcastChannel / storage / postMessage) --- */
if (syncChannel) {
  syncChannel.onmessage = e => {
    const m = e.data;
    if (!m || m.from === winId) return;
    if (m.type === 'hello') { syncChannel.postMessage({ type: 'hello-ack', idx: cur, from: winId }); }
    if (m.type === 'goto' && typeof m.idx === 'number') { go(m.idx, true); }
  };
}
addEventListener('storage', e => {
  if (e.key !== 'sieu-am-slide' || !e.newValue) return;
  try {
    const m = JSON.parse(e.newValue);
    if (m.from !== winId && typeof m.idx === 'number') go(m.idx, true);
  } catch (_) {}
});
addEventListener('message', e => {
  const m = e.data;
  if (m && m.type === 'sieu-am-goto' && m.from !== winId && typeof m.idx === 'number') {
    go(m.idx, true);
  }
});

addEventListener('hashchange', () => {
  if (document.body.classList.contains('is-speaker-only')) return;
  const target = readHashSlide();
  if (target !== cur) go(target, true);
});

paintClock();
if (!document.body.classList.contains('is-speaker-only')) {
  update(-1, true);
  highlightPart('crystal');
  syncYtFrame($('#ytPlayer'), true);
}
