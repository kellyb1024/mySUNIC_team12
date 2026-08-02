'use client';
/* 담당자 · 캠페인 관리
   화면 이식 1단계. 실시간 효과가 가장 잘 보이는 화면부터 옮긴다. */
import { useState } from 'react';
import { useCampaigns } from '@/lib/useCampaigns';
import { MONTHS, TODAY } from '@/lib/config';
import { configured } from '@/lib/db';
import ManageCalendar from '@/components/ManageCalendar';

export default function Page() {
  const store = useCampaigns();
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [picked, setPicked] = useState<number | null>(null);

  const { all } = store;
  /* 담당자 화면은 캘린더가 주인공이라 요약도 같은 축을 쓴다 — 발송 시작일 기준 */
  const ofMonth = (d: string) => d.slice(0, 7) === month;
  const n = (s: string) => all.filter((r) => r.status === s && ofMonth(r.from)).length;
  const wait = n('신청'), adj = n('조정 필요'), conf = n('확정'), canc = n('취소');
  /* 지난달에 시작하는데 아직 확정 못 한 건 — 월을 넘겨 놓치지 않도록 */
  const carry = all.filter(
    (r) => (r.status === '신청' || r.status === '조정 필요') && r.from.slice(0, 7) < month,
  ).length;
  const mi = MONTHS.indexOf(month);

  const box = (k: string, v: number, hero = false) => (
    <div className={`kpi${hero ? ' hero' : ''}`} key={k}>
      <div className="k">{k}</div>
      <div className="v num">{v || '—'}</div>
    </div>
  );

  return (
    <>
      {/* 상단 바 — 프로토타입의 .gnb 구조를 그대로 쓴다 */}
      <div className="gnb">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ci" alt="SK broadband" src="/sk-broadband.png" />
          <span className="div" />
          <b>캠페인 대시보드</b>
        </div>
        <div className="spacer" />
        <div className="seg"><button className="on">담당자</button></div>
        <span className="demo-cap">
          {configured
            ? store.loading ? '불러오는 중…' : `서버 연결 · ${all.length}건`
            : '로컬 (.env.local 미설정)'}
        </span>
      </div>

      <div className="tabbar">
        <a className="on">캠페인 관리</a>
      </div>

      {store.error && (
        <div className="wrap wide"><div className="blockbox"><b>{store.error}</b></div></div>
      )}

      <div className="wrap wide">
        <div className="kpihd">
          <button className="arw" disabled={mi <= 0} onClick={() => setMonth(MONTHS[mi - 1])}>‹</button>
          <span className="kml num">{month.replace('-', '. ')}</span>
          <button className="arw" disabled={mi >= MONTHS.length - 1} onClick={() => setMonth(MONTHS[mi + 1])}>›</button>
          <span className="kmn">이 달 발송 {wait + adj + conf + canc}건</span>
          {carry > 0 && (
            <button className="chip sm" onClick={() => setMonth(MONTHS[mi - 1])}>
              지난달 미처리 {carry}건
            </button>
          )}
        </div>

        <div className="kpis">
          {box('확정 대기', wait, wait > 0)}
          {box('조정 필요', adj, adj > 0)}
          {box('확정', conf)}
          {box('취소', canc)}
        </div>

        <div className="card">
          <div className="card-hd">
            <div className="rule" />
            <div className="lbl">
              <span>캠페인 관리</span>
              <span>{month.replace('-', '.')} 발송 시작</span>
            </div>
          </div>
          {store.loading
            ? <div className="empty">불러오는 중…</div>
            : <ManageCalendar all={all} month={month} onPick={setPicked} />}
        </div>
      </div>

      {picked != null && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setPicked(null); }}>
          <div className="box">
            <h3>{all.find((r) => r.no === picked)?.camp}</h3>
            <div className="m-sub">처리 팝업은 다음 단계에서 옮깁니다.</div>
            <div className="m-act">
              <button className="pill ghost" onClick={() => setPicked(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
