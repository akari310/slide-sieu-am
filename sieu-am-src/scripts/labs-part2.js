/* ============================================================
   LABS 07–12 — Hấp thụ, A-scan, B-scan, Doppler, Khuyết tật, Sonar
   ============================================================ */

/* LAB 07 — Hấp thụ (Slide 16) */
(function () {
  const el = $('.lab[data-widget="absorb"]'); if (!el) return;
  const cv = $('#abCanvas'), fR = $('#abF'), dR = $('#abD'),
    fOut = $('#abFout'), dOut = $('#abDout'), pctEl = $('#abPct'), dbEl = $('#abDb');
  function paint() {
    const f = +fR.value, d = +dR.value;
    fOut.textContent = fmt(f, 1) + ' MHz';
    dOut.textContent = fmt(d, 1) + ' cm';
    const I = Math.pow(10, -(0.5 * f * d) / 10);
    pctEl.textContent = fmt(I * 100, I * 100 < 10 ? 1 : 0) + '%';
    dbEl.textContent = '−' + fmt(0.5 * f * d, 1) + ' dB';
  }
  fR.addEventListener('input', paint);
  dR.addEventListener('input', paint);
  paint();

  lab(el, {
    tick() {
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      const f = +fR.value, d = +dR.value;
      const beamW = 52;
      const P = { l: 48, r: beamW + 22, t: 32, b: 28 };
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const X = x => P.l + (x / 8) * pw;
      const Y = y => P.t + (1 - y) * ph;

      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1;
      g.font = '12px "JetBrains Mono", monospace'; g.fillStyle = '#b4ccd6';
      for (let i = 0; i <= 4; i++) {
        const y = Y(i / 4);
        g.beginPath(); g.moveTo(P.l, y); g.lineTo(P.l + pw, y); g.stroke();
        g.textAlign = 'right';
        g.fillText((i * 25) + '%', P.l - 6, y + 4);
      }
      for (let i = 0; i <= 8; i += 2) {
        const x = X(i);
        g.beginPath(); g.moveTo(x, P.t); g.lineTo(x, P.t + ph); g.stroke();
        g.textAlign = 'center';
        g.fillText(i + '', x, h - 8);
      }
      g.textAlign = 'left';
      g.fillText('I/I₀', 8, 16);
      g.textAlign = 'center';
      g.fillText('d (cm)', X(7), h - 8);
      g.textAlign = 'left';

      /* Đường tham chiếu 2 MHz */
      g.beginPath();
      for (let x = 0; x <= 8; x += 0.1) {
        const y = Math.pow(10, -(0.5 * 2 * x) / 10);
        x === 0 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y));
      }
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.32)'; g.stroke(); g.setLineDash([]);

      /* Vùng dưới đường cong */
      g.beginPath(); g.moveTo(X(0), Y(1));
      for (let x = 0; x <= 8; x += 0.1) {
        g.lineTo(X(x), Y(Math.pow(10, -(0.5 * f * x) / 10)));
      }
      g.lineTo(X(8), Y(0)); g.lineTo(X(0), Y(0)); g.closePath();
      const grd = g.createLinearGradient(0, P.t, 0, P.t + ph);
      grd.addColorStop(0, 'rgba(63,227,200,.32)'); grd.addColorStop(1, 'rgba(63,227,200,.02)');
      g.fillStyle = grd; g.fill();

      /* Đường chính */
      g.beginPath();
      for (let x = 0; x <= 8; x += 0.05) {
        const y = Math.pow(10, -(0.5 * f * x) / 10);
        x === 0 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y));
      }
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 2.2; g.stroke();

      /* Điểm đang chọn */
      const yv = Math.pow(10, -(0.5 * f * d) / 10);
      g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,180,84,.65)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(d), P.t); g.lineTo(X(d), P.t + ph); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb454';
      g.beginPath(); g.arc(X(d), Y(yv), 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,180,84,.4)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(X(d), Y(yv), 9, 0, Math.PI * 2); g.stroke();

      g.fillStyle = 'rgba(220,238,242,.72)';
      g.font = '12px "JetBrains Mono", monospace';
      g.fillText('nét đứt: 2 MHz', P.l + 8, P.t + 16);

      /* Cột minh họa chùm tia tắt dần theo độ sâu */
      const bx = w - beamW - 4, bw = 30;
      const bGrad = g.createLinearGradient(0, P.t, 0, P.t + ph);
      for (let s = 0; s <= 1; s += 0.2) {
        const val = Math.pow(10, -(0.5 * f * (s * 8)) / 10);
        bGrad.addColorStop(s, `rgba(63,227,200,${(0.1 + 0.85 * val).toFixed(2)})`);
      }
      g.fillStyle = bGrad;
      g.fillRect(bx, P.t, bw, ph);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.strokeRect(bx, P.t, bw, ph);
      const dy = P.t + (d / 8) * ph;
      g.strokeStyle = '#ffb454'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(bx - 4, dy); g.lineTo(bx + bw + 4, dy); g.stroke();
      g.fillStyle = '#b4ccd6'; g.font = '11.5px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText('0 cm', bx + bw / 2, P.t - 10);
      g.fillText('8 cm', bx + bw / 2, h - 8);
      g.textAlign = 'left';
    }
  });
})();

/* LAB 08 — Siêu âm kiểu A (Slide 18): Xung đi + Xung dội về */
(function () {
  const el = $('.lab[data-widget="ascan"]'); if (!el) return;
  const cv = $('#asCanvas'), dR = $('#asD'), dOut = $('#asDout'),
    dtEl = $('#asDt'), thEl = $('#asThick');
  const V = 1540, D1 = 1.5, D3 = 5.0, TMAX = 2 * 0.06 / V;
  let d2 = 3.0, prog = 1;

  const rng = mulberry32(707);
  const grain = Array.from({ length: 80 }, () => [rng(), rng()]);

  function paintText() {
    d2 = (+dR.value) / 10;
    dOut.textContent = fmt(d2, 1) + ' cm';
    const dt = 2 * (D3 - d2) / 100 / V;
    dtEl.textContent = fmt(dt * 1e6, 1) + ' µs';
    thEl.textContent = fmt((D3 - d2) * 10, 1) + ' mm';
  }
  dR.addEventListener('input', paintText);
  $('#asFire').onclick = () => { prog = 0; };
  paintText();

  function peak(t, t0, a, s = 0.9) { return a * Math.exp(-Math.pow(((t - t0) * 1e6) / s, 2)); }

  lab(el, {
    tick(t, dt) {
      if (prog < 1) prog = Math.min(1, prog + dt * 0.55);
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 28);

      const bodyW = Math.min(w * 0.34, 300), tx = bodyW + 18, tw = w - tx - 14;
      const top = 40, bot = h - 32, bh = bot - top;
      const xBox = bodyW * 0.14, wBox = bodyW * 0.78;
      const yOf = d => top + (d / 6) * bh;
      const tOf = d => 2 * (d / 100) / V;

      const bands = [
        { from: 0, to: D1, c1: 'rgba(230,190,170,.65)', c2: 'rgba(200,150,130,.72)', lab: 'Da' },
        { from: D1, to: d2, c1: 'rgba(215,175,115,.58)', c2: 'rgba(180,140,90,.66)', lab: 'Mỡ' },
        { from: d2, to: D3, c1: 'rgba(155,90,90,.62)', c2: 'rgba(115,60,60,.72)', lab: 'Cơ' },
        { from: D3, to: 6, c1: 'rgba(205,210,220,.65)', c2: 'rgba(155,160,175,.8)', lab: 'Xương' }
      ];
      bands.forEach(B => {
        const y0 = yOf(B.from), y1 = yOf(B.to);
        const gr = g.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, B.c1); gr.addColorStop(1, B.c2);
        g.fillStyle = gr;
        g.fillRect(xBox, y0, wBox, y1 - y0);
        g.fillStyle = 'rgba(255,255,255,.07)';
        grain.slice(0, 16).forEach(([rx, ry]) => {
          g.fillRect(xBox + rx * wBox, y0 + ry * (y1 - y0), 1.4, 1.4);
        });
        /* Nhãn lớp mô cỡ lớn, nền pill đậm đặt giữa dải mô để nhìn rõ từ cuối lớp */
        g.font = 'bold 13px "Be Vietnam Pro", sans-serif';
        const twLab = g.measureText(B.lab).width;
        const pw = Math.max(40, twLab + 14), ph = Math.min(20, Math.max(14, (y1 - y0) - 4));
        const px = xBox + (wBox - pw) / 2, py = (y0 + y1 - ph) / 2;
        g.fillStyle = 'rgba(7, 19, 30, 0.78)';
        rr(g, px, py, pw, ph, 5); g.fill();
        g.fillStyle = '#ffffff';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(B.lab, xBox + wBox / 2, (y0 + y1) / 2 + 0.5);
        g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      });
      g.strokeStyle = 'rgba(120,215,220,.5)'; g.lineWidth = 1.4;
      rr(g, xBox, top - 2, wBox, bh + 4, 4); g.stroke();

      g.fillStyle = 'rgba(63,227,200,.32)'; g.strokeStyle = '#3fe3c8';
      rr(g, xBox + wBox * 0.22, top - 20, wBox * 0.56, 15, 3); g.fill(); g.stroke();
      g.fillStyle = '#dceef2'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.textAlign = 'center'; g.fillText('Đầu dò', xBox + wBox * 0.5, top - 24); g.textAlign = 'left';

      const layers = [
        { d: D1, c: '#8bd3ff', lab: 'A' },
        { d: d2, c: '#3fe3c8', lab: 'B' },
        { d: D3, c: '#ffb454', lab: 'C' }
      ];
      layers.forEach(L => {
        const y = yOf(L.d);
        g.strokeStyle = L.c; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(xBox, y); g.lineTo(xBox + wBox, y); g.stroke();
        g.fillStyle = L.c; g.font = 'bold 13.5px "JetBrains Mono", monospace';
        g.fillText(L.lab, bodyW * 0.03, y + 4);
      });
      g.fillStyle = '#b4ccd6'; g.font = '12px "JetBrains Mono", monospace';
      g.fillText('0', bodyW * 0.02, top + 4);
      g.fillText('6 cm', bodyW * 0.01, bot);

      /* Xung đi xuống và các xung echo dội ngược về đầu dò */
      if (prog < 1) {
        const tt = prog * TMAX;
        const ddDown = Math.min(6, (V * tt) * 100);
        if (ddDown <= 6) {
          g.fillStyle = '#ffffff';
          g.beginPath(); g.arc(xBox + wBox * 0.35, yOf(ddDown), 3.8, 0, Math.PI * 2); g.fill();
        }
        layers.forEach(L => {
          const tHit = (L.d / 100) / V;
          const tBack = 2 * tHit;
          if (tt >= tHit && tt <= tBack) {
            const dNow = L.d * (1 - (tt - tHit) / tHit);
            g.fillStyle = L.c;
            g.beginPath(); g.arc(xBox + wBox * 0.65, yOf(dNow), 3.4, 0, Math.PI * 2); g.fill();
          }
        });
      }

      /* Trục thời gian */
      const baseY = h * 0.62, amp = h * 0.44;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(tx, baseY); g.lineTo(tx + tw, baseY); g.stroke();
      g.fillStyle = '#b4ccd6'; g.font = '12px "JetBrains Mono", monospace';
      for (let us = 0; us <= 80; us += 20) {
        const x = tx + (us * 1e-6 / TMAX) * tw;
        g.beginPath(); g.moveTo(x, baseY - 3); g.lineTo(x, baseY + 3); g.stroke();
        g.textAlign = 'center'; g.fillText(us + '', x, baseY + 17);
      }
      g.textAlign = 'left';
      g.fillText('t (µs)', tx + tw - 44, baseY + 30);
      g.fillText('Biên độ điện áp U', tx, top + 4);

      const reveal = prog * TMAX;
      const N = Math.max(2, Math.round(tw));
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const tt = (i / N) * TMAX;
        if (tt > reveal) break;
        let u = peak(tt, 0, 1.05, 0.55);
        u += peak(tt, tOf(D1), 0.88);
        u += peak(tt, tOf(d2), 0.58);
        u += peak(tt, tOf(D3), 0.82);
        pts.push([tx + (tt / TMAX) * tw, baseY - u * amp * 0.9]);
      }
      if (pts.length > 1) {
        g.beginPath();
        pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
        g.strokeStyle = '#3fe3c8'; g.lineWidth = 2; g.stroke();
      }

      if (prog > 0.98) {
        const x2 = tx + (tOf(d2) / TMAX) * tw, x3 = tx + (tOf(D3) / TMAX) * tw;
        const y = baseY - amp * 0.95;
        g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,180,84,.6)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x2, baseY); g.lineTo(x2, y); g.moveTo(x3, baseY); g.lineTo(x3, y); g.stroke();
        g.setLineDash([]);
        g.strokeStyle = '#ffb454'; g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x2, y); g.lineTo(x3, y);
        g.moveTo(x2, y - 4); g.lineTo(x2, y + 4);
        g.moveTo(x3, y - 4); g.lineTo(x3, y + 4);
        g.stroke();
        g.fillStyle = '#ffb454'; g.font = '12.5px "JetBrains Mono", monospace';
        g.textAlign = 'center';
        g.fillText('Δt(B→C)', (x2 + x3) / 2, y - 8);
        g.textAlign = 'left';
      }
    }
  });
})();

/* LAB 09 — Siêu âm kiểu B (Slide 19): Có sỏi + bóng lưng âm + nang dịch */
(function () {
  const el = $('.lab[data-widget="bscan"]'); if (!el) return;
  const cv = $('#bsCanvas'), gainR = $('#bsGain'), gainOut = $('#bsGainOut'),
    speedR = $('#bsSpeed'), speedOut = $('#bsSpeedOut'), statusEl = $('#bsStatus');
  const IW = 480, IH = 300;
  const off = document.createElement('canvas'); off.width = IW; off.height = IH;
  const octx = off.getContext('2d');
  const img = octx.createImageData(IW, IH);
  const rng = mulberry32(808);
  const noise = Float32Array.from({ length: IW * IH }, () => 0.84 + 0.28 * rng());
  let prog = 0, scanning = true;

  function scene(u, v) {
    let b = 0;
    const gs = (y0, s, w0) => s * Math.exp(-Math.pow((v - y0) / w0, 2));
    b += gs(0.08, 0.55, 0.007);
    b += gs(0.16 + 0.008 * Math.sin(u * 11), 0.85, 0.01);
    b += gs(0.25 + 0.012 * Math.sin(u * 7 + 0.8), 0.42, 0.008);
    b += 0.34 * Math.exp(-Math.pow((v - 0.52) / 0.24, 2)) * (0.65 + 0.35 * Math.sin(u * 30 + v * 40));

    /* Nang dịch bên phải (vùng trống âm đen + thành nang sáng + tăng âm nhẹ phía sau) */
    const dx = u - 0.68, dy = (v - 0.55) * 0.85;
    const r = Math.hypot(dx, dy);
    if (r < 0.125) b *= 0.08;
    b += 0.88 * Math.exp(-Math.pow((r - 0.125) / 0.012, 2));
    if (Math.abs(u - 0.68) < 0.11 && v > 0.67) b += 0.16;

    /* Viên sỏi bên trái (đốm phản xạ rất mạnh) + BÓNG LƯNG ÂM phía dưới */
    const sx = 0.30, sy = 0.66;
    const rs = Math.hypot(u - sx, (v - sy) * 0.9);
    b += 1.35 * Math.exp(-Math.pow(rs / 0.024, 2));

    b += gs(0.92, 0.68, 0.01);
    b *= Math.exp(-1.25 * v);

    /* Bóng lưng âm (acoustic shadow): vệt tối sau viên sỏi vì sỏi cản gần hết sóng */
    if (v > sy + 0.018 && Math.abs(u - sx) < 0.032) {
      const edge = 1 - Math.exp(-Math.pow((Math.abs(u - sx) - 0.032) / 0.008, 2));
      b *= 0.08 + 0.15 * edge;
    }
    return clamp(b, 0, 1.4);
  }
  function build(gain) {
    for (let y = 0; y < IH; y++) {
      for (let x = 0; x < IW; x++) {
        const idx = y * IW + x;
        const b = clamp(scene(x / IW, y / IH) * noise[idx] * gain, 0, 1);
        const val = Math.pow(b, 0.82);
        const i = idx * 4;
        img.data[i] = Math.round(255 * val * 0.64);
        img.data[i + 1] = Math.round(255 * val * 0.94);
        img.data[i + 2] = Math.round(255 * val);
        img.data[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
  }
  function paintGain() {
    const g = +gainR.value / 100;
    gainOut.textContent = fmt(g, 1) + '×';
    build(g);
  }
  function paintSpeed() {
    if (!speedR || !speedOut) return;
    speedOut.textContent = fmt(+speedR.value / 100, 1) + '×';
  }
  gainR.addEventListener('input', paintGain);
  if (speedR) speedR.addEventListener('input', paintSpeed);
  $('#bsScan').onclick = () => {
    prog = 0; scanning = true;
    statusEl.textContent = 'đang quét từng cột…';
    build(+gainR.value / 100);
  };
  paintGain();
  paintSpeed();

  lab(el, {
    tick(t, dt) {
      const { g, w, h } = fit(cv);
      const spd = speedR ? (+speedR.value / 100) : 1;
      if (scanning) {
        prog = Math.min(1, prog + dt * 0.45 * spd);
        if (prog >= 1) { scanning = false; statusEl.textContent = 'đã dựng xong ảnh 2D'; }
      }
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#040b12'; g.fillRect(0, 0, w, h);
      const aPanelW = Math.min(108, Math.max(82, Math.round(w * 0.2)));
      const imgW = w - aPanelW - 10;
      const topY = 18;
      const imgH = h - topY;
      const sw = Math.max(1, imgW * prog);

      /* Vẽ phần lát cắt 2D đã quét từ trái sang phải */
      g.drawImage(off, 0, 0, Math.max(1, IW * prog), IH, 0, topY, sw, imgH);

      /* Đầu dò nằm ngang phía trên và tia quét dọc tại cột hiện tại */
      g.fillStyle = 'rgba(139,211,255,.14)';
      g.fillRect(0, 0, imgW, topY);
      g.strokeStyle = 'rgba(139,211,255,.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, topY); g.lineTo(imgW, topY); g.stroke();

      const activeU = prog < 1 ? prog : 0.30;
      const activeX = prog < 1 ? sw : imgW * 0.30;

      /* Độ sâu mặt phản xạ chính trên cột hiện tại (gặp sỏi tại v=0.66 thì dội ngược hoàn toàn) */
      const onStone = Math.abs(activeU - 0.30) < 0.036;
      const vHit = onStone ? 0.66 : 0.92;
      const hitY = topY + vHit * imgH;
      const pulsePh = (t * (prog < 1 ? 2.6 : 1.15)) % 1;
      const goingDown = pulsePh < 0.5;
      const kVert = goingDown ? (pulsePh / 0.5) : (1 - (pulsePh - 0.5) / 0.5);
      const py = topY + kVert * (hitY - topY);

      if (prog < 1) {
        const grd = g.createLinearGradient(sw - 34, 0, sw, 0);
        grd.addColorStop(0, 'rgba(63,227,200,0)');
        grd.addColorStop(1, 'rgba(63,227,200,.34)');
        g.fillStyle = grd; g.fillRect(Math.max(0, sw - 34), topY, 34, imgH);
        g.strokeStyle = 'rgba(63,227,200,.72)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(sw, topY); g.lineTo(sw, hitY); g.stroke();
      } else {
        g.setLineDash([4, 3]); g.strokeStyle = 'rgba(255,180,84,.55)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(activeX, topY); g.lineTo(activeX, hitY); g.stroke();
        g.setLineDash([]);
      }

      /* Chấn tử phát/thu ở mép trên: xanh ngọc khi phát xuống, loé vàng cam khi nhận echo dội về */
      const receivingFlash = !goingDown && pulsePh > 0.88;
      g.fillStyle = receivingFlash ? '#ffb454' : '#3fe3c8';
      rr(g, clamp(activeX - 9, 2, imgW - 20), 3, 18, 12, 3); g.fill();

      /* Hiệu ứng hạt xung siêu âm bắn thẳng xuống & dội thẳng ngược lên đầu dò */
      if (goingDown) {
        /* Hạt phát xuống (xanh ngọc + đuôi trên) */
        const tailY = Math.max(topY, py - 20);
        const tg = g.createLinearGradient(0, tailY, 0, py);
        tg.addColorStop(0, 'rgba(63,227,200,0)');
        tg.addColorStop(1, 'rgba(63,227,200,0.95)');
        g.strokeStyle = tg; g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(activeX, tailY); g.lineTo(activeX, py); g.stroke();

        g.fillStyle = '#eafffb';
        g.beginPath(); g.arc(activeX, py, 3.6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(activeX, py, 5.5, 0, Math.PI * 2); g.stroke();
      } else {
        /* Vòng loé sáng ngay mặt phản xạ khi hạt vừa đập vào */
        const ep = (pulsePh - 0.5) / 0.5;
        if (ep < 0.35) {
          const rrHit = 4 + ep * 32;
          g.strokeStyle = `rgba(255,180,84,${(0.92 * (1 - ep / 0.35)).toFixed(2)})`;
          g.lineWidth = 1.8;
          g.beginPath(); g.arc(activeX, hitY, rrHit, Math.PI, Math.PI * 2); g.stroke();
        }
        /* Hạt echo dội thẳng ngược lên đầu dò (vàng cam + đuôi dưới) */
        const tailY = Math.min(hitY, py + 22);
        const tg = g.createLinearGradient(0, tailY, 0, py);
        tg.addColorStop(0, 'rgba(255,180,84,0)');
        tg.addColorStop(1, 'rgba(255,180,84,0.98)');
        g.strokeStyle = tg; g.lineWidth = 2.8;
        g.beginPath(); g.moveTo(activeX, tailY); g.lineTo(activeX, py); g.stroke();

        g.fillStyle = '#fff5dc';
        g.beginPath(); g.arc(activeX, py, 3.8, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ffb454'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(activeX, py, 6, 0, Math.PI * 2); g.stroke();
      }

      /* Nhãn độ sâu & sỏi/nang trên vùng ảnh 2D */
      g.fillStyle = '#b4ccd6'; g.font = '11.5px "JetBrains Mono", monospace';
      g.textAlign = 'right';
      g.fillText('Quét ngang: trái → phải', imgW - 8, 13.5);
      g.textAlign = 'left';
      for (let i = 1; i <= 3; i++) {
        const y = topY + imgH * i / 3.4;
        g.fillText((i * 2) + ' cm', imgW - 40, y);
        g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(imgW - 46, y); g.lineTo(imgW - 42, y); g.stroke();
      }
      if (prog > 0.35) {
        g.fillStyle = '#ffb454';
        g.fillText('Sỏi (tăng âm)', imgW * 0.30 + 10, topY + imgH * 0.66);
        g.fillStyle = '#ff6f85';
        g.fillText('Bóng lưng âm', imgW * 0.30 + 10, topY + imgH * 0.84);
      }
      if (prog > 0.72) {
        g.fillStyle = '#3fe3c8';
        g.fillText('Nang dịch', imgW * 0.68 - 32, topY + imgH * 0.56);
      }

      /* Chú thích hạt phát xuống & hạt dội ngược lên (góc dưới trái) */
      g.fillStyle = 'rgba(4,11,20,0.82)';
      rr(g, 8, h - 24, 214, 18, 5); g.fill();
      g.font = 'bold 10.5px "JetBrains Mono", monospace';
      g.fillStyle = '#3fe3c8';
      g.fillText('● Phát xuống', 15, h - 11);
      g.fillStyle = '#ffb454';
      g.fillText('● Phản xạ lên', 112, h - 11);

      /* Cột bên phải: Đồ thị 1 đường A dọc từ trên xuống tại đúng cột tia quét */
      const ax = imgW + 8, aw = aPanelW - 6;
      g.fillStyle = '#07131e';
      rr(g, ax, 4, aw, h - 8, 5); g.fill();
      g.strokeStyle = 'rgba(63,227,200,.3)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#3fe3c8'; g.font = 'bold 11.5px "JetBrains Mono", monospace';
      g.fillText(prog < 1 ? 'Đường A đang quét' : 'Đường A tại sỏi', ax + 6, 17);

      const baseAX = ax + 10, maxAmp = aw - 18, gainVal = +gainR.value / 100;
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(baseAX, topY + 2); g.lineTo(baseAX, h - 8); g.stroke();

      g.beginPath();
      for (let yy = topY + 2; yy <= h - 8; yy += 2) {
        const vNorm = (yy - topY) / imgH;
        const val = clamp(scene(activeU, vNorm) * gainVal, 0, 1);
        const px = baseAX + val * maxAmp;
        yy === topY + 2 ? g.moveTo(px, yy) : g.lineTo(px, yy);
      }
      g.strokeStyle = prog < 1 ? '#3fe3c8' : '#ffb454';
      g.lineWidth = 1.6;
      g.stroke();

      /* Chấm đồng bộ vị trí hạt xung trên đồ thị đường A */
      const vCur = clamp((py - topY) / imgH, 0, 1);
      const aDotX = baseAX + clamp(scene(activeU, vCur) * gainVal, 0, 1) * maxAmp;
      g.fillStyle = goingDown ? '#3fe3c8' : '#ffb454';
      g.beginPath(); g.arc(aDotX, clamp(py, topY + 2, h - 8), 3.4, 0, Math.PI * 2); g.fill();
    }
  });
})();

/* LAB 10 — Doppler (Slide 20): Hồng cầu chuyển động đồng bộ vận tốc máu */
(function () {
  const el = $('.lab[data-widget="doppler"]'); if (!el) return;
  const cv = $('#dpCanvas'), vR = $('#dpV'), vOut = $('#dpVout'), dfEl = $('#dpDf');
  let ph = 0, df = 0, flowOffset = 0;

  const rng = mulberry32(909);
  const rbcs = Array.from({ length: 18 }, () => ({
    x: rng(),
    y: 0.2 + rng() * 0.6
  }));

  function paint() {
    const v = +vR.value / 100;
    vOut.textContent = vR.value + ' cm/s';
    df = 2 * 5e6 * v * Math.cos(Math.PI / 3) / 1540;
    dfEl.textContent = df >= 1000 ? fmt(df / 1000, 2) + ' kHz' : fmt(df, 0) + ' Hz';
  }
  vR.addEventListener('input', paint); paint();

  lab(el, {
    tick(t, dt) {
      const vNorm = (+vR.value) / 120;
      ph += dt * 2.6;
      flowOffset += dt * (0.55 * vNorm);

      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 26);

      const kVis = 1 + (df / 1000) * 0.08;
      const lanes = [
        { y: h * 0.24, k: 1, c: '#8bd3ff', label: 'Sóng phát f₀' },
        { y: h * 0.52, k: kVis, c: '#3fe3c8', label: 'Sóng phản xạ f₀ + Δf' }
      ];
      lanes.forEach(L => {
        g.beginPath();
        for (let x = 12; x < w - 12; x += 2) {
          const y = L.y + 12 * Math.sin((x - 12) * 0.055 * L.k - ph * L.k);
          x === 12 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = L.c; g.lineWidth = 2; g.stroke();
        g.fillStyle = L.c; g.font = '12.5px "JetBrains Mono", monospace';
        g.fillText(L.label, 12, L.y - 19);
      });

      /* Lòng mạch máu với các tế bào hồng cầu chạy theo dpV */
      const vy = h * 0.74, vh = h * 0.2;
      g.fillStyle = 'rgba(130,28,44,.42)';
      g.fillRect(12, vy, w - 24, vh);
      g.strokeStyle = 'rgba(255,111,133,.55)'; g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(12, vy); g.lineTo(w - 12, vy);
      g.moveTo(12, vy + vh); g.lineTo(w - 12, vy + vh);
      g.stroke();

      rbcs.forEach(c => {
        const px = 18 + (((c.x + flowOffset) % 1) * (w - 36));
        const py = vy + 4 + c.y * (vh - 8);
        g.fillStyle = '#ff6f85';
        g.beginPath(); g.ellipse(px, py, 6, 3.2, 0, 0, Math.PI * 2); g.fill();
      });

      g.fillStyle = '#ffb454'; g.font = '12px "JetBrains Mono", monospace';
      g.fillText(vNorm === 0 ? 'Dòng máu đứng yên (Δf = 0)' : 'Hồng cầu chuyển động về đầu dò →', 16, vy - 6);
    }
  });
})();

/* LAB 11 — Dò khuyết tật mối hàn (Slide 23): Đầu dò góc + bật/tắt lỗ hổng */
(function () {
  const el = $('.lab[data-widget="defect"]'); if (!el) return;
  const cv = $('#dfCanvas'), dR = $('#dfD'), dOut = $('#dfDout'), stateEl = $('#dfState'), toggleBtn = $('#dfToggle');
  const V = 5900, DEPTH = 0.10, TMAX = 2 * DEPTH / V;
  let dmm = 45, prog = 1, hasDefect = true;

  const rng = mulberry32(1010);
  const grains = Array.from({ length: 42 }, () => [rng(), rng()]);

  function paint() {
    dmm = +dR.value;
    dOut.textContent = fmt(dmm / 10, 1) + ' cm';
    stateEl.textContent = hasDefect ? 'sẵn sàng (mẫu có lỗ hổng)' : 'sẵn sàng (mẫu đạt chuẩn)';
  }
  dR.addEventListener('input', () => { paint(); prog = 1; });
  $('#dfFire').onclick = () => { prog = 0; stateEl.textContent = 'đang đo xung…'; };
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      hasDefect = !hasDefect;
      toggleBtn.textContent = hasDefect ? 'Mẫu: Có lỗ hổng' : 'Mẫu: Đạt chuẩn';
      dR.disabled = !hasDefect;
      prog = 1;
      paint();
    };
  }
  paint();

  lab(el, {
    tick(t, dt) {
      if (prog < 1) {
        prog = Math.min(1, prog + dt * 0.78);
        if (prog >= 1) stateEl.textContent = hasDefect ? 'có xung sớm → phát hiện lỗ hổng' : 'chỉ 1 xung đáy → mối hàn đạt chuẩn';
      }
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 26);

      const bw = w * 0.34, bx = 12, by = 34, bh = h - 54;
      const steel = g.createLinearGradient(bx, by, bx + bw, by);
      steel.addColorStop(0, 'rgba(90,110,130,.38)');
      steel.addColorStop(0.5, 'rgba(150,175,195,.48)');
      steel.addColorStop(1, 'rgba(80,100,120,.38)');
      g.fillStyle = steel;
      rr(g, bx, by, bw, bh, 4); g.fill();

      g.fillStyle = 'rgba(200,160,90,.24)';
      g.fillRect(bx + bw * 0.42, by, bw * 0.16, bh);
      g.strokeStyle = 'rgba(200,160,90,.55)'; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(bx + bw * 0.42, by); g.lineTo(bx + bw * 0.42, by + bh);
      g.moveTo(bx + bw * 0.58, by); g.lineTo(bx + bw * 0.58, by + bh);
      g.stroke();

      g.fillStyle = 'rgba(255,255,255,.07)';
      grains.forEach(([rx, ry]) => g.fillRect(bx + rx * bw, by + ry * bh, 1.5, 1.5));
      g.strokeStyle = 'rgba(180,210,225,.6)'; g.lineWidth = 1.2;
      rr(g, bx, by, bw, bh, 4); g.stroke();

      /* Đầu dò trên khối thép */
      g.fillStyle = 'rgba(63,227,200,.28)'; g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.3;
      rr(g, bx + bw / 2 - 18, by - 16, 36, 13, 3); g.fill(); g.stroke();
      g.fillStyle = '#dceef2'; g.font = '12px "JetBrains Mono", monospace';
      g.textAlign = 'center'; g.fillText('Đầu dò NDT', bx + bw / 2, by - 21); g.textAlign = 'left';

      if (hasDefect) {
        const dy = by + (dmm / 100) * bh;
        g.fillStyle = 'rgba(255,111,133,.9)';
        g.beginPath();
        g.ellipse(bx + bw * 0.5, dy, Math.min(13, bw * 0.1), Math.min(8, bh * 0.045), 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ff6f85'; g.font = '12px "JetBrains Mono", monospace';
        g.fillText('lỗ hổng', bx + bw * 0.5 + 16, dy + 4);
      }

      if (prog < 1) {
        const dd = Math.min(1, prog * 2) * DEPTH;
        const yy = by + (dd / DEPTH) * bh;
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(bx + bw / 2, yy, 3.2, 0, Math.PI * 2); g.fill();
      }

      const tx = bx + bw + 18, tw = w - tx - 12;
      const baseY = h * 0.62, amp = h * 0.44;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(tx, baseY); g.lineTo(tx + tw, baseY); g.stroke();
      g.fillStyle = '#b4ccd6'; g.font = '12px "JetBrains Mono", monospace';
      for (let us = 0; us <= 35; us += 10) {
        const x = tx + (us * 1e-6 / TMAX) * tw;
        g.beginPath(); g.moveTo(x, baseY - 3); g.lineTo(x, baseY + 3); g.stroke();
        g.textAlign = 'center'; g.fillText(us + '', x, baseY + 16);
      }
      g.textAlign = 'left';
      g.fillText('t (µs)', tx + tw - 44, baseY + 29);

      const reveal = prog * TMAX;
      const pts = [];
      for (let i = 0; i <= tw; i++) {
        const tt = (i / tw) * TMAX;
        if (tt > reveal) break;
        let u = 1.05 * Math.exp(-Math.pow(tt / 0.38e-6, 2));
        if (hasDefect) u += 0.58 * Math.exp(-Math.pow((tt - 2 * (dmm / 1000) / V) / 0.5e-6, 2));
        u += 0.85 * Math.exp(-Math.pow((tt - TMAX) / 0.55e-6, 2));
        pts.push([tx + (tt / TMAX) * tw, baseY - u * amp]);
      }
      if (pts.length > 1) {
        g.beginPath();
        pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
        g.strokeStyle = '#3fe3c8'; g.lineWidth = 2; g.stroke();
      }

      if (prog > 0.98) {
        const xb = tx + tw - 16;
        g.font = '12px "JetBrains Mono", monospace';
        g.textAlign = 'center';
        if (hasDefect) {
          const xd = tx + (2 * (dmm / 1000) / V / TMAX) * tw;
          g.fillStyle = '#ff6f85'; g.fillText('khuyết tật', xd, baseY - amp * 0.64 - 6);
        }
        g.fillStyle = '#8bd3ff'; g.fillText('đáy', xb, baseY - amp * 0.9 - 6);
        g.textAlign = 'left';
      }
    }
  });
})();

/* LAB 12 — Sonar (Slide 24) */
(function () {
  const el = $('.lab[data-widget="sonar"]'); if (!el) return;
  const cv = $('#snCanvas'), tEl = $('#snT'), hEl = $('#snH');
  const V = 1500;
  let depth = 64, prog = 0, running = false, done = false;

  function reset() {
    depth = 30 + Math.round(Math.random() * 60);
    prog = 0; running = false; done = false;
    tEl.textContent = '—'; hEl.textContent = '—';
  }
  $('#snFire').onclick = () => {
    prog = 0; running = true; done = false;
    tEl.textContent = '0,0 ms'; hEl.textContent = '—';
  };
  $('#snNew').onclick = reset;
  reset();

  lab(el, {
    tick(t, dt) {
      if (running) {
        prog = Math.min(1, prog + dt / 2.2);
        if (prog >= 1) {
          running = false; done = true;
          const tt = 2 * depth / V;
          tEl.textContent = fmt(tt * 1000, 1) + ' ms';
          hEl.textContent = fmt(depth, 0) + ' m';
        } else {
          const tt = prog * 2 * depth / V;
          tEl.textContent = fmt(tt * 1000, 1) + ' ms';
        }
      }
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      const sky = h * 0.16, seaH = h - sky;
      const gt = g.createLinearGradient(0, 0, 0, sky);
      gt.addColorStop(0, '#0a1a2a'); gt.addColorStop(1, '#102e3e');
      g.fillStyle = gt; g.fillRect(0, 0, w, sky);
      const gs = g.createLinearGradient(0, sky, 0, h);
      gs.addColorStop(0, 'rgba(20,90,110,.6)'); gs.addColorStop(1, 'rgba(4,16,26,.98)');
      g.fillStyle = gs; g.fillRect(0, sky, w, seaH);

      /* Đáy biển ở đáy khung */
      g.fillStyle = 'rgba(70,56,42,.85)';
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, h - 14);
      g.quadraticCurveTo(w * 0.35, h - 22, w * 0.65, h - 10);
      g.lineTo(w, h - 16);
      g.lineTo(w, h);
      g.closePath();
      g.fill();

      g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.4;
      g.beginPath();
      for (let x = 0; x < w; x += 6) {
        const y = sky + Math.sin(x * 0.05 + t * 1.6) * 2;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();

      const bx = w * 0.42, by = sky + 8;
      g.fillStyle = '#dceef2';
      g.beginPath();
      g.moveTo(bx - 24, sky - 2); g.lineTo(bx + 24, sky - 2);
      g.lineTo(bx + 16, sky + 8); g.lineTo(bx - 16, sky + 8);
      g.closePath(); g.fill();
      g.fillRect(bx - 6, sky - 15, 12, 13);

      const fy = sky + (depth / 100) * seaH * 0.84;
      const coneHalfAngle = 0.46; // ~26° mỗi bên (chùm sóng nón lan rộng)
      const coneBotR = (h - 14 - by) / Math.cos(coneHalfAngle);
      const a0 = Math.PI / 2 - coneHalfAngle, a1 = Math.PI / 2 + coneHalfAngle;

      /* Vùng nón chùm sóng sonar tỏa rộng xuống biển */
      g.save();
      g.beginPath();
      g.moveTo(bx, by);
      g.arc(bx, by, coneBotR, a0, a1);
      g.closePath();
      const beamGrad = g.createLinearGradient(0, by, 0, h);
      beamGrad.addColorStop(0, 'rgba(63,227,200,.14)');
      beamGrad.addColorStop(1, 'rgba(63,227,200,.02)');
      g.fillStyle = beamGrad; g.fill();
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(63,227,200,.24)'; g.lineWidth = 1;
      g.stroke(); g.setLineDash([]);
      g.restore();

      /* Đàn cá nằm trong vùng quét của nón chùm tia */
      const fishCx = bx;
      const fishList = [];
      for (let i = 0; i < 7; i++) {
        const fx = bx - 36 + (i % 4) * 24 + Math.sin(t + i) * 3;
        const yy = fy + Math.floor(i / 4) * 14 + Math.sin(t * 2 + i) * 2;
        fishList.push([fx, yy]);
      }
      const echoHit = (running && prog >= 0.45) || done;
      fishList.forEach(([fx, yy]) => {
        g.fillStyle = echoHit ? '#ffd166' : '#ffb454';
        g.beginPath(); g.ellipse(fx, yy, 7.5, 3.8, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(fx - 7.5, yy); g.lineTo(fx - 13, yy - 3.5); g.lineTo(fx - 13, yy + 3.5); g.closePath(); g.fill();
      });

      const targetDist = Math.hypot(fishCx - bx, fy - by);
      if (running) {
        if (prog <= 0.52) {
          /* Nửa đầu: mặt sóng cầu lan rộng ra trong hình nón từ đầu dò đáy tàu */
          const rOut = (prog / 0.52) * targetDist;
          for (let k = 0; k < 3; k++) {
            const rrArc = rOut - k * 10;
            if (rrArc <= 4) continue;
            g.beginPath();
            g.arc(bx, by, rrArc, a0, a1);
            g.strokeStyle = `rgba(63,227,200,${(0.85 - k * 0.25).toFixed(2)})`;
            g.lineWidth = 2 - k * 0.35; g.stroke();
          }
        } else {
          /* Nửa sau: mặt sóng chính tiếp tục đi xuống đáy, đồng thời echo phản xạ từ đàn cá dội ngược thẳng về tàu */
          const rDown = (prog / 0.52) * targetDist;
          if (rDown < coneBotR) {
            g.beginPath(); g.arc(bx, by, rDown, a0, a1);
            g.strokeStyle = 'rgba(63,227,200,.25)'; g.lineWidth = 1.2; g.stroke();
          }
          const backProg = (prog - 0.52) / 0.48;
          const rBack = backProg * targetDist;
          const angleToShip = Math.atan2(by - fy, bx - fishCx);
          for (let k = 0; k < 3; k++) {
            const rrEcho = rBack - k * 9;
            if (rrEcho <= 4 || rrEcho > targetDist) continue;
            g.beginPath();
            g.arc(fishCx, fy, rrEcho, angleToShip - 0.52, angleToShip + 0.52);
            g.strokeStyle = `rgba(255,180,84,${(0.9 - k * 0.24).toFixed(2)})`;
            g.lineWidth = 2.1 - k * 0.35; g.stroke();
          }
          g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,180,84,.45)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(fishCx, fy); g.lineTo(bx, by); g.stroke();
          g.setLineDash([]);
        }
      }

      g.fillStyle = '#b4ccd6'; g.font = '12px "JetBrains Mono", monospace';
      for (let m = 20; m <= 100; m += 20) {
        const y = sky + (m / 100) * seaH * 0.84;
        g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(w - 44, y); g.lineTo(w - 10, y); g.stroke();
        g.fillText(m + ' m', w - 44, y - 4);
      }

      if (done) {
        g.setLineDash([4, 3]); g.strokeStyle = 'rgba(255,180,84,.55)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(fishCx, fy); g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#3fe3c8'; g.font = 'bold 13.5px "JetBrains Mono", monospace';
        g.fillText('h = v·t/2 = ' + depth + ' m', bx + 34, sky + 24);
      }
    }
  });
})();

/* LAB 13 — Tán sỏi ngoài cơ thể ESWL (Slide 29) */
(function () {
  const el = $('.lab[data-widget="hifu"]'); if (!el) return;
  const cv = $('#hfCanvas'), pR = $('#hfPwr'), pOut = $('#hfPwrOut'), targetEl = $('#hfTarget');
  const fireBtn = $('#hfFire'), resetBtn = $('#hfReset');
  let power = 80, firing = false, prog = 0;

  pR.addEventListener('input', () => {
    power = +pR.value;
    pOut.textContent = power + '%';
  });
  fireBtn.onclick = () => {
    firing = true;
    prog = 0;
    targetEl.textContent = 'đang phát xung hội tụ…';
  };
  if (resetBtn) {
    resetBtn.onclick = () => {
      firing = false;
      prog = 0;
      targetEl.textContent = 'sẵn sàng';
    };
  }

  lab(el, {
    tick(t, dt) {
      if (firing) {
        prog = Math.min(1, prog + dt * 0.48);
        if (prog >= 1) {
          firing = false;
          targetEl.textContent = power >= 60 ? 'đã vỡ thành mảnh vụn nhỏ' : 'nứt nhẹ (cần tăng công suất)';
        }
      }
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 24);

      const cx = w * 0.54, topY = 18, skinY = h * 0.34, focY = h * 0.72;
      /* Lớp da */
      g.fillStyle = 'rgba(255,111,133,.16)';
      g.fillRect(10, skinY - 6, w - 20, 12);
      g.fillStyle = '#ff6f85'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.fillText('Lớp da (giữ 37 °C)', 14, skinY - 10);

      /* Đầu phát cong lõm */
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 5;
      g.beginPath(); g.arc(cx, focY, focY - topY, -Math.PI / 2 - 0.65, -Math.PI / 2 + 0.65); g.stroke();

      /* 5 chùm tia hội tụ về tiêu điểm (cx, focY) */
      for (let i = -2; i <= 2; i++) {
        const ang = -Math.PI / 2 + i * 0.28;
        const sx = cx + Math.cos(ang) * (focY - topY);
        const sy = focY + Math.sin(ang) * (focY - topY);
        g.strokeStyle = firing ? `rgba(63,227,200,${0.4 + 0.4 * (power / 100)})` : 'rgba(96,165,250,.45)';
        g.lineWidth = firing ? 2 : 1.3;
        g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(cx, focY); g.stroke();
        g.setLineDash([]);
        if (firing && prog < 0.98) {
          const frac = (prog * 2.5) % 1;
          const px = sx + (cx - sx) * frac, py = sy + (focY - sy) * frac;
          g.fillStyle = '#3fe3c8';
          g.beginPath(); g.arc(px, py, 3.2, 0, Math.PI * 2); g.fill();
        }
      }

      /* Quầng áp suất tại tiêu điểm */
      const impact = firing ? prog * (power / 100) : (prog > 0.9 ? power / 100 : 0.2);
      const gr = g.createRadialGradient(cx, focY, 2, cx, focY, 32);
      gr.addColorStop(0, `rgba(255,180,84,${0.55 * impact})`);
      gr.addColorStop(1, 'rgba(255,180,84,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, focY, 32, 0, Math.PI * 2); g.fill();

      /* Viên sỏi thận vỡ vụn khi đủ công suất */
      if (prog >= 0.85 && power >= 60) {
        g.fillStyle = '#ffb454';
        for (let i = 0; i < 7; i++) {
          const ox = Math.cos(i * 0.92) * 12 * prog, oy = Math.sin(i * 1.15) * 9 * prog;
          g.beginPath(); g.arc(cx + ox, focY + oy, 3, 0, Math.PI * 2); g.fill();
        }
      } else {
        const sr = 11 + (firing ? Math.sin(t * 22) * 1.4 : 0);
        g.fillStyle = '#ffb454';
        g.beginPath(); g.arc(cx, focY, sr, 0, Math.PI * 2); g.fill();
        /* Vết nứt dần xuất hiện trên viên sỏi khi đang bắn xung */
        if (prog > 0.35) {
          g.strokeStyle = '#040b12'; g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(cx - 5, focY - 4); g.lineTo(cx, focY + 1); g.lineTo(cx + 5, focY - 2);
          if (prog > 0.6) { g.moveTo(cx, focY + 1); g.lineTo(cx - 2, focY + 7); }
          g.stroke();
        }
      }

      g.fillStyle = '#dceef2'; g.font = 'bold 12.5px "JetBrains Mono", monospace';
      g.fillText(prog >= 0.85 && power >= 60 ? 'Tiêu điểm: Sỏi đã vỡ vụn' : 'Tiêu điểm: Viên sỏi thận', cx + 20, focY + 5);
    }
  });
})();

/* LAB 14 — Hàn vật liệu bằng siêu âm (Slide 31) */
(function () {
  const el = $('.lab[data-widget="weld"]'); if (!el) return;
  const cv = $('#wlCanvas'), fR = $('#wlF'), fOut = $('#wlFout'),
    tempEl = $('#wlTemp'), stateEl = $('#wlState'), fireBtn = $('#wlFire'), resetBtn = $('#wlReset');
  let fKhz = 28, state = 'idle', prog = 0;

  fR.addEventListener('input', () => {
    fKhz = +fR.value;
    fOut.textContent = fKhz + ' kHz';
  });
  fireBtn.onclick = () => {
    state = 'welding';
    prog = 0;
    stateEl.textContent = 'đang ép & rung siêu âm…';
  };
  resetBtn.onclick = () => {
    state = 'idle';
    prog = 0;
    tempEl.textContent = '25 °C';
    stateEl.textContent = 'chưa hàn';
  };

  lab(el, {
    tick(t, dt) {
      if (state === 'welding') {
        prog = Math.min(1, prog + dt * (0.36 + (fKhz - 20) * 0.008));
        if (prog >= 1) {
          state = 'fused';
          stateEl.textContent = 'đã hoàn thành mối hàn';
        } else if (prog > 0.78) {
          stateEl.textContent = 'làm nguội & kết khối…';
        }
      }

      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      grid(g, w, h, 26);

      const cx = w * 0.5;
      const matW = Math.min(w * 0.78, 380), matX = cx - matW / 2;
      const matH = Math.min(34, Math.max(24, h * 0.11));
      const anvilH = 26;
      const hornH = Math.min(82, Math.max(48, h * 0.24));
      const transH = 34;
      const travel = Math.max(16, Math.min(34, h * 0.11));
      const stackH = transH + hornH + travel + matH * 2 + anvilH;
      const anvilY = Math.min(h - 46, (h + stackH) * 0.5 - anvilH - 6);
      const yMat2 = anvilY - matH;
      const gap = state === 'idle' ? 4 : state === 'fused' ? 0 : Math.max(0, 4 * (1 - clamp(prog / 0.22, 0, 1)));
      const yMat1 = yMat2 - gap - matH;

      /* Nhiệt độ và mức độ nóng chảy tại mặt ghép */
      let heat = 0, fuse = 0, vib = 0, press = 0;
      if (state === 'welding') {
        press = prog < 0.2 ? prog / 0.2 : prog < 0.82 ? 1 : Math.max(0.25, 1 - (prog - 0.82) / 0.18 * 0.75);
        if (prog >= 0.2 && prog <= 0.78) {
          const u = (prog - 0.2) / 0.58;
          heat = Math.sin(u * Math.PI * 0.55);
          vib = Math.sin(t * (38 + fKhz * 1.4)) * 3.2;
          fuse = clamp((u - 0.15) / 0.75, 0, 1);
        } else if (prog > 0.78) {
          heat = Math.max(0.18, 1 - (prog - 0.78) / 0.22 * 0.82);
          fuse = 1;
        }
      } else if (state === 'fused') {
        press = 0.25;
        heat = 0.15;
        fuse = 1;
      }

      const tempC = Math.round(25 + heat * (175 + (fKhz - 20) * 2.2));
      tempEl.textContent = tempC + ' °C';

      /* Đế cố định */
      g.fillStyle = 'rgba(20, 38, 60, 0.92)';
      g.strokeStyle = 'rgba(148, 197, 255, 0.45)'; g.lineWidth = 1.4;
      rr(g, matX - 18, anvilY, matW + 36, anvilH, 5); g.fill(); g.stroke();
      g.fillStyle = '#b4ccd6'; g.font = '12px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText('Đế cố định (kẹp giữ chi tiết)', cx, anvilY + 16);

      /* Hai lớp vật liệu */
      g.fillStyle = 'rgba(148, 197, 255, 0.18)';
      g.strokeStyle = 'rgba(168, 190, 216, 0.55)'; g.lineWidth = 1.4;
      rr(g, matX, yMat2, matW, matH, 3); g.fill(); g.stroke();

      g.fillStyle = 'rgba(96, 165, 250, 0.24)';
      g.strokeStyle = 'rgba(96, 165, 250, 0.72)'; g.lineWidth = 1.4;
      rr(g, matX, yMat1, matW, matH, 3); g.fill(); g.stroke();

      g.textAlign = 'left';
      g.fillStyle = '#f0f6ff'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.fillText('Vật liệu 1', matX + 10, yMat1 + matH * 0.65);
      g.fillStyle = '#cbd5e1';
      g.fillText('Vật liệu 2', matX + 10, yMat2 + matH * 0.65);

      /* Vùng nóng chảy & mối hàn liền khối tại mặt tiếp xúc */
      const seamY = yMat2 - gap * 0.5;
      const weldW = Math.min(110, matW * 0.34);
      if (heat > 0.05) {
        const gr = g.createRadialGradient(cx, seamY, 2, cx, seamY, weldW * 0.65);
        gr.addColorStop(0, `rgba(255, 180, 84, ${(0.95 * heat).toFixed(2)})`);
        gr.addColorStop(0.55, `rgba(255, 111, 133, ${(0.55 * heat).toFixed(2)})`);
        gr.addColorStop(1, 'rgba(255, 111, 133, 0)');
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(cx, seamY, weldW * 0.7, 18, 0, 0, Math.PI * 2); g.fill();
      }
      if (fuse > 0.05) {
        g.fillStyle = state === 'fused' ? 'rgba(63, 227, 200, 0.78)' : `rgba(255, 180, 84, ${(0.45 + 0.5 * fuse).toFixed(2)})`;
        rr(g, cx - weldW * 0.5 * fuse, seamY - 4, weldW * fuse, 8, 4); g.fill();
      }
      if (Math.abs(vib) > 0.4) {
        /* Tia ma sát nhỏ dọc mặt ghép */
        g.fillStyle = '#ffe08a';
        for (let i = -3; i <= 3; i++) {
          const sx = cx + i * 14 + Math.sin(t * 40 + i) * 5;
          const sy = seamY + Math.cos(t * 50 + i * 2) * 3;
          g.beginPath(); g.arc(sx, sy, 2.2, 0, Math.PI * 2); g.fill();
        }
      }

      /* Bộ biến đổi áp điện & đầu hàn (hạ xuống theo press + rung theo vib) */
      const hornBot = yMat1 - (1 - press) * travel + vib;
      const hornTop = hornBot - hornH;
      const transTop = hornTop - transH;
      const transW = Math.min(240, w * 0.62);

      /* Vỏ đầu phát áp điện */
      g.fillStyle = 'rgba(63, 227, 200, 0.2)';
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 1.6;
      rr(g, cx - transW / 2, transTop, transW, transH, 6); g.fill(); g.stroke();
      g.fillStyle = '#3fe3c8'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText(`Đầu phát áp điện (${fKhz} kHz)`, cx, transTop + 21);

      /* Đầu hàn hình thang */
      g.fillStyle = 'rgba(24, 44, 76, 0.92)';
      g.strokeStyle = '#60a5fa'; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(cx - 56, hornTop); g.lineTo(cx + 56, hornTop);
      g.lineTo(cx + 38, hornBot); g.lineTo(cx - 38, hornBot);
      g.closePath(); g.fill(); g.stroke();

      /* Sóng siêu âm lan dọc trong đầu hàn khi đang rung (vẽ trước nhãn) */
      if (Math.abs(vib) > 0.4) {
        g.strokeStyle = 'rgba(63, 227, 200, 0.72)'; g.lineWidth = 1.6;
        for (let k = 0; k < 3; k++) {
          const wy = hornTop + (((t * 2.8 + k * 0.33) % 1) * hornH);
          g.beginPath(); g.moveTo(cx - 28, wy); g.lineTo(cx + 28, wy); g.stroke();
        }
        g.fillStyle = '#ffb454'; g.font = 'bold 12px "JetBrains Mono", monospace';
        g.fillText('↕ Ma sát siêu âm', cx + 108, hornTop + hornH * 0.55);
      }

      /* Nhãn Đầu hàn có nền tối nhẹ để không bị tia sóng đè chữ */
      g.fillStyle = 'rgba(10, 22, 38, 0.78)';
      rr(g, cx - 34, hornTop + hornH * 0.55 - 12, 68, 17, 4); g.fill();
      g.fillStyle = '#f0f6ff'; g.font = 'bold 12px "JetBrains Mono", monospace';
      g.fillText('Đầu hàn', cx, hornTop + hornH * 0.55);

      /* Nhãn trạng thái dưới đế */
      g.fillStyle = state === 'fused' ? '#3fe3c8' : '#ffb454';
      g.font = 'bold 12px "JetBrains Mono", monospace';
      g.fillText(state === 'fused'
        ? 'Mối hàn liền khối — không cần keo hay que hàn'
        : state === 'welding'
          ? 'Sóng siêu âm làm nóng chảy cục bộ mặt tiếp xúc'
          : 'Nhấn "Ép & hàn" để quan sát ma sát siêu âm', cx, h - 6);
      g.textAlign = 'left';
    }
  });
})();

/* LAB 15 — Nghiên cứu biển & đại dương: Tàu quét Sonar đa tia (Slide 34) */
(function () {
  const el = $('.lab[data-widget="ocean"]'); if (!el) return;
  const cv = $('#ocCanvas'), spdR = $('#ocSpd'), spdOut = $('#ocSpdOut'),
    depthEl = $('#ocDepth'), zoneEl = $('#ocZone'), toggleBtn = $('#ocToggle'), restartBtn = $('#ocRestart');
  let scanU = 0.08, running = true, spd = 1;

  spdR.addEventListener('input', () => {
    spd = +spdR.value / 100;
    spdOut.textContent = fmt(spd, 1) + '×';
  });
  toggleBtn.onclick = () => {
    if (scanU >= 0.97) scanU = 0.04;
    running = !running;
    toggleBtn.textContent = running ? '⏸ Tạm dừng' : '▶ Tiếp tục quét';
  };
  restartBtn.onclick = () => {
    scanU = 0.04;
    running = true;
    toggleBtn.textContent = '⏸ Tạm dừng';
  };

  /* Hàm địa hình đáy đại dương (mét, 0 → 4000 m) */
  function depthAt(u) {
    let d = 2350;
    /* Thềm lục địa bên trái */
    if (u < 0.24) {
      d = 460 + Math.sin(u * 25) * 40 + u * 480;
    } else if (u < 0.36) {
      const k = (u - 0.24) / 0.12;
      const dStart = 460 + Math.sin(0.24 * 25) * 40 + 0.24 * 480;
      const dEnd = 2500 + Math.sin(0.36 * 14) * 110;
      d = dStart + k * k * (3 - 2 * k) * (dEnd - dStart);
    } else {
      d = 2500 + Math.sin(u * 14) * 110;
    }
    /* Rãnh sâu đại dương quanh u = 0.48 */
    d += 1380 * Math.exp(-Math.pow((u - 0.48) / 0.085, 2));
    /* Núi ngầm nhô cao quanh u = 0.72 */
    d -= 1650 * Math.exp(-Math.pow((u - 0.72) / 0.07, 2));
    return clamp(d, 350, 3920);
  }

  function zoneName(u, d) {
    if (u < 0.24) return 'Thềm lục địa';
    if (Math.abs(u - 0.48) < 0.09) return 'Rãnh sâu đại dương';
    if (Math.abs(u - 0.72) < 0.08) return 'Núi ngầm dưới biển';
    if (Math.abs(u - 0.89) < 0.05) return 'Phát hiện xác tàu đắm';
    return d > 2000 ? 'Đồng bằng đáy sâu' : 'Sườn lục địa';
  }

  lab(el, {
    tick(t, dt) {
      if (running) {
        scanU += dt * 0.11 * spd;
        if (scanU >= 0.98) {
          scanU = 0.98;
          running = false;
          toggleBtn.textContent = '▶ Quét lại';
        }
      }
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);

      const sky = 40, seaH = h - sky - 12;
      const yOfD = dm => sky + (dm / 4200) * seaH;
      const padL = 12, padR = 56, mapW = w - padL - padR;
      const xOfU = u => padL + u * mapW;

      /* Bầu trời & nước đại dương */
      const wg = g.createLinearGradient(0, sky, 0, h);
      wg.addColorStop(0, '#0c4159');
      wg.addColorStop(0.55, '#072438');
      wg.addColorStop(1, '#03111c');
      g.fillStyle = wg; g.fillRect(0, sky, w, h - sky);

      /* Sóng mặt biển */
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = sky + Math.sin(x * 0.05 + t * 2.5) * 2.2;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();

      const shipX = xOfU(scanU);
      const curD = depthAt(scanU);
      const tSec = (2 * curD) / 1500;
      depthEl.textContent = fmt(Math.round(curD / 10) * 10, 0) + ' m (' + fmt(tSec, 2) + ' s)';
      zoneEl.textContent = zoneName(scanU, curD);

      /* Chùm sóng đa tia: mặt sóng phát xuống (xanh ngọc) + sóng phản xạ dội ngược lên (vàng cam) */
      const rayOffsets = [-0.075, -0.038, 0, 0.038, 0.075];
      const fanPts = rayOffsets.map(du => {
        const u = clamp(scanU + du, 0, 1);
        return [xOfU(u), yOfD(depthAt(u))];
      });
      const fg = g.createLinearGradient(0, sky, 0, h);
      fg.addColorStop(0, 'rgba(63,227,200,0.28)');
      fg.addColorStop(1, 'rgba(63,227,200,0.04)');
      g.fillStyle = fg;
      g.beginPath();
      g.moveTo(shipX, sky + 4);
      fanPts.forEach(([rx, ry]) => g.lineTo(rx, ry));
      g.closePath(); g.fill();

      const shipY = sky + 4;
      const aLeft = Math.atan2(fanPts[0][1] - shipY, fanPts[0][0] - shipX);
      const aRight = Math.atan2(fanPts[4][1] - shipY, fanPts[4][0] - shipX);
      const aMin = Math.min(aLeft, aRight), aMax = Math.max(aLeft, aRight);
      const midDist = Math.hypot(fanPts[2][0] - shipX, fanPts[2][1] - shipY);

      /* Cung mặt sóng phát đi xuống từ đáy tàu */
      const waveCycle = (t * 0.85) % 1;
      for (let wIdx = 0; wIdx < 2; wIdx++) {
        const wp = (waveCycle + wIdx * 0.5) % 1;
        if (wp < 0.52) {
          const rDown = (wp / 0.52) * midDist;
          if (rDown > 8) {
            g.beginPath();
            g.arc(shipX, shipY, rDown, aMin, aMax);
            g.strokeStyle = `rgba(63,227,200,${(0.75 * (1 - wp * 0.6)).toFixed(2)})`;
            g.lineWidth = 2;
            g.stroke();
          }
        } else {
          /* Cung mặt sóng phản xạ dội ngược từ đáy biển quay về tàu */
          const ep = (wp - 0.52) / 0.48;
          const [mx, my] = fanPts[2];
          const rBack = ep * midDist;
          const angUp = Math.atan2(shipY - my, shipX - mx);
          if (rBack > 6) {
            g.beginPath();
            g.arc(mx, my, rBack, angUp - 0.36, angUp + 0.36);
            g.strokeStyle = `rgba(255,180,84,${(0.88 * (1 - ep * 0.35)).toFixed(2)})`;
            g.lineWidth = 2.1;
            g.stroke();
          }
        }
      }

      /* 5 tia dẫn + xung đi xuống (xanh ngọc) đập đáy biển rồi bật ngược lên tàu (vàng cam) */
      fanPts.forEach(([rx, ry], idx) => {
        g.strokeStyle = idx === 2 ? 'rgba(255,180,84,0.52)' : 'rgba(63,227,200,0.34)';
        g.lineWidth = idx === 2 ? 1.4 : 1;
        g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(shipX, shipY); g.lineTo(rx, ry); g.stroke();
        g.setLineDash([]);

        const ph = (t * 0.85 + idx * 0.06) % 1;
        if (ph < 0.5) {
          /* Lượt đi: từ tàu xuống đáy biển */
          const k = ph / 0.5;
          const px = shipX + (rx - shipX) * k;
          const py = shipY + (ry - shipY) * k;
          g.fillStyle = '#3fe3c8';
          g.beginPath(); g.arc(px, py, 3, 0, Math.PI * 2); g.fill();
        } else {
          /* Điểm đập đáy biển loé sáng khi vừa chạm đáy */
          const ep = (ph - 0.5) / 0.5;
          if (ep < 0.35) {
            const rRing = 3 + ep * 28;
            g.strokeStyle = `rgba(255,180,84,${(0.85 * (1 - ep / 0.35)).toFixed(2)})`;
            g.lineWidth = 1.6;
            g.beginPath(); g.arc(rx, ry, rRing, Math.PI, Math.PI * 2); g.stroke();
          }
          /* Lượt về (echo): dội ngược từ đáy biển quay lên đầu thu ở tàu */
          const kBack = 1 - ep;
          const px = shipX + (rx - shipX) * kBack;
          const py = shipY + (ry - shipY) * kBack;
          const tailK = Math.min(1, kBack + 0.11);
          const tx = shipX + (rx - shipX) * tailK;
          const ty = shipY + (ry - shipY) * tailK;
          g.strokeStyle = 'rgba(255,180,84,0.75)';
          g.lineWidth = 2;
          g.beginPath(); g.moveTo(tx, ty); g.lineTo(px, py); g.stroke();
          g.fillStyle = '#ffb454';
          g.beginPath(); g.arc(px, py, 3.2, 0, Math.PI * 2); g.fill();
        }
      });

      /* Phần địa hình ĐÃ QUÉT (sáng rõ + đường đồng mức sonar màu ngọc) */
      const maxRevealU = Math.min(1, scanU + 0.04);
      const steps = 90;
      g.beginPath();
      g.moveTo(xOfU(0), h);
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * maxRevealU;
        g.lineTo(xOfU(u), yOfD(depthAt(u)));
      }
      g.lineTo(xOfU(maxRevealU), h);
      g.closePath();
      const sg = g.createLinearGradient(0, sky + seaH * 0.15, 0, h);
      sg.addColorStop(0, 'rgba(138, 102, 68, 0.92)');
      sg.addColorStop(1, 'rgba(48, 34, 24, 0.96)');
      g.fillStyle = sg; g.fill();

      /* Viền bản đồ địa hình dựng bằng Sonar */
      g.strokeStyle = '#3fe3c8'; g.lineWidth = 2.2;
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * maxRevealU;
        const xx = xOfU(u), yy = yOfD(depthAt(u));
        i === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
      }
      g.stroke();

      /* Xác tàu đắm ở u = 0.89 (hiện khi quét tới) */
      if (maxRevealU >= 0.87) {
        const wx = xOfU(0.89), wy = yOfD(depthAt(0.89));
        g.save();
        g.translate(wx, wy - 4); g.rotate(-0.14);
        g.fillStyle = '#ffb454';
        g.beginPath(); g.moveTo(-14, 2); g.lineTo(14, 2); g.lineTo(10, -5); g.lineTo(-10, -5); g.closePath(); g.fill();
        g.fillRect(-4, -10, 6, 5);
        g.restore();
        g.fillStyle = '#ffb454'; g.font = 'bold 11.5px "JetBrains Mono", monospace';
        g.textAlign = 'center';
        g.fillText('Xác tàu', wx, wy - 18);
      }

      /* Nhãn địa hình khi đã quét qua */
      g.font = 'bold 11.5px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      if (maxRevealU > 0.16) {
        g.fillStyle = '#f0d9be';
        g.fillText('Thềm lục địa', xOfU(0.12), yOfD(depthAt(0.12)) + 18);
      }
      if (maxRevealU > 0.50) {
        g.fillStyle = '#ffb454';
        g.fillText('Rãnh sâu (3850 m)', xOfU(0.48), Math.min(h - 6, yOfD(3850) + 14));
      }
      if (maxRevealU > 0.74) {
        g.fillStyle = '#3fe3c8';
        g.fillText('Núi ngầm (920 m)', xOfU(0.72), yOfD(depthAt(0.72)) - 10);
      }

      /* Tàu nghiên cứu di chuyển trên mặt biển */
      g.fillStyle = '#f0f6ff';
      g.beginPath();
      g.moveTo(shipX - 24, sky + 1); g.lineTo(shipX + 24, sky + 1);
      g.lineTo(shipX + 18, sky - 9); g.lineTo(shipX - 18, sky - 9);
      g.closePath(); g.fill();
      g.fillStyle = '#60a5fa';
      rr(g, shipX - 10, sky - 18, 18, 9, 2); g.fill();
      g.fillStyle = '#dceef2'; g.font = 'bold 11.5px "JetBrains Mono", monospace';
      g.fillText('Tàu nghiên cứu', clamp(shipX, 62, w - 95), sky - 22);

      /* Thang đo độ sâu bên phải */
      g.textAlign = 'right'; g.fillStyle = '#b4ccd6'; g.font = '11.5px "JetBrains Mono", monospace';
      for (let dm = 1000; dm <= 4000; dm += 1000) {
        const y = yOfD(dm);
        g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(w - 52, y); g.lineTo(w - 46, y); g.stroke();
        g.fillText((dm / 1000) + ' km', w - 6, y + 4);
      }

      /* Chú thích phân biệt sóng phát xuống & sóng dội lên (góc dưới trái) */
      g.fillStyle = 'rgba(4,11,20,0.82)';
      rr(g, 10, h - 26, 260, 20, 6); g.fill();
      g.font = 'bold 11px "JetBrains Mono", monospace';
      g.textAlign = 'left';
      g.fillStyle = '#3fe3c8';
      g.fillText('● Sóng phát xuống', 18, h - 12);
      g.fillStyle = '#ffb454';
      g.fillText('● Sóng phản xạ', 150, h - 12);
    }
  });
})();
