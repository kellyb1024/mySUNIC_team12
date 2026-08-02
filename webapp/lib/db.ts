/* ══════════════════════════════════════════════════════════════════════
   데이터 계층 — 화면은 데이터가 어디서 오는지 모른다.

   표의 컬럼 이름이 SQL 예약어를 피해 바뀐 것(from → from_date 등)을
   여기서만 흡수한다. 바깥에서는 도메인 타입 Campaign 만 오간다.
   ══════════════════════════════════════════════════════════════════════ */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Campaign } from './domain.ts';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const configured = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!configured) throw new Error('Supabase 접속 정보가 없습니다 (.env.local 확인)');
  if (!client) client = createClient(URL, KEY);
  return client;
}

/* ── 행 ↔ 도메인 레코드 ────────────────────────────────────────────── */

/** 표의 한 행. 컬럼 이름은 스키마(supabase/01_schema.sql)와 같다. */
export interface Row {
  no: number;
  camp: string;
  from_date: string;
  to_date: string;
  send_date: string;
  ch: string[] | null;
  gnb: string | null;
  cycle: string;
  offer: string;
  qty: number;
  team: string;
  mk: string;
  hour: number | null;
  status: string;
  adj_by: string | null;
  reason: string | null;
  note: string | null;
  adm_note: string | null;
  memo: string | null;
  moved: Campaign['moved'] | null;
  req_at: string;
}

export const toCampaign = (x: Row): Campaign => ({
  no: x.no,
  camp: x.camp,
  from: x.from_date,
  to: x.to_date,
  date: x.send_date,
  ch: (x.ch ?? []) as Campaign['ch'],
  gnb: x.gnb ?? '',
  cycle: x.cycle as Campaign['cycle'],
  offer: x.offer as Campaign['offer'],
  qty: x.qty,
  team: x.team,
  mk: x.mk,
  hour: x.hour,
  status: x.status as Campaign['status'],
  adjBy: (x.adj_by ?? null) as Campaign['adjBy'],
  reason: x.reason ?? '',
  note: x.note ?? '',
  admNote: x.adm_note ?? '',
  memo: x.memo ?? '',
  moved: x.moved ?? undefined,
  /* '2026-08-02T11:04:00+00:00' → '2026-08-02 11:04' */
  reqAt: String(x.req_at ?? '').replace('T', ' ').slice(0, 16),
});

export const toRow = (r: Campaign): Row => ({
  no: r.no,
  camp: r.camp,
  from_date: r.from,
  to_date: r.to,
  send_date: r.date,
  ch: r.ch,
  gnb: r.gnb || null,
  cycle: r.cycle,
  offer: r.offer,
  qty: r.qty,
  team: r.team,
  mk: r.mk,
  hour: r.hour,
  status: r.status,
  adj_by: r.adjBy ?? null,
  reason: r.reason || null,
  note: r.note || null,
  adm_note: r.admNote || null,
  memo: r.memo || null,
  moved: r.moved ?? null,
  req_at: r.reqAt,
});

/* ── 읽기·쓰기 ─────────────────────────────────────────────────────── */

export async function fetchAll(): Promise<Campaign[]> {
  const { data, error } = await supabase().from('campaigns').select('*').order('no');
  if (error) throw error;
  return (data as Row[]).map(toCampaign);
}

export async function insertOne(r: Campaign): Promise<void> {
  const { error } = await supabase().from('campaigns').insert(toRow(r));
  if (error) throw error;
}

export async function updateOne(r: Campaign): Promise<void> {
  const { error } = await supabase().from('campaigns').update(toRow(r)).eq('no', r.no);
  if (error) throw error;
}

/** 두 건을 한 번에 — 조정 요청 수락과 확정 건 이동은 나뉘면 안 된다 */
export async function upsertMany(rs: Campaign[]): Promise<void> {
  const { error } = await supabase()
    .from('campaigns')
    .upsert(rs.map(toRow), { onConflict: 'no' });
  if (error) throw error;
}

/** 캐파 기준값 — 개발자 없이 바꿀 수 있도록 표에서 읽는다 */
export async function fetchCapa(): Promise<Record<string, number | null>> {
  const { data, error } = await supabase().from('capa').select('channel, limit_man');
  if (error) throw error;
  const out: Record<string, number | null> = {};
  (data as { channel: string; limit_man: number | null }[]).forEach((x) => {
    out[x.channel] = x.limit_man;
  });
  return out;
}

/** 변경이 오면 알린다. 반환값을 부르면 구독을 끊는다. */
export function subscribe(onChange: () => void): () => void {
  const ch = supabase()
    .channel('campaigns-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, onChange)
    .subscribe();
  return () => {
    supabase().removeChannel(ch);
  };
}
