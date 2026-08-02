/* 도메인 모듈이 프로토타입(prototype0802_code.html)과 같은 값을 내는지 대조한다.
   현업 개발팀이 다시 만들 때도 이 대조를 통과하면 동작이 같다고 볼 수 있다.

   실행:  node --experimental-strip-types lib/domain.parity.ts
   입력:  /tmp/campaigns.json  (프로토타입에서 뽑은 204건)
          /tmp/reference.json  (같은 파일에서 뽑은 계산 결과)
*/
import { readFileSync } from 'node:fs';
import type { Campaign, Draft } from './domain.ts';
import {
  bannerUsed, couponUsed, bannerRem, couponRem, appliedOn,
  dayCheck, recTop, rangeDays,
} from './domain.ts';

type Raw = Omit<Campaign, 'ch'> & { ch: string[] };
const raw: Raw[] = JSON.parse(readFileSync('/tmp/campaigns.json', 'utf8'));
const all = raw as unknown as Campaign[];
const ref = JSON.parse(readFileSync('/tmp/reference.json', 'utf8'));

const CASES: Draft[] = [
  { ch: ['배너'], offer: '없음', cycle: '일회성', days: 7, qty: 10 },
  { ch: ['배너'], offer: '없음', cycle: '일회성', days: 5, qty: 50 },
  { ch: ['배너'], offer: '쿠폰', cycle: '주기성', days: 5, qty: 15 },
  { ch: ['TV팝업'], offer: '없음', cycle: '일회성', days: 3, qty: 100 },
  { ch: ['배너'], offer: '쿠폰', cycle: '일회성', days: 1, qty: 120 },
];
const TODAY: string = ref.today;
const LAST = ref.days[ref.days.length - 1].d;

let pass = 0;
const fails: string[] = [];
const eq = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else if (fails.length < 12) fails.push(`${name}  받은값 ${JSON.stringify(got)} / 기준 ${JSON.stringify(want)}`);
  else if (fails.length === 12) fails.push('… 이하 생략');
};

/* ① 날짜별 사용량·잔여 */
for (const x of ref.days) {
  eq(`${x.d} 배너사용`, bannerUsed(all, x.d), x.bu);
  eq(`${x.d} 쿠폰사용`, couponUsed(all, x.d), x.cu);
  eq(`${x.d} 배너잔여`, bannerRem(all, x.d), x.br);
  eq(`${x.d} 쿠폰잔여`, couponRem(all, x.d), x.cr);
  eq(`${x.d} 요약배너`, appliedOn(all, x.d, (r) => r.ch.includes('배너')), x.ab);
  eq(`${x.d} 요약쿠폰`, appliedOn(all, x.d, (r) => r.offer === '쿠폰'), x.ac);
}

/* ② 신청 가능 판정 */
for (const c of ref.checks) {
  const v = dayCheck(all, CASES[c.i], c.d, { today: TODAY, lastDay: LAST });
  eq(`판정#${c.i} ${c.d}`, { ok: v.ok, why: v.why || '' }, { ok: c.ok, why: c.why });
}

/* ③ 추천 — 순위와 점수가 같은가 */
const RANGES: [string, string][] = [
  ['2026-08-10', '2026-08-20'], ['2026-08-15', '2026-08-31'], ['2026-09-01', '2026-09-30'],
];
const byKey = new Map<string, typeof ref.recs[number]>();
for (const r of ref.recs) byKey.set(`${r.i}|${r.ri}|${r.rank}`, r);
CASES.forEach((c, i) => RANGES.forEach(([f, t], ri) => {
  recTop(all, c, f, t, { today: TODAY, lastDay: LAST }, 5).forEach((v, rank) => {
    const want = byKey.get(`${i}|${ri}|${rank}`);
    eq(`추천#${i}-${ri} ${rank + 1}위`, {
      d: v.d, score: +v.score.toFixed(6), quiet: +v.quiet.toFixed(6),
      room: +v.room.toFixed(6), wknd: v.wknd, dense: v.dense, rem: v.rem,
    }, want && {
      d: want.d, score: want.score, quiet: want.quiet,
      room: want.room, wknd: want.wknd, dense: want.dense, rem: want.rem,
    });
  });
}));

const total = pass + fails.length;
console.log(`대조 ${pass}/${total} 일치`);
if (fails.length) {
  console.log('\n어긋난 곳');
  fails.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log('도메인 모듈이 프로토타입과 같은 값을 냅니다.');
console.log(`  날짜 ${ref.days.length}일 × 6항목 · 판정 ${ref.checks.length} · 추천 ${ref.recs.length}`);
console.log(`  기준일 ${TODAY} · 데이터 마지막 ${LAST} · 캠페인 ${all.length}건`);
console.log(`  참고: 조회 가능 일수 ${rangeDays(TODAY, LAST).length}일`);
