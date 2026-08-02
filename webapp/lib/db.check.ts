/* Supabase 연결 점검 — 표가 만들어졌는지, 204건이 올라왔는지,
   앱이 읽었을 때 프로토타입과 같은 값이 나오는지 확인한다.

   실행:  npm run db:check   (--env-file 로 .env.local 을 넘긴다)
*/
import { readFileSync } from 'node:fs';
import { configured, fetchAll, fetchCapa } from './db.ts';
import { bannerUsed, couponUsed, bannerRem, CAPA } from './domain.ts';
import type { Campaign } from './domain.ts';

const ok = (s: string) => console.log('  ✓ ' + s);
const no = (s: string) => { console.log('  ✗ ' + s); failed = true; };
let failed = false;

console.log('Supabase 연결 점검\n');

if (!configured) {
  console.log('  ✗ .env.local 에 URL 과 키가 없습니다');
  process.exit(1);
}
ok('접속 정보 읽음');

let all: Campaign[] = [];
try {
  all = await fetchAll();
  ok(`campaigns 표에서 ${all.length}건 읽음`);
} catch (e) {
  no(`읽기 실패 — ${(e as Error).message}`);
  console.log('\n  01_schema.sql · 02_seed.sql 을 SQL Editor 에서 실행했는지 확인해 주세요.');
  process.exit(1);
}

if (all.length === 204) ok('건수 204건 — 시드가 제대로 들어갔습니다');
else no(`건수가 ${all.length}건입니다 (204건이어야 합니다)`);

/* 캐파 기준값 */
try {
  const capa = await fetchCapa();
  const same = capa['배너'] === CAPA['배너'] && capa['쿠폰'] === CAPA['쿠폰']
    && capa['TV팝업'] === null && capa['토스트팝업'] === null;
  if (same) ok(`capa 표 일치 — 배너 ${capa['배너']}만 · 쿠폰 ${capa['쿠폰']}만 · 팝업 한도 없음`);
  else no(`capa 표가 코드와 다릅니다 — ${JSON.stringify(capa)}`);
} catch (e) {
  no(`capa 읽기 실패 — ${(e as Error).message}`);
}

/* 값이 프로토타입과 같은지 — 이미 대조해 둔 기준값과 맞춰 본다 */
try {
  const ref = JSON.parse(readFileSync('/tmp/reference.json', 'utf8'));
  let bad = 0;
  const sample: string[] = [];
  for (const x of ref.days) {
    if (bannerUsed(all, x.d) !== x.bu || couponUsed(all, x.d) !== x.cu) {
      bad++;
      if (sample.length < 3) sample.push(`${x.d} 배너 ${bannerUsed(all, x.d)}/${x.bu}`);
    }
  }
  if (bad === 0) ok(`DB 에서 읽은 값이 프로토타입과 같음 (${ref.days.length}일 대조)`);
  else no(`${bad}일이 어긋납니다 — ${sample.join(', ')}`);
} catch {
  console.log('  · /tmp/reference.json 이 없어 값 대조는 건너뜁니다');
}

/* 혼잡도가 살아 있는지 */
const over = ['2026-08-03', '2026-08-11', '2026-09-01', '2026-09-22']
  .map((d) => `${d.slice(5)} 잔여 ${bannerRem(all, d)}만`);
ok(`초과 예정일 확인 — ${over.join(' · ')}`);

const adj = all.filter((r) => r.status === '조정 필요');
ok(`조정 필요 ${adj.length}건 — ${adj.map((r) => r.reason).join(' / ')}`);

console.log(failed ? '\n문제가 있습니다.' : '\n연결 정상입니다.');
process.exit(failed ? 1 : 0);
