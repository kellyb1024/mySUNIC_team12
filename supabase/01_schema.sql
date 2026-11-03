-- 써니C 캠페인 스케줄 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여 실행하세요.
-- 컬럼 이름은 SQL 예약어를 피해 바꿨습니다 (from → from_date, to → to_date, date → send_date).
-- 앱 안에서는 지금 쓰던 이름 그대로 보이도록 데이터 계층이 변환합니다.

create table if not exists campaigns (
  no         integer      primary key,        -- 앱의 r.no
  camp       text         not null,           -- 캠페인명
  from_date  date         not null,           -- 발송 기간 시작 (r.from)
  to_date    date         not null,           -- 발송 기간 종료 (r.to)
  send_date  date         not null,           -- 발송 시작일  (r.date)
  ch         text[]       not null default '{}',   -- 채널 배너·TV팝업·토스트팝업
  gnb        text,
  cycle      text         not null,           -- 일회성 · 주기성
  "offer"    text         not null,           -- 쿠폰 · 없음
  qty        integer      not null,           -- 타겟수 (만 단위)
  team       text         not null,
  mk         text         not null,           -- 마케터
  hour       integer,                         -- 발송 시각. 확정 전에는 null
  status     text         not null,           -- 신청·조정 필요·확정·발송 완료·취소
  adj_by     text,                            -- 조정 필요로 들어온 경로. 지금은 'mkt' 하나
  reason     text,                            -- 조정 요청 사유(캐파 잔여)
  note       text,                            -- 마케터가 적은 사유
  adm_note   text,                            -- 담당자 취소 사유
  memo       text,
  moved      jsonb,                           -- 담당자 일정 조정 기록 {from,to,by,peer}
  req_at     timestamptz  not null,           -- 신청 시각. 요약 집계의 기준
  updated_at timestamptz  not null default now()
);

comment on table campaigns is '캠페인 신청·확정 내역. 캐파 판정은 앱에서 한다.';

-- 자주 거는 조건
create index if not exists campaigns_send_date_idx on campaigns (send_date);
create index if not exists campaigns_status_idx    on campaigns (status);
create index if not exists campaigns_mk_idx        on campaigns (team, mk);

-- 값 제약 — 오타로 상태가 늘어나는 것을 막는다
alter table campaigns drop constraint if exists campaigns_status_chk;
alter table campaigns add  constraint campaigns_status_chk
  check (status in ('신청','조정 필요','확정','발송 완료','취소'));
alter table campaigns drop constraint if exists campaigns_cycle_chk;
alter table campaigns add  constraint campaigns_cycle_chk
  check (cycle in ('일회성','주기성'));

-- 고칠 때마다 updated_at 을 찍는다
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;
drop trigger if exists campaigns_touch on campaigns;
create trigger campaigns_touch before update on campaigns
  for each row execute function touch_updated_at();

-- 실시간 구독을 켠다 (담당자·마케터 화면이 서로의 변경을 받는다)
-- 이미 등록돼 있으면 건너뛴다 — alter publication 은 두 번 실행하면 오류가 난다
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table campaigns;
  end if;
end $$;

-- 캐파 기준값 — 개발자 없이 바꿀 수 있게 테이블로 뺀다
create table if not exists capa (
  channel text primary key,
  limit_man integer,        -- null 이면 한도 없음. 단위는 만
  note text
);
insert into capa (channel, limit_man, note) values
  ('배너',      400, '일 400만'),
  ('쿠폰',      440, '일 440만 (오퍼가 쿠폰인 건)'),
  ('TV팝업',   null, '한도 없음'),
  ('토스트팝업', null, '한도 없음')
on conflict (channel) do update
  set limit_man = excluded.limit_man, note = excluded.note;

-- ── 접근 권한 ────────────────────────────────────────────────────────
-- 로그인을 아직 안 붙였으므로 익명 키로 읽고 쓸 수 있다.
-- 저장소가 공개라 anon 키도 공개된다 — 그래서 '지우기'만은 막아 둔다.
-- 잘못돼도 02_seed.sql 을 다시 돌리면 원래 204건으로 복구된다.
-- 로그인을 붙일 때 이 부분을 역할별로 좁힌다 (계획 C단계).
alter table campaigns enable row level security;
alter table capa      enable row level security;

drop policy if exists campaigns_all    on campaigns;   -- 예전에 열어 둔 것 정리
drop policy if exists campaigns_read   on campaigns;
drop policy if exists campaigns_insert on campaigns;
drop policy if exists campaigns_update on campaigns;

create policy campaigns_read   on campaigns for select using (true);
create policy campaigns_insert on campaigns for insert with check (true);
create policy campaigns_update on campaigns for update using (true) with check (true);
-- delete 정책은 만들지 않는다 → 익명으로는 지울 수 없다

drop policy if exists capa_read on capa;
create policy capa_read on capa for select using (true);
