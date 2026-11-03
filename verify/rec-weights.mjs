/* ══════════════════════════════════════════════════════════════════════
   추천 가중치를 한 곳에서만 고치게 한다

   정본은 webapp/lib/domain.ts 의 REC_W 하나다.
   HTML 프로토타입은 단일 파일이라 모듈을 못 읽으므로 값을 복제해 갖는데,
   그 복제본이 정본을 따라오는지 이 스크립트가 본다.

     node verify/rec-weights.mjs          대조만 한다. 어긋나면 종료 코드 1
     node verify/rec-weights.mjs --sync   정본 값을 HTML 에 써 넣는다

   얼린 스냅샷(0731v2 ~ 0803)은 건드리지 않는다 — DECISIONS D-10.
   대상은 지금 배포되는 파일 하나뿐이다.
   ══════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'webapp/lib/domain.ts');
const LIVE = join(ROOT, 'prototype0804_code.html');
const KEYS = ['quiet', 'weekend', 'room'];

/** `REC_W = { quiet: 0.4, ... }` 에서 세 값을 꺼낸다 */
function parse(text, file) {
  const m = text.match(/REC_W\s*=\s*\{([^}]*)\}/);
  if (!m) throw new Error(`${file} 에서 REC_W 를 찾지 못했습니다`);
  const out = {};
  for (const k of KEYS) {
    const v = m[1].match(new RegExp(`${k}\\s*:\\s*(\\d*\\.?\\d+)`));
    if (!v) throw new Error(`${file} 의 REC_W 에 ${k} 가 없습니다`);
    out[k] = Number(v[1]);
  }
  return { vals: out, span: m };
}

/** HTML 쪽 표기 — 0.4 → .40 (기존 스타일을 지킨다) */
const fmt = (n) => {
  const s = Number(n.toFixed(2)) === n ? n.toFixed(2) : String(n);
  return s.replace(/^0\./, '.');
};

const srcText = readFileSync(SRC, 'utf8');
const liveText = readFileSync(LIVE, 'utf8');
const src = parse(srcText, 'webapp/lib/domain.ts');
const live = parse(liveText, 'prototype0804_code.html');

const sum = KEYS.reduce((a, k) => a + src.vals[k], 0);
const diff = KEYS.filter((k) => src.vals[k] !== live.vals[k]);

if (process.argv.includes('--sync')) {
  if (!diff.length) {
    console.log('이미 같습니다 — 고칠 것이 없습니다.');
  } else {
    const body = KEYS.map((k) => `${k}:${fmt(src.vals[k])}`).join(', ');
    writeFileSync(LIVE, liveText.replace(live.span[0], `REC_W={${body}}`), 'utf8');
    console.log(`HTML 을 정본에 맞췄습니다 → REC_W={${body}}`);
    diff.forEach((k) => console.log(`  ${k}  ${live.vals[k]} → ${src.vals[k]}`));
    console.log('\n지문 대조(verify/README.md)를 한 번 돌려 다른 곳이 안 바뀌었는지 보세요.');
  }
} else if (diff.length) {
  console.error('추천 가중치가 두 곳에서 다릅니다.\n');
  console.error('  항목        webapp/lib/domain.ts   prototype0804_code.html');
  for (const k of KEYS) {
    const mark = diff.includes(k) ? '  ← 다름' : '';
    console.error(`  ${k.padEnd(10)} ${String(src.vals[k]).padEnd(22)} ${String(live.vals[k])}${mark}`);
  }
  console.error('\n정본은 webapp/lib/domain.ts 입니다.');
  console.error('거기서 고친 뒤  node verify/rec-weights.mjs --sync  를 돌리세요.');
  process.exit(1);
} else {
  console.log(`추천 가중치가 두 곳에서 같습니다 — ${KEYS.map((k) => `${k} ${src.vals[k]}`).join(' · ')}`);
  if (Math.abs(sum - 1) > 1e-9) {
    console.error(`\n다만 합이 1이 아닙니다 (${sum}). 점수의 최댓값이 1이 아니게 됩니다.`);
    process.exit(1);
  }
  console.log('합 1.0 · 문서 값과 같은지는 report/실험_결과.html R8 이 봅니다.');
}
