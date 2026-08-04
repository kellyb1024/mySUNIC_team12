'use client';
/* 담당자 · 캠페인 관리 — 월 캘린더 한 장
   0731 피드백: 확정 대기·조정 필요 리스트를 따로 보는 것보다 캘린더 하나를
   펼쳐놓고 날짜별 신청 캐파와 캠페인 리스트를 보여준다. 시작일 기준. */
import { useMemo } from 'react';
import type { Campaign, Status } from '@/lib/domain';
import { CAPA, WD, appliedOn, activeOn, occupies, man, hh, iso, isRed } from '@/lib/domain';
import { TODAY } from '@/lib/config';

/** 상태별 점 색 — 0731 피드백: 확정대기 파란색, 조정필요 빨간색 */
const dotOf = (s: Status) =>
  s === '신청' ? 'wait' : s === '조정 필요' ? 'need'
    : s === '취소' ? 'canc' : s === '발송 완료' ? 'sent' : 'conf';

interface Cell { d: string; out: boolean }

function monthCells(m: string): Cell[] {
  const [y, mm] = m.split('-').map(Number);
  const first = new Date(y, mm - 1, 1);
  const lastD = new Date(y, mm, 0).getDate();
  const lead = first.getDay();
  const cells: Cell[] = [];
  for (let i = lead; i > 0; i--) cells.push({ d: iso(new Date(y, mm - 1, 1 - i)), out: true });
  for (let i = 1; i <= lastD; i++) cells.push({ d: iso(new Date(y, mm - 1, i)), out: false });
  while (cells.length % 7) cells.push({ d: iso(new Date(y, mm, cells.length - lead - lastD + 1)), out: true });
  return cells;
}

export default function ManageCalendar({
  all, month, onPick,
}: {
  all: Campaign[];
  month: string;
  onPick: (no: number) => void;
}) {
  const weeks = useMemo(() => {
    const cells = monthCells(month);
    const out: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [month]);

  return (
    <div className="cal">
      <div className="calhd">
        {WD.map((w, i) => <div key={w} className={`ch${i === 0 ? ' sun' : ''}`}>{w}</div>)}
      </div>

      {weeks.map((wk, wi) => (
        <div className="calrow" key={wi}>
          {wk.map((c) => {
            if (c.out) return <div className="ccell out" key={c.d} />;

            /* 그 날 시작하는 건. 확정된 건은 시각 순, 아직 처리 못 한 건은 신청 순 (0801 피드백) */
            const day = all.filter((r) => r.status !== '취소' && r.from === c.d);
            const done = day.filter((r) => r.hour != null).sort((a, b) => a.hour! - b.hour!);
            const todo = day.filter((r) => r.hour == null).sort((a, b) => (a.reqAt < b.reqAt ? -1 : 1));

            /* 요약 숫자는 '신청한 값' 그대로 — 아래 나열한 건들의 합과 같아야 한다 */
            const bu = appliedOn(all, c.d, (r) => r.ch.includes('배너'));
            const cu = appliedOn(all, c.d, (r) => r.offer === '쿠폰');
            /* 빨강은 '이 날 조정이 필요한 건이 있다'는 신호 — 채널별로 따로 본다 */
            const adj = all.filter((r) => r.status === '조정 필요' && activeOn(c.d, r));
            const bOver = adj.some((r) => r.ch.includes('배너'));
            const cOver = adj.some((r) => r.offer === '쿠폰');
            /* 그 날 지나가는 중인 건 (시작일이 아닌 날) */
            const going = all.filter((r) => occupies(r) && activeOn(c.d, r) && r.from !== c.d).length;

            return (
              <div className={`ccell${c.d === TODAY ? ' today' : ''}${isRed(c.d) ? ' red' : ''}`} key={c.d}>
                <div className="cd num">{+c.d.slice(8)}</div>

                <div className="ccap">
                  <span className={bOver ? 'over' : ''}>
                    배너 <b>{man(bu)}</b>/{man(CAPA['배너'] as number)}만
                  </span>
                  <span className={cOver ? 'over' : ''}>
                    쿠폰 <b>{man(cu)}</b>/{man(CAPA['쿠폰'] as number)}만
                  </span>
                </div>

                {going > 0 && <div className="cgo">진행 중 {going}건</div>}

                {done.map((r) => (
                  <div className={`crow ${dotOf(r.status)}`} key={r.no}
                       onClick={() => onPick(r.no)} title={`${r.camp} · ${r.status}`}>
                    <i /><span className="cn">{r.camp}</span>
                    <span className="cq num">{man(r.qty)}만</span>
                    <span className="cs num">{hh(r.hour)}</span>
                  </div>
                ))}

                {done.length > 0 && todo.length > 0 && <div className="csep" />}

                {todo.map((r) => (
                  <div className={`crow ${dotOf(r.status)}`} key={r.no} onClick={() => onPick(r.no)}>
                    <i /><span className="cn">{r.camp}</span>
                    <span className="cq num">{man(r.qty)}만</span>
                    <span className="cs">{r.status === '신청' ? '확정 대기' : r.status}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
