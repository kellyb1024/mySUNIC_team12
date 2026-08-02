'use client';
/* ══════════════════════════════════════════════════════════════════════
   캠페인 데이터 훅 — 읽기 · 쓰기 · 실시간

   HTML 프로토타입은 무엇이 바뀌든 화면을 통째로 다시 그렸다. 그래서
   남의 변경이 들어오면 입력 중이던 칸의 포커스와 커서가 날아갔다.
   여기서는 상태만 갈아 끼우고 React 가 바뀐 곳만 고친다.

   쓰기는 먼저 화면에 반영하고 뒤에서 보낸다. 실패하면 서버 상태를 다시
   받아 되돌리고 알린다 — 조용히 어긋나는 것이 제일 나쁘다.
   ══════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Campaign } from './domain.ts';
import { configured, fetchAll, insertOne, updateOne, upsertMany, subscribe } from './db.ts';

export interface CampaignStore {
  all: Campaign[];
  loading: boolean;
  /** 서버와 어긋났을 때 알릴 말. 없으면 null */
  error: string | null;
  add: (body: Omit<Campaign, 'no'>) => Campaign;
  set: (no: number, patch: Partial<Campaign>) => void;
  /** 두 건을 한 번에 — 나뉘면 그 사이 캐파가 어긋난다 */
  setMany: (pairs: [number, Partial<Campaign>][]) => void;
  reload: () => Promise<void>;
}

export function useCampaigns(): CampaignStore {
  const [all, setAll] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* 낙관적 반영 뒤 서버 작업이 실패하면 여기로 돌아온다 */
  const reload = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    try {
      setAll(await fetchAll());
      setError(null);
    } catch (e) {
      setError(`서버에서 읽지 못했습니다 — ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /* 여러 변경이 몰아칠 때 매번 다시 읽지 않도록 살짝 묶는다 */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudge = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void reload(); }, 150);
  }, [reload]);

  useEffect(() => {
    void reload();
    if (!configured) return;
    const off = subscribe(nudge);
    return () => { off(); if (timer.current) clearTimeout(timer.current); };
  }, [reload, nudge]);

  const fail = useCallback((what: string, e: unknown) => {
    setError(`서버에 반영하지 못했습니다 — ${what}`);
    console.error('[db]', what, e);
    void reload();
  }, [reload]);

  const add = useCallback((body: Omit<Campaign, 'no'>): Campaign => {
    let made!: Campaign;
    setAll((prev) => {
      const no = Math.max(0, ...prev.map((r) => r.no)) + 1;
      made = { ...body, no } as Campaign;
      void insertOne(made).catch((e) => fail(`${made.camp} 신청`, e));
      return [...prev, made];
    });
    return made;
  }, [fail]);

  const set = useCallback((no: number, patch: Partial<Campaign>) => {
    setAll((prev) => prev.map((r) => {
      if (r.no !== no) return r;
      const next = { ...r, ...patch };
      void updateOne(next).catch((e) => fail(`${next.camp} 수정`, e));
      return next;
    }));
  }, [fail]);

  const setMany = useCallback((pairs: [number, Partial<Campaign>][]) => {
    setAll((prev) => {
      const map = new Map(pairs);
      const hit: Campaign[] = [];
      const next = prev.map((r) => {
        const p = map.get(r.no);
        if (!p) return r;
        const n = { ...r, ...p };
        hit.push(n);
        return n;
      });
      void upsertMany(hit).catch((e) => fail(hit.map((r) => r.camp).join(' · '), e));
      return next;
    });
  }, [fail]);

  return { all, loading, error, add, set, setMany, reload };
}
