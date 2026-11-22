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
