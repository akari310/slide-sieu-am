import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function keepInline(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<(?!\/?(b|strong|sub|sup)\b)[^>]+>/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function extractQuizItems(quizSrc) {
  const m = quizSrc.match(/const QS = (\[[\s\S]*?\n  \]);/);
  if (!m) return [];
  const items = vm.runInNewContext(m[1]);
  return items.map((q, idx) => {
    const ans = q.o[q.a] || '';
    const letter = 'ABCD'[q.a] || '';
    return `<b>Câu ${idx + 1} (${letter}):</b> ${ans} — ${q.why}`;
  });
}

function buildSpeakerData(slidesHtml, quizSrc) {
  const quizAnswers = extractQuizItems(quizSrc);
  const re = /<section class="slide[^"]*"([^>]*)>([\s\S]*?)<\/section>/g;
  const out = [];
  let m, idx = 0;
  while ((m = re.exec(slidesHtml)) !== null) {
    idx++;
    const attrs = m[1], body = m[2];
    const sec = stripTags((attrs.match(/data-sec="([^"]*)"/) || [])[1] || '');
    const title = stripTags((attrs.match(/data-title="([^"]*)"/) || [])[1] || '');
    const min = (attrs.match(/data-min="([^"]*)"/) || [])[1] || '';
    const note = stripTags((attrs.match(/data-note="([^"]*)"/) || [])[1] || '');
    const kicker = stripTags((body.match(/<span class="kicker">([\s\S]*?)<\/span>/) || [])[1] || '');
    const heading = stripTags((body.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/) || [])[1] || '');

    const formulas = [...body.matchAll(/<div class="formula"[^>]*>([\s\S]*?)<\/div>/g)]
      .map(x => keepInline(x[1].replace(/<small[^>]*>[\s\S]*?<\/small>/gi, ' ')).trim())
      .filter(Boolean);

    /* Lấy danh sách ý chính (bỏ qua phần reveal-ans để đưa vào mục Đáp án riêng) */
    const bodyNoReveal = body.replace(/<(p|ul)[^>]*class="[^"]*\breveal-ans\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '');
    const bullets = [];
    for (const lm of bodyNoReveal.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) {
      const t = keepInline(lm[1]);
      if (t && !bullets.includes(t)) bullets.push(t);
    }
    if (!bullets.length) {
      for (const cm of bodyNoReveal.matchAll(/<div class="card[^"]*"[^>]*>([\s\S]*?)<\/div>/g)) {
        const pm = cm[1].match(/<p[^>]*>([\s\S]*?)<\/p>/);
        const nm = cm[1].match(/<(?:h3|span class="n")[^>]*>([\s\S]*?)<\/(?:h3|span)>/);
        if (pm) {
          const prefix = nm ? `<b>${stripTags(nm[1])}:</b> ` : '';
          bullets.push(prefix + keepInline(pm[1]));
        }
      }
    }

    /* Đáp án cho Checkpoint, Poll, Reveal hoặc Quiz 15 câu */
    const answers = [];
    let ansLabel = 'Đáp án & giải thích';
    const cpQ = body.match(/<div class="checkpoint-q">([\s\S]*?)<\/div>/);
    const cpOk = body.match(/<button data-ok="1">([\s\S]*?)<\/button>/);
    const cpFb = body.match(/<div class="checkpoint-fb">([\s\S]*?)<\/div>/);
    if (cpQ && cpOk) {
      bullets.unshift('<b>Câu hỏi:</b> ' + keepInline(cpQ[1]));
      answers.push(`<b>Đáp án đúng:</b> ${stripTags(cpOk[1])}`);
      if (cpFb) answers.push(keepInline(cpFb[1]));
    }
    for (const pm of body.matchAll(/<button data-ok="1"><span class="l">([^<]+)<\/span><span class="v">([^<]+)<\/span><span class="r">([\s\S]*?)<\/span><\/button>/g)) {
      answers.push(`<b>${stripTags(pm[1])} (${stripTags(pm[2])}):</b> ${keepInline(pm[3])}`);
    }
    for (const rm of body.matchAll(/<(p|ul)[^>]*id="([^"]+)"[^>]*hidden[^>]*>([\s\S]*?)<\/\1>/g)) {
      if (rm[1] === 'ul') {
        for (const li of rm[3].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) answers.push(keepInline(li[1]));
      } else {
        answers.push(keepInline(rm[3]));
      }
    }
    if (body.includes('data-widget="quiz"')) {
      ansLabel = 'Đáp án nhanh 15 câu trắc nghiệm';
      answers.push(...quizAnswers);
    }

    out.push({ idx, sec, title, min, kicker, heading, note, formulas, bullets: bullets.slice(0, 6), answers, ansLabel });
  }
  return out;
}

function readDirConcat(subdir, ext) {
  const dir = path.join(__dirname, subdir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort();
  return files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n\n');
}

function assetDataUrl(file, mime) {
  const b64 = fs.readFileSync(path.join(__dirname, 'assets', file)).toString('base64');
  return `data:${mime};base64,${b64}`;
}

const ASSETS = {
  __FETAL_DATA_URL__: assetDataUrl('fetal.webp', 'image/webp'),
  __FETAL4D_DATA_URL__: assetDataUrl('fetal4d.webm', 'video/webm'),
  __SPALLANZANI_URL__: assetDataUrl('spallanzani.webp', 'image/webp'),
  __CURIE_URL__: assetDataUrl('curie.jpg', 'image/jpeg'),
  __LANGEVIN_URL__: assetDataUrl('langevin.jpg', 'image/jpeg'),
  __BAT_URL__: assetDataUrl('bat.jpg', 'image/jpeg'),
  __TINYLEV_URL__: assetDataUrl('tinylev.jpg', 'image/jpeg'),
  __PROBE_REAL_URL__: assetDataUrl('probe_real.jpg', 'image/jpeg'),
  __CLEANER_URL__: assetDataUrl('cleaner.jpg', 'image/jpeg'),
  __DOPPLER_REAL_URL__: assetDataUrl('doppler_real.jpg', 'image/jpeg'),
  __IAN_DONALD_URL__: assetDataUrl('ian_donald.png', 'image/png')
};

function injectAssets(text) {
  let res = text;
  for (const [token, val] of Object.entries(ASSETS)) {
    res = res.replaceAll(token, () => val);
  }
  return res;
}

const css = [
  fs.readFileSync(path.join(__dirname, 'styles/tokens.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'styles/layout.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'styles/labs.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'styles/speaker.css'), 'utf8')
].join('\n\n');

const rawSlides = readDirConcat('slides', '.html');
const quizSrc = fs.readFileSync(path.join(__dirname, 'scripts/quiz.js'), 'utf8');
const speakerDataJson = JSON.stringify(buildSpeakerData(rawSlides, quizSrc)).replace(/<\/script/gi, '<\\/script');
const speakerScriptSrc = fs.readFileSync(path.join(__dirname, 'scripts/speaker.js'), 'utf8');
const speakerCss = [
  fs.readFileSync(path.join(__dirname, 'styles/tokens.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'styles/speaker.css'), 'utf8')
].join('\n\n');

const slides = injectAssets(rawSlides);

const scripts = injectAssets([
  `window.__SPEAKER_DATA__ = ${speakerDataJson};`,
  speakerScriptSrc,
  fs.readFileSync(path.join(__dirname, 'scripts/core.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'scripts/labs-part1.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'scripts/labs-part2.js'), 'utf8'),
  quizSrc
].join('\n\n'));

const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const out = tpl
  .replace('/* {{STYLES}} */', () => css)
  .replace('<!-- {{SLIDES}} -->', () => slides)
  .replace('/* {{SCRIPTS}} */', () => scripts);

const outName = fs.existsSync(path.join(rootDir, '_headers')) ? 'index.html' : 'slide-sieu-am.html';
const outPath = path.join(rootDir, outName);
fs.writeFileSync(outPath, out, 'utf8');
console.log(`Built ${outPath} (${(Buffer.byteLength(out, 'utf8') / 1024).toFixed(1)} KB)`);

const spkTpl = fs.readFileSync(path.join(__dirname, 'speaker-template.html'), 'utf8');
const spkOut = spkTpl
  .replace('/* {{SPEAKER_STYLES}} */', () => speakerCss)
  .replace('/* {{SPEAKER_DATA}} */ []', () => speakerDataJson)
  .replace('/* {{SPEAKER_SCRIPT}} */', () => speakerScriptSrc);
const spkPath = path.join(rootDir, 'speaker.html');
fs.writeFileSync(spkPath, spkOut, 'utf8');
console.log(`Built ${spkPath} (${(Buffer.byteLength(spkOut, 'utf8') / 1024).toFixed(1)} KB)`);

/* ============================================================
   BUILD STANDALONE SIMULATION SUBPAGES (/sim/*.html)
   ============================================================ */
function extractLabWidget(htmlSrc, widgetId) {
  const marker = `<div class="lab" data-widget="${widgetId}"`;
  const start = htmlSrc.indexOf(marker);
  if (start < 0) throw new Error(`Widget "${widgetId}" not found in slides HTML`);
  let pos = start;
  let depth = 0;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let m;
  while ((m = tagRe.exec(htmlSrc)) !== null) {
    if (m[0].startsWith('</')) depth--;
    else depth++;
    if (depth === 0) {
      return htmlSrc.slice(start, tagRe.lastIndex);
    }
  }
  throw new Error(`Unclosed <div> for widget "${widgetId}"`);
}

const SIM_SPECS = [
  {
    id: 'freq',
    slide: 'Slide 05',
    kicker: 'Phần I · Phân loại sóng âm (tr. 39 SGK)',
    title: 'Thí nghiệm 1: Nghe thử thang tần số Hạ âm – Âm thanh – Siêu âm',
    formula: '16 Hz ≤ f_nghe ≤ 20 kHz < f_siêu âm',
    notes: [
      { type: 'teal', title: 'Quan sát trực quan', body: 'Kéo thanh trượt qua mốc <b>20 kHz</b> hoặc bấm vào từng loài vật để nghe thử bằng loa thật (Web Audio API).' },
      { type: 'accent', title: 'Điểm chốt SGK', body: 'Tai người chỉ nghe được từ <b>16 Hz đến 20 kHz</b>. Siêu âm có <b>f &gt; 20 kHz</b>; y học dùng dải <b>1–15 MHz</b>.' }
    ]
  },
  {
    id: 'lambda',
    slide: 'Slide 08',
    kicker: 'Phần I · Bước sóng & độ phân giải (tr. 39 SGK)',
    title: 'Thí nghiệm 2: Bước sóng λ theo tần số và môi trường',
    formula: 'λ = v / f',
    notes: [
      { type: 'teal', title: 'Bài toán trang 39 SGK', body: 'Bấm nút <b>"↺ Nạp Bài toán 1 (thạch anh)"</b> để kiểm chứng: v = 5 700 m/s, f = 2 MHz → <b>λ = 2,85 mm</b>.' },
      { type: 'accent', title: 'Độ phân giải ảnh', body: 'Tăng tần số từ 1 MHz lên 10 MHz trong mô mềm để thấy bước sóng thu nhỏ, phân biệt được chi tiết nhỏ hơn.' }
    ]
  },
  {
    id: 'piezo',
    slide: 'Slide 11',
    kicker: 'Phần II · Cách tạo ra siêu âm (Hình 7.1 SGK)',
    title: 'Thí nghiệm 3: Hiệu ứng áp điện trên tấm gốm PZT',
    formula: 'f_sóng = f_điện áp',
    notes: [
      { type: 'teal', title: 'Đối chiếu 4 hình a–b–c–d', body: 'Thử lần lượt <b>Không điện → Một chiều (+) → Đảo cực (−) → Xoay chiều ~</b> để thấy bản gốm co, dãn và phát sóng siêu âm đồng bộ 1:1 với U(t).' }
    ]
  },
  {
    id: 'reflect',
    slide: 'Slide 16',
    kicker: 'Phần III · Nguyên lí máy siêu âm (Hình 7.3 SGK)',
    title: 'Thí nghiệm 4: Phản xạ và khúc xạ sóng siêu âm tại mặt phân cách',
    formula: "i' = i · sin i / v₁ = sin r / v₂",
    notes: [
      { type: 'teal', title: 'Phản xạ & Khúc xạ', body: 'Kéo <b>Góc tới i</b> và chuyển đổi cặp môi trường để quan sát tia phản xạ, tia khúc xạ và hiện tượng <b>phản xạ toàn phần</b>.' },
      { type: 'amber', title: 'Đặt đầu dò vuông góc', body: 'Nhấn <b>"↺ Về 0° (vuông góc)"</b> để thấy vì sao bác sĩ áp đầu dò vuông góc mặt da giúp sóng dội ngược về đầu thu tốt nhất.' }
    ]
  },
  {
    id: 'pulseecho',
    slide: 'Slide 17',
    kicker: 'Phần III · Định vị bằng tiếng vọng (tr. 40 SGK)',
    title: 'Thí nghiệm 5: Phát xung và thu tiếng dội đo độ sâu d',
    formula: 'd = v · Δt / 2',
    notes: [
      { type: 'teal', title: 'Đo thời gian trễ Δt', body: 'Thay đổi độ sâu <b>d</b> của mặt phản xạ và nhấn <b>"▶ Phát xung"</b> để quan sát xung đi – xung về trên dao động kí.' },
      { type: 'accent', title: 'Vì sao phải chia 2?', body: 'Sóng siêu âm đi từ đầu dò tới mặt mô rồi phản xạ quay ngược lại (tổng quãng đường <b>2d</b>).' }
    ]
  },
  {
    id: 'gel',
    slide: 'Slide 18',
    kicker: 'Phần III · Vai trò lớp gel (tr. 40 SGK)',
    title: 'Thí nghiệm 6: Tác dụng lớp gel đẩy khe khí 99,95%',
    formula: 'R = [(Z₂ − Z₁) / (Z₂ + Z₁)]²',
    notes: [
      { type: 'amber', title: 'Không có gel (100% khí)', body: 'Tới <b>99,95%</b> năng lượng sóng siêu âm bị phản xạ ngay tại khe không khí mỏng → màn hình tối đen, không tạo ảnh.' },
      { type: 'teal', title: 'Bôi gel kín bề mặt', body: 'Gel có trở kháng gần bằng da giúp đẩy hết không khí, đưa hơn <b>99,8%</b> năng lượng sóng truyền sâu vào cơ thể.' }
    ]
  },
  {
    id: 'absorb',
    slide: 'Slide 19',
    kicker: 'Phần III · Em có biết? (tr. 41 SGK)',
    title: 'Thí nghiệm 7: Quy luật suy giảm cường độ I = I₀·e⁻ᵅᵈ & chọn đầu dò',
    formula: 'I = I₀ · e^(−αd)',
    notes: [
      { type: 'teal', title: 'So sánh 2 MHz vs 10 MHz', body: 'Tăng tần số lên <b>10–15 MHz</b> để thấy chùm tia bị mô hấp thụ tắt rất nhanh ở lớp nông; hạ về <b>2 MHz</b> để sóng xuyên sâu xuống bụng/thai.' }
    ]
  },
  {
    id: 'ascan',
    slide: 'Slide 23',
    kicker: 'Phần IV · Siêu âm kiểu A (Hình 7.5 SGK)',
    title: 'Thí nghiệm 8: Siêu âm kiểu A & đo bề dày lớp cơ',
    formula: 'd_cơ = v · Δt(B→C) / 2',
    notes: [
      { type: 'teal', title: 'Xung phản xạ theo độ sâu', body: 'Kéo ranh giới <b>B (mỡ–cơ)</b> và bấm <b>"▶ Phát xung"</b> để đo khoảng thời gian <b>Δt(B→C)</b> giữa hai đỉnh xung và tính trực tiếp bề dày lớp cơ.' }
    ]
  },
  {
    id: 'defect',
    slide: 'Slide 28',
    kicker: 'Phần V · Ứng dụng công nghiệp (Hình 7.7 SGK)',
    title: 'Thí nghiệm 9: Kiểm tra khuyết tật kim loại không phá huỷ (NDT)',
    formula: 'd_lỗi = v · Δt_sớm / 2',
    notes: [
      { type: 'teal', title: 'Mẫu chuẩn vs Có lỗ hổng', body: 'Chuyển giữa hai mẫu và bấm <b>"▶ Phát xung"</b>: mẫu chuẩn chỉ có <b>1 xung đáy</b>; mẫu có bọt khí/vết nứt xuất hiện thêm <b>xung khuyết tật sớm</b> phía trước.' }
    ]
  },
  {
    id: 'weld',
    slide: 'Slide 28',
    kicker: 'Phần V · Ứng dụng công nghiệp (Hình 7.8 SGK)',
    title: 'Thí nghiệm 10: Hàn vật liệu bằng dao động siêu âm',
    formula: 'f = 20 – 40 kHz',
    notes: [
      { type: 'amber', title: 'Không cần keo hay que hàn', body: 'Nhấn <b>"▶ Ép & hàn"</b> để xem đầu phát 20–40 kHz rung ma sát làm nóng chảy cục bộ tại mặt tiếp xúc, gắn liền hai lớp vật liệu.' },
      { type: 'accent', title: 'Mô phỏng ⇄ Video thực tế', body: 'Bấm nút <b>"🎬 Video EWI"</b> ở góc phải khung để chuyển sang video hàn siêu âm thực tế (tự động bật phụ đề tiếng Việt CC).' }
    ]
  },
  {
    id: 'hifu',
    slide: 'Slide 28',
    kicker: 'Phần V · Ứng dụng y học (Hình 7.9 SGK)',
    title: 'Thí nghiệm 11: Tán sỏi ngoài cơ thể ESWL hội tụ chùm sóng',
    formula: 'Da 37,0 °C · Vỡ sỏi tại tiêu điểm',
    notes: [
      { type: 'teal', title: 'Hội tụ năng lượng an toàn', body: 'Nhấn <b>"▶ Phát xung tán sỏi"</b>: chùm sóng hội tụ đi qua lớp da an toàn ở 37 °C nhưng tập trung áp suất làm vỡ sỏi thận thành mảnh vụn nhỏ.' },
      { type: 'accent', title: 'Mô phỏng ⇄ Video 3D', body: 'Bấm nút <b>"🎬 Video chi tiết"</b> ở góc phải khung để xem video 3D tán sỏi ngoài cơ thể (tự động bật phụ đề tiếng Việt CC).' }
    ]
  },
  {
    id: 'levitate',
    slide: 'Slide 29',
    kicker: 'Phần V · Khoa học vật liệu & Sóng dừng',
    title: 'Thí nghiệm 12: Bẫy sóng dừng siêu âm nâng vật lơ lửng',
    formula: 'Khoảng cách nút = λ / 2',
    notes: [
      { type: 'teal', title: 'Mô phỏng sóng dừng', body: 'Kéo thanh <b>Tần số phát (28–60 kHz)</b> để thấy khoảng cách nút <b>λ/2</b> thay đổi, hoặc bấm <b>"⏸ Tắt sóng"</b> để thấy vật rơi tự do.' },
      { type: 'accent', title: 'Mô phỏng ⇄ Video Harvard', body: 'Bấm nút <b>"🎬 Video Harvard"</b> ở góc phải khung để xem thí nghiệm nâng giọt nước thực tế (tự động bật phụ đề tiếng Việt CC).' }
    ]
  },
  {
    id: 'doppler',
    slide: 'Slide 25',
    kicker: 'Phần IV · Siêu âm Doppler màu (tr. 42 SGK)',
    title: 'Thí nghiệm 13: Đo tốc độ dòng máu bằng hiệu ứng Doppler',
    formula: 'Δf = 2·f₀·v·cosθ / c',
    notes: [
      { type: 'teal', title: 'Mô phỏng ⇄ Ảnh thực tế', body: 'Kéo tốc độ dòng máu <b>v</b> để xem độ dịch tần số Δf thay đổi, hoặc chuyển sang <b>"📷 Ảnh Doppler thực tế"</b> ngay trong khung.' }
    ]
  }
];

function renderNotesHtml(notes) {
  const cards = notes.map(n => {
    const cls = n.type === 'teal' ? 'card card-teal' : n.type === 'amber' ? 'card card-amber' : 'card card-accent';
    return `<div class="${cls}"><h3>${n.title}</h3><p style="margin-top:.4em">${n.body}</p></div>`;
  }).join('\n');
  return `<aside class="sim-notes">\n${cards}\n</aside>`;
}

const simDir = path.join(rootDir, 'sim');
fs.mkdirSync(simDir, { recursive: true });
const simTpl = fs.readFileSync(path.join(__dirname, 'sim-template.html'), 'utf8');
const simStyles = [
  fs.readFileSync(path.join(__dirname, 'styles/tokens.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'styles/layout.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'styles/labs.css'), 'utf8')
].join('\n\n');
const simScripts = injectAssets([
  fs.readFileSync(path.join(__dirname, 'scripts/labs-part1.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'scripts/labs-part2.js'), 'utf8')
].join('\n\n'));

for (const spec of SIM_SPECS) {
  const labHtml = injectAssets(extractLabWidget(rawSlides, spec.id));
  const fPill = spec.formula ? `<span class="sim-pill">${spec.formula}</span>` : '';
  const html = simTpl
    .replaceAll('{{TITLE}}', () => spec.title)
    .replaceAll('{{KICKER}}', () => `${spec.slide} · ${spec.kicker}`)
    .replace('{{FORMULA_PILL}}', () => fPill)
    .replace('{{LAYOUT_CLASS}}', () => '')
    .replace('/* {{SIM_STYLES}} */', () => simStyles)
    .replace('<!-- {{LAB_HTML}} -->', () => labHtml)
    .replace('<!-- {{NOTES_HTML}} -->', () => renderNotesHtml(spec.notes))
    .replace('/* {{SIM_SCRIPTS}} */', () => simScripts);
  fs.writeFileSync(path.join(simDir, `${spec.id}.html`), html, 'utf8');
}

const hubCards = SIM_SPECS.map((s, i) =>
  `<a href="${s.id}.html" class="card card-accent" style="text-decoration:none;display:flex;flex-direction:column;gap:.45rem">
    <span class="pill pill-aqua" style="align-self:flex-start">${s.slide} · TN ${pad2Str(i + 1)}</span>
    <h3>${s.title.replace(/^Thí nghiệm \d+:\s*/, '')}</h3>
    <p class="dim" style="font-size:var(--small-size);margin:0">${s.kicker}</p>
  </a>`
).join('\n');
function pad2Str(n) { return String(n).padStart(2, '0'); }
const hubHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thư viện ${SIM_SPECS.length} Thí nghiệm Mô phỏng Siêu âm — Vật lí 12</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
${simStyles}
html, body { height: auto; overflow-y: auto; scroll-snap-type: none; }
.hub { max-width: 1440px; margin: 0 auto; padding: 2rem var(--pad) 3rem; display: flex; flex-direction: column; gap: 1.4rem; }
.hub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1rem; }
</style>
</head>
<body>
<div class="hub">
  <header style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:1rem">
    <div>
      <span class="kicker">Vật lí 12 · Chuyên đề 2 · Bài 7: Siêu âm</span>
      <h1 style="font-size:clamp(1.7rem,3vw,2.6rem);margin:.35em 0 .1em">Thư viện ${SIM_SPECS.length} Thí nghiệm Mô phỏng Tương tác</h1>
      <p class="dim" style="margin:0">Các trang phụ độc lập gắn nút mở nhanh từ slide trình chiếu PowerPoint / Canva.</p>
    </div>
    <a class="btn solid" href="../" style="text-decoration:none">← Mở bộ Slide Web đầy đủ</a>
  </header>
  <div class="hub-grid">
${hubCards}
  </div>
</div>
</body>
</html>`;
fs.writeFileSync(path.join(simDir, 'index.html'), hubHtml, 'utf8');
console.log(`Built ${SIM_SPECS.length} standalone sim pages + sim/index.html in ${simDir}`);
