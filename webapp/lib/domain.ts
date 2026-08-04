/* ══════════════════════════════════════════════════════════════════════
   캠페인 스케줄 — 도메인 규칙

   프레임워크에 기대지 않는 순수 함수만 둡니다. React 도, Supabase 도,
   DOM 도 여기서는 모릅니다. 현업 개발팀이 다른 언어·다른 틀로 다시
   만들더라도 이 파일의 규칙만 그대로 옮기면 동작이 같아집니다.

   규칙의 출처
     0728 미팅 · 0730 담당자 확인 · 0731 데모 피드백 · 0801~0802 UT
   ══════════════════════════════════════════════════════════════════════ */

/* ── 값의 종류 ─────────────────────────────────────────────────────── */

/** 발송 채널. 캐파 한도가 있는 것은 배너뿐이다. */
export type Channel = 'TV팝업' | '배너' | '토스트팝업';

/** 오퍼. 쿠폰이면 쿠폰 캐파를 함께 쓴다. */
export type Offer = '쿠폰' | '없음';

/**
 * 발송 주기.
 *  일회성 — 시작일 하루만 발송한다. 노출은 그 뒤로도 이어지지만 캐파는 하루만 쓴다.
 *  주기성 — 기간 내내 매일 발송한다. 캐파도 매일 쓴다. 시간은 17~19시에서 배정한다.
 */
export type Cycle = '일회성' | '주기성';

/**
 * 캠페인 상태. 다섯 가지뿐이며 늘리지 않는다.
 *  신청      — 마케터가 올렸고 담당자의 확정을 기다린다. 화면에는 '확정 대기'로 쓴다.
 *  조정 필요  — 캐파가 모자란 날을 마케터가 고수하며 사유를 적어 올린 건.
 *  확정      — 담당자가 발송일과 시각을 정했다.
 *  발송 완료  — 실제 발송이 끝난 뒤 발송 시스템이 찍는다. 이 앱은 이 전이를 만들지 않는다.
 *  취소      — 마케터가 스스로 철회했거나, 담당자가 협의 후 내렸다.
 */
export type Status = '신청' | '조정 필요' | '확정' | '발송 완료' | '취소';

/** 조정 필요로 들어온 경로. 담당자가 마케터에게 되돌리는 길은 0731 피드백으로 없앴다. */
export type AdjBy = 'mkt' | null;

/** 담당자가 일정을 옮긴 기록. peer 는 자리를 맞바꾼 상대 캠페인이다. */
export interface Moved {
  from: string;
  to: string;
  by: 'adm';
  peer?: string;
}

/** 신청 한 건. 날짜는 모두 'YYYY-MM-DD', 수량 단위는 만이다. */
export interface Campaign {
  no: number;
  camp: string;
  /** 노출 기간 시작 */
  from: string;
  /** 노출 기간 종료 */
  to: string;
  /** 발송 시작일. 일회성은 이 날 하루만 나간다. */
  date: string;
  ch: Channel[];
  gnb: string;
  cycle: Cycle;
  offer: Offer;
  /** 타겟 수 (만 건). 주기성은 하루치다. */
  qty: number;
  team: string;
  mk: string;
  /** 발송 시각(시). 확정 전에는 null — 담당자가 확정하며 배정한다. */
  hour: number | null;
  status: Status;
  adjBy?: AdjBy;
  /** 조정 요청 시점의 초과 캐파 문구 */
  reason?: string;
  /** 마케터가 적은 사유 */
  note?: string;
  /** 담당자 취소 사유 */
  admNote?: string;
  memo?: string;
  moved?: Moved;
  /** 신청 시각. 마케터 요약 4칸의 집계 기준이다. */
  reqAt: string;
}

/* ── 기준값 ────────────────────────────────────────────────────────── */

/**
 * 캐파 — 0728 미팅 반영, 2026-07-29 확정.
 *
 * 시스템이 실제로 막는 것은 **하루 캐파 하나뿐**이다.
 * 같은 시각에 같은 채널이 여럿 나가도 캐파만 안 넘으면 된다 (0730 담당자 확인).
 * 시간대는 제약이 아니라 배치의 문제다.
 */
export const CAPA: Record<string, number | null> = {
  배너: 400,
  쿠폰: 440,
  TV팝업: null, // 한도 없음
  토스트팝업: null,
};

/** 발송 가능 시각 1~22시 (0시·23시는 발송하지 않는다) */
export const HOURS: number[] = Array.from({ length: 22 }, (_, i) => i + 1);

/** 주기성은 이 셋 중에서 배정한다 */
export const REC_HOURS = [17, 18, 19];

export const WD = ['일', '월', '화', '수', '목', '금', '토'] as const;

/* ── 날짜 ──────────────────────────────────────────────────────────── */

export const iso = (t: Date): string =>
  `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`;

export const addDays = (d: string, n: number): string => {
  const t = new Date(`${d}T00:00:00`);
  t.setDate(t.getDate() + n);
  return iso(t);
};

export const dowOf = (d: string): number => new Date(`${d}T00:00:00`).getDay();

/** 8/3(월) 꼴로 짧게 */
export const fmtD = (d: string): string =>
  `${+d.slice(5, 7)}/${+d.slice(8)}(${WD[dowOf(d)]})`;

/** 만 단위 숫자를 사람이 읽는 꼴로 */
export const man = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString('ko-KR');

/** 시각 표기. 확정 전에는 숫자 대신 말로 보여준다. */
export const hh = (h: number | null | undefined): string =>
  h == null ? '시간 미정' : `${h}:00`;

export const rangeDays = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

/* ── 캐파 점유 ─────────────────────────────────────────────────────── */

/**
 * 자리를 실제로 차지하는 상태.
 *
 * '신청'(확정 대기)은 **센다** — 담당자가 그 날 얼마나 몰렸는지 보고 배정해야 한다 (0731 피드백).
 * '조정 필요'는 **빼다** — 아직 자리를 못 잡은 건이다. 이걸 세면 같은 날 확정 건을
 * 열었을 때 멀쩡한 그 건이 캐파를 넘긴 것처럼 보인다.
 */
export const occupies = (r: Campaign): boolean =>
  r.status === '확정' || r.status === '발송 완료' || r.status === '신청';

/** 캘린더에 실제로 그리는 것 — 확정 대기·조정 필요·취소는 뺀다 */
export const onCalendar = (r: Campaign): boolean =>
  r.status === '확정' || r.status === '발송 완료';

/**
 * 그 날 이 건이 캐파를 쓰고 있나.
 *  일회성 — 시작일 하루만
 *  주기성 — 기간 내내 매일
 */
export const activeOn = (d: string, r: Campaign): boolean =>
  r.cycle === '주기성' ? d >= r.from && d <= r.to : r.date === d;

/** 그 날 쓰이는 양. exclude 는 판정에서 빼는 건(수정 중인 자기 자신). */
export function usedOn(
  all: Campaign[],
  d: string,
  pred: (r: Campaign) => boolean,
  exclude?: number | null,
): number {
  return all
    .filter((r) => occupies(r) && r.no !== exclude && activeOn(d, r) && pred(r))
    .reduce((s, r) => s + r.qty, 0);
}

export const bannerUsed = (all: Campaign[], d: string, ex?: number | null) =>
  usedOn(all, d, (r) => r.ch.includes('배너'), ex);
export const couponUsed = (all: Campaign[], d: string, ex?: number | null) =>
  usedOn(all, d, (r) => r.offer === '쿠폰', ex);
export const bannerRem = (all: Campaign[], d: string, ex?: number | null) =>
  (CAPA['배너'] as number) - bannerUsed(all, d, ex);
export const couponRem = (all: Campaign[], d: string, ex?: number | null) =>
  (CAPA['쿠폰'] as number) - couponUsed(all, d, ex);

/**
 * 캘린더 요약에 적는 값 — 캐파 판정과 **다르다**.
 * 그 칸에 나열한 건들의 합과 숫자가 맞아야 하므로 조정 필요 건도 더한다.
 * 판정은 '넣을 자리가 있나', 요약은 '얼마나 신청됐나'.
 */
export function appliedOn(
  all: Campaign[],
  d: string,
  pred: (r: Campaign) => boolean,
  exclude?: number | null,
): number {
  return all
    .filter((r) => r.status !== '취소' && r.no !== exclude && activeOn(d, r) && pred(r))
    .reduce((s, r) => s + r.qty, 0);
}

/* ── 신청 가능 판정 ────────────────────────────────────────────────── */

/** 신청서에서 마케터가 채우는 조건 */
export interface Draft {
  ch: Channel[];
  offer: Offer;
  cycle: Cycle;
  /** 캠페인 일수. 일회성은 노출 기간, 주기성은 발송 일수 */
  days: number;
  qty: number;
}

/** 이 건이 캐파를 쓰는 날들 */
export const spanOf = (c: Draft, d: string): string[] =>
  c.cycle === '주기성' ? rangeDays(d, addDays(d, (c.days || 1) - 1)) : [d];

export interface DayVerdict {
  ok: boolean;
  why?: string;
}

/**
 * 이 날을 시작일로 쓸 수 있나.
 * **막는 것은 일 캐파뿐이다.** 시간 배정은 담당자 몫이라 여기서 보지 않는다.
 */
export function dayCheck(
  all: Campaign[],
  c: Draft,
  d: string,
  opts: { today: string; lastDay: string; exclude?: number | null },
): DayVerdict {
  if (d < opts.today) return { ok: false, why: '지난 날짜' };
  const len = c.days || 1;
  if (addDays(d, len - 1) > opts.lastDay)
    return { ok: false, why: '기간이 데이터 범위를 넘습니다' };

  for (const x of spanOf(c, d)) {
    if (c.ch.includes('배너')) {
      const rem = bannerRem(all, x, opts.exclude);
      // 「얼마가 모자란지」로 적는다 — 잔여를 적으면 마케터가 뺄셈을 해야 한다.
      // 프로토타입과 문구가 갈려 있었고 parity 대조에서 38곳이 잡혔다 (2026-08-04)
      if (rem < c.qty) return { ok: false, why: `${fmtD(x)} 배너 캐파 ${man(c.qty - rem)}만 초과` };
    }
    if (c.offer === '쿠폰') {
      const rem = couponRem(all, x, opts.exclude);
      if (rem < c.qty) return { ok: false, why: `${fmtD(x)} 쿠폰 캐파 ${man(c.qty - rem)}만 초과` };
    }
  }
  return { ok: true };
}

/** 어느 채널이 얼마나 모자란지 — 기간 중 가장 빠듯한 날 기준 */
export interface Shortfall {
  ch: '배너' | '쿠폰';
  amt: number;
  d: string;
}

export function shortfalls(
  all: Campaign[],
  r: Campaign,
  span: string[],
  exclude?: number | null,
): Shortfall[] {
  const out: Shortfall[] = [];
  const scan = (ch: '배너' | '쿠폰', rem: (d: string) => number) => {
    let amt = 0;
    let worst = span[0];
    span.forEach((d) => {
      const g = r.qty - rem(d);
      if (g > amt) {
        amt = g;
        worst = d;
      }
    });
    if (amt > 0) out.push({ ch, amt, d: worst });
  };
  if (r.ch.includes('배너')) scan('배너', (d) => bannerRem(all, d, exclude));
  if (r.offer === '쿠폰') scan('쿠폰', (d) => couponRem(all, d, exclude));
  return out;
}

/* ── 상태 전이 ─────────────────────────────────────────────────────── */

/** 마케터가 스스로 철회할 수 있는 상태. 확정된 건은 손대지 못한다. */
export const MARKETER_CANCELABLE: Status[] = ['신청', '조정 필요'];

export const canMarketerCancel = (r: Campaign, me: { team: string; mk: string }) =>
  MARKETER_CANCELABLE.includes(r.status) && r.mk === me.mk && r.team === me.team;

/**
 * 담당자 취소 — 사유가 반드시 있어야 한다.
 * 확정 대기·조정 필요는 팝업에서 바로, 확정 건은 '수정하기'를 거친 뒤에만 연다.
 * 이미 마케터에게 확정을 알린 건이라 한 단계를 더 둔다.
 */
export const canAdminCancel = (r: Campaign, editing: boolean) =>
  r.status === '신청' || r.status === '조정 필요' || (r.status === '확정' && editing);

/* ── 추천 ──────────────────────────────────────────────────────────── */

/**
 * 가중치 — 2026-08-02 확인. 혼잡도와 금·토·일을 우선으로 본다.
 *
 * 준비 기간(lead)은 점수에서 뺐다. D-2 이상이면 3일 뒤나 30일 뒤나 값이 1이라
 * 사실상 상수였다. D-1 은 **거르지 않는다** — 대신 담당자에게 메일로 알려
 * 누락을 막는다. 문제는 "촉박한 건이 들어오는 것"이 아니라 "담당자가 못 보고
 * 지나치는 것"이라 제약이 아니라 알림으로 푼다.
 */
export const REC_W = { quiet: 0.4, weekend: 0.35, room: 0.25 };

/** 같은 날 같은 채널로 나가는 건수 — 캐파가 남아도 몰리면 서로 묻힌다 */
export function denseOn(all: Campaign[], c: Draft, d: string): number {
  return Math.max(
    ...spanOf(c, d).map((x) =>
      all.filter((r) => occupies(r) && activeOn(x, r) && r.ch.some((ch) => c.ch.includes(ch)))
        .length,
    ),
  );
}

/** 기간 중 가장 빠듯한 날에 남는 양 (만) */
export function roomOn(all: Campaign[], c: Draft, d: string, exclude?: number | null): number {
  return Math.min(
    ...spanOf(c, d).map((x) =>
      Math.min(
        c.ch.includes('배너') ? bannerRem(all, x, exclude) - c.qty : 1e9,
        c.offer === '쿠폰' ? couponRem(all, x, exclude) - c.qty : 1e9,
      ),
    ),
  );
}

export interface RecScore {
  d: string;
  score: number;
  /** 한산한 정도 0~1 (후보군 안에서 상대) */
  quiet: number;
  /** 캐파 여유 0~1 (후보군 안에서 상대) */
  room: number;
  /** 금·토·일이면 1 */
  wknd: number;
  /** 같은 날 같은 채널 건수 (원값) */
  dense: number;
  /** 남는 양, 만 (원값) */
  rem: number;
}

/**
 * 조회 기간 안에서 점수 높은 순 상위 n개.
 *
 * 한도(400만) 대비로 정규화하면 한산한 구간에서는 값이 같아져 순위가 갈리지 않았다.
 * 그래서 **후보군 안의 최소~최대로 상대 비교**한다. 어느 기간을 조회하든 갈린다.
 */
export function recTop(
  all: Campaign[],
  c: Draft,
  from: string,
  to: string,
  opts: { today: string; lastDay: string; exclude?: number | null },
  n = 3,
): RecScore[] {
  const days = rangeDays(from, to).filter((d) => dayCheck(all, c, d, opts).ok);
  if (!days.length) return [];

  const D = days.map((d) => denseOn(all, c, d));
  const R = days.map((d) => roomOn(all, c, d, opts.exclude));
  const dLo = Math.min(...D), dHi = Math.max(...D);
  const rLo = Math.min(...R), rHi = Math.max(...R);
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 1 : (v - lo) / (hi - lo));

  return days
    .map((d, i) => {
      const quiet = 1 - norm(D[i], dLo, dHi); // 적을수록 좋다
      const room = norm(R[i], rLo, rHi);
      const wknd = [5, 6, 0].includes(dowOf(d)) ? 1 : 0; // 금 토 일
      return {
        d,
        score: REC_W.quiet * quiet + REC_W.weekend * wknd + REC_W.room * room,
        quiet, room, wknd, dense: D[i], rem: R[i],
      };
    })
    .sort((a, b) => b.score - a.score || (a.d < b.d ? -1 : 1))
    .slice(0, n);
}
