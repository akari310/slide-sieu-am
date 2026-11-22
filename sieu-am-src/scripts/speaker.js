/* ============================================================
   SPEAKER / TELEPROMPTER ENGINE (works in speaker.html & ?speaker=1)
   ============================================================ */
(function () {
  const isStandalone = !!window.__SPEAKER_STANDALONE__;
  const isParamSpeaker = new URLSearchParams(location.search).get('speaker') === '1';
  if (!isStandalone && !isParamSpeaker) return;

  const DATA = window.__SPEAKER_DATA__ || [];
  if (!DATA.length) return;

  document.body.classList.add('is-speaker-only');
  const TOTAL = DATA.length;
  const pad2 = n => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function readInitialIdx() {
    const m = location.hash.match(/s?(\d+)/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (!Number.isNaN(idx)) return clamp(idx, 0, TOTAL - 1);
    }
    return 0;
  }

  let cur = readInitialIdx();
  let fs = parseFloat(localStorage.getItem('sieu-am-spk-fs') || '1.12');
  fs = clamp(fs, 0.9, 1.55);

  let sec = 0, timerOn = false, tid = null;

  /* Kênh đồng bộ thời gian thực cùng trình duyệt / thiết bị (máy tính <-> cửa sổ chiếu) */
  const winId = Math.random().toString(36).slice(2);
  const ch = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sieu-am-sync') : null;
  let linked = false;

  function broadcastSlide(idx) {
    try { ch?.postMessage({ type: 'goto', idx, from: winId }); } catch (_) {}
    try { localStorage.setItem('sieu-am-slide', JSON.stringify({ idx, from: winId, t: Date.now() })); } catch (_) {}
    try { window.opener?.postMessage?.({ type: 'sieu-am-goto', idx, from: winId }, '*'); } catch (_) {}
  }

  /* Dựng giao diện người thuyết trình */
  const root = document.createElement('div');
  root.className = 'spk-app';
  root.innerHTML = `
    <header class="spk-top">
      <div class="spk-brand">
        <span class="dot"></span>
        <span>NGƯỜI THUYẾT TRÌNH</span>
        <span class="spk-sync" id="spkSync" hidden>Đã đồng bộ màn chiếu</span>
      </div>
      <div class="spk-tools">
        <button class="spk-btn" id="spkClockBtn" title="Bắt đầu / tạm dừng đồng hồ">⏱ <span id="spkClock">00:00</span></button>
        <button class="spk-btn" id="spkClockReset" title="Đặt lại đồng hồ">↺</button>
        <button class="spk-btn" id="spkFsDown" title="Thu nhỏ chữ">A−</button>
        <button class="spk-btn" id="spkFsUp" title="Phóng to chữ">A+</button>
        <button class="spk-btn" id="spkThemeBtn" title="Đổi giao diện Sáng / Tối">Sáng</button>
        <button class="spk-btn" id="spkTocBtn" title="Chọn nhanh slide">Mục lục</button>
      </div>
    </header>
    <div class="spk-prog"><i id="spkProgBar"></i></div>
    <main class="spk-main" id="spkMain">
      <div class="spk-head">
        <div class="spk-head-row">
          <span class="spk-kicker" id="spkKicker"></span>
          <span class="spk-meta" id="spkMeta"></span>
        </div>
        <h1 class="spk-title" id="spkTitle"></h1>
      </div>

      <section class="spk-card say">
        <span class="spk-label">Nội dung cần trình bày</span>
        <p class="spk-say-text" id="spkNote"></p>
      </section>

      <section class="spk-card facts" id="spkFactsBox" hidden>
        <span class="spk-label">Công thức &amp; ý chính trên trang chiếu</span>
        <div class="spk-formulas" id="spkFormulas" hidden></div>
        <ul class="spk-list" id="spkBullets"></ul>
      </section>

      <section class="spk-card ans" id="spkAnsBox" hidden>
        <span class="spk-label" id="spkAnsLabel">Đáp án &amp; giải thích</span>
        <ul class="spk-list" id="spkAnswers"></ul>
      </section>

      <div class="spk-next-cue" id="spkNextCue"></div>
    </main>
    <footer class="spk-foot-nav">
      <button class="spk-btn" id="spkPrev">‹ Trước</button>
      <button class="spk-counter" id="spkCountBtn">01 / ${pad2(TOTAL)}</button>
      <button class="spk-btn primary" id="spkNext">Tiếp ›</button>
    </footer>
    <div class="spk-drawer" id="spkDrawer">
      <div class="spk-drawer-head">
        <h3>Mục lục thuyết trình · ${TOTAL} slide (45 phút)</h3>
        <button class="spk-btn" id="spkDrawerClose">Đóng</button>
      </div>
      <div id="spkDrawerList"></div>
    </div>
  `;
  document.body.appendChild(root);

  const $id = id => root.querySelector('#' + id);
  const els = {
    sync: $id('spkSync'),
    clockBtn: $id('spkClockBtn'),
    clock: $id('spkClock'),
    clockReset: $id('spkClockReset'),
    fsDown: $id('spkFsDown'),
    fsUp: $id('spkFsUp'),
    themeBtn: $id('spkThemeBtn'),
    tocBtn: $id('spkTocBtn'),
    prog: $id('spkProgBar'),
    kicker: $id('spkKicker'),
    meta: $id('spkMeta'),
    title: $id('spkTitle'),
    note: $id('spkNote'),
    factsBox: $id('spkFactsBox'),
    formulas: $id('spkFormulas'),
    bullets: $id('spkBullets'),
    ansBox: $id('spkAnsBox'),
    ansLabel: $id('spkAnsLabel'),
    answers: $id('spkAnswers'),
    nextCue: $id('spkNextCue'),
    prev: $id('spkPrev'),
    countBtn: $id('spkCountBtn'),
    next: $id('spkNext'),
    drawer: $id('spkDrawer'),
    drawerClose: $id('spkDrawerClose'),
    drawerList: $id('spkDrawerList'),
    main: $id('spkMain')
  };

  function applyFs() {
    root.style.setProperty('--spk-fs', fs.toFixed(2) + 'rem');
    try { localStorage.setItem('sieu-am-spk-fs', fs.toFixed(2)); } catch (_) {}
  }
  applyFs();

  function paintClock() {
    els.clock.textContent = `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;
  }
  els.clockBtn.onclick = () => {
    if (timerOn) {
      timerOn = false; clearInterval(tid); tid = null;
      els.clockBtn.classList.remove('on');
    } else {
      timerOn = true;
      els.clockBtn.classList.add('on');
      tid = setInterval(() => { sec++; paintClock(); }, 1000);
    }
  };
  els.clockReset.onclick = () => { sec = 0; paintClock(); };

  els.fsDown.onclick = () => { fs = clamp(fs - 0.08, 0.9, 1.55); applyFs(); };
  els.fsUp.onclick = () => { fs = clamp(fs + 0.08, 0.9, 1.55); applyFs(); };

  function syncThemeBtn() {
    const isLight = document.documentElement.dataset.theme === 'light';
    els.themeBtn.textContent = isLight ? 'Tối' : 'Sáng';
  }
  els.themeBtn.onclick = () => {
    if (document.documentElement.dataset.theme === 'light') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = 'light';
    syncThemeBtn();
  };
  syncThemeBtn();

  /* Nhóm mục lục theo từng phần SGK */
  function buildDrawer() {
    const groups = [];
    DATA.forEach((d, idx) => {
      let g = groups.find(x => x.sec === d.sec);
      if (!g) { g = { sec: d.sec, totalMin: 0, items: [] }; groups.push(g); }
      g.totalMin += parseFloat(d.min || '0');
      g.items.push({ d, idx });
    });
    els.drawerList.innerHTML = groups.map(g => `
      <div class="spk-sec-group">
        <div class="spk-sec-title"><span>${g.sec || 'Khác'}</span><span>${String(g.totalMin).replace('.', ',')}′</span></div>
        <div class="spk-sec-list">
          ${g.items.map(({ d, idx }) => `
            <button class="spk-jump${idx === cur ? ' cur' : ''}" data-idx="${idx}">
              <span class="n">${pad2(idx + 1)}</span>
              <span>${d.heading || d.title}</span>
              <span class="m">${d.min ? String(d.min).replace('.', ',') + '′' : ''}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
    els.drawerList.querySelectorAll('.spk-jump').forEach(b => {
      b.onclick = () => {
        go(+b.dataset.idx);
        els.drawer.classList.remove('open');
      };
    });
  }

  function render() {
    const d = DATA[cur];
    els.kicker.textContent = d.kicker || d.sec || 'VẬT LÍ 12 · SIÊU ÂM';
    els.title.textContent = d.heading || d.title || '';
    const minStr = d.min ? String(d.min).replace('.', ',') + ' phút' : '—';
    els.meta.textContent = `Slide ${pad2(cur + 1)}/${pad2(TOTAL)} · ⌛ ${minStr}`;
    els.note.innerHTML = d.note || 'Trình bày các nội dung chính hiển thị trên trang chiếu.';

    const hasF = d.formulas && d.formulas.length;
    const hasB = d.bullets && d.bullets.length;
    els.factsBox.hidden = !(hasF || hasB);
    els.formulas.hidden = !hasF;
    els.formulas.innerHTML = hasF ? d.formulas.map(f => `<span class="spk-formula-chip">${f}</span>`).join('') : '';
    els.bullets.innerHTML = hasB ? d.bullets.map(b => `<li>${b}</li>`).join('') : '';

    const hasA = d.answers && d.answers.length;
    els.ansBox.hidden = !hasA;
    els.ansLabel.textContent = d.ansLabel || 'Đáp án & giải thích';
    els.answers.innerHTML = hasA ? d.answers.map(a => `<li>${a}</li>`).join('') : '';

    if (cur < TOTAL - 1) {
      const nx = DATA[cur + 1];
      els.nextCue.hidden = false;
      els.nextCue.innerHTML = `<span>Chuyển tiếp → <strong>Slide ${pad2(cur + 2)}</strong>: ${nx.heading || nx.title}</span><span>›</span>`;
      els.nextCue.onclick = () => go(cur + 1);
    } else {
      els.nextCue.hidden = false;
      els.nextCue.innerHTML = `<span><strong>Trang cuối bài</strong> — Hoàn thành bài trình bày.</span><span>↺ Về đầu</span>`;
      els.nextCue.onclick = () => go(0);
    }

    els.prog.style.width = ((cur + 1) / TOTAL * 100).toFixed(2) + '%';
    els.countBtn.textContent = `${pad2(cur + 1)} / ${pad2(TOTAL)}`;
    els.prev.disabled = cur === 0;
    els.next.disabled = cur === TOTAL - 1;
    els.drawerList.querySelectorAll('.spk-jump').forEach(b => b.classList.toggle('cur', +b.dataset.idx === cur));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function go(idx, silent = false) {
    idx = clamp(idx, 0, TOTAL - 1);
    if (idx === cur && !silent) return;
    cur = idx;
    try { history.replaceState(null, '', '#s' + pad2(cur + 1)); } catch (_) {}
    render();
    if (!silent) broadcastSlide(cur);
  }

  els.prev.onclick = () => go(cur - 1);
  els.next.onclick = () => go(cur + 1);
  els.countBtn.onclick = () => els.drawer.classList.toggle('open');
  els.tocBtn.onclick = () => els.drawer.classList.toggle('open');
  els.drawerClose.onclick = () => els.drawer.classList.remove('open');

  /* Vuốt ngang trên điện thoại để chuyển slide */
  let sx = 0, sy = 0;
  els.main.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  els.main.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      go(cur + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  /* Phím tắt trên laptop */
  window.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'Escape') { els.drawer.classList.remove('open'); return; }
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { e.preventDefault(); go(cur + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(cur - 1); }
    else if (k.toLowerCase() === 'r') { sec = 0; paintClock(); }
  });

  function markLinked() {
    if (!linked) { linked = true; els.sync.hidden = false; }
  }
  if (ch) {
    ch.onmessage = e => {
      const m = e.data;
      if (!m || m.from === winId) return;
      if (m.type === 'hello') { markLinked(); ch.postMessage({ type: 'hello-ack', idx: cur, from: winId }); }
      if (m.type === 'hello-ack') { markLinked(); }
      if (m.type === 'goto' && typeof m.idx === 'number') { markLinked(); go(m.idx, true); }
    };
    ch.postMessage({ type: 'hello', from: winId });
  }
  window.addEventListener('storage', e => {
    if (e.key !== 'sieu-am-slide' || !e.newValue) return;
    try {
      const m = JSON.parse(e.newValue);
      if (m.from !== winId && typeof m.idx === 'number') { markLinked(); go(m.idx, true); }
    } catch (_) {}
  });
  window.addEventListener('message', e => {
    const m = e.data;
    if (m && m.type === 'sieu-am-goto' && m.from !== winId && typeof m.idx === 'number') {
      markLinked();
      go(m.idx, true);
    }
  });

  window.addEventListener('hashchange', () => {
    const target = readInitialIdx();
    if (target !== cur) { cur = target; render(); }
  });

  buildDrawer();
  render();
})();
