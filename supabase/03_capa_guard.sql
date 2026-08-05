-- 써니C 캠페인 스케줄 — 동시 신청 캐파 보장
-- Supabase 대시보드 > SQL Editor 에 붙여 실행하세요. 01_schema.sql 다음입니다.
--
-- ══════════════════════════════════════════════════════════════════════
-- 왜 필요한가
--
--   화면에서 캐파를 검사한 뒤 저장한다. 그 사이에 다른 사람이 먼저 넣으면
--   검사 결과가 낡는다.
--
--     마케터 A                       마케터 B
--     8/22 배너 100만 남음 확인       8/22 배너 100만 남음 확인
--     100만 신청 → 통과               100만 신청 → 통과
--                    └── 8/22 에 200만이 들어간다 (캐파 초과)
--
--   화면에서는 막을 수 없다. 저장소가 쓰기를 한 줄로 세워야 막힌다.
--
-- 두 장치가 같이 있어야 한다
--
--   ① 저장 직전에 캐파를 다시 센다        ← 트리거
--   ② 같은 날을 건드리는 쓰기를 한 줄로 세운다  ← 권고 잠금(advisory lock)
--
--   ①만 있으면 두 트랜잭션이 서로를 못 본 채 각자 통과한다.
--   READ COMMITTED 에서 각자의 검사 시점 스냅샷에 상대의 행이 아직 없기 때문이다.
--   ②가 있어야 뒤에 온 쪽이 앞의 커밋을 보고 나서 센다.
-- ══════════════════════════════════════════════════════════════════════

create or replace function campaigns_capa_guard() returns trigger as $$
declare
  days      date[];
  d         date;
  is_banner boolean;
  is_coupon boolean;
  lim       integer;
  used      integer;
begin
  -- 자리를 차지하는 상태만 검사한다.
  --   '조정 필요' — 캐파를 넘겨도 되는 유일한 상태다. 넘긴다는 것이 이 상태의 뜻이다.
  --   '취소'     — 자리를 비운다.
  -- 앱의 live() 와 같은 목록이어야 한다. 갈라지면 parity 대조에서 잡힌다.
  if new.status not in ('신청', '확정', '발송 완료') then
    return new;
  end if;

  is_banner := '배너' = any(new.ch);
  is_coupon := new."offer" = '쿠폰';

  -- TV팝업·토스트팝업만이고 쿠폰도 아니면 한도 자체가 없다
  if not is_banner and not is_coupon then
    return new;
  end if;

  -- 이 건이 자리를 차지하는 날들
  --   주기성 = 기간 내내 매일 / 일회성 = 시작일 하루
  if new.cycle = '주기성' then
    select array_agg(g::date order by g)
      into days
      from generate_series(new.from_date, new.to_date, interval '1 day') g;
  else
    days := array[new.send_date];
  end if;

  -- ① 같은 날을 건드리는 트랜잭션끼리 한 줄로 세운다.
  --    날짜 오름차순으로 잠근다 — 기간이 겹치는 두 건이 서로 반대 순서로
  --    잠그면 교착이 생긴다. 순서를 고정하면 생기지 않는다.
  --    트랜잭션이 끝나면 자동으로 풀린다(xact).
  foreach d in array days loop
    perform pg_advisory_xact_lock(20260804, hashtext(d::text));
  end loop;

  -- ② 잠근 뒤에 다시 센다. 여기서부터는 앞선 커밋이 모두 보인다.
  foreach d in array days loop

    if is_banner then
      select limit_man into lim from capa where channel = '배너';
      if lim is not null then
        select coalesce(sum(c.qty), 0) into used
          from campaigns c
         where c.no <> new.no
           and c.status in ('신청', '확정', '발송 완료')
           and '배너' = any(c.ch)
           and (case when c.cycle = '주기성'
                     then d between c.from_date and c.to_date
                     else c.send_date = d end);
        if used + new.qty > lim then
          raise exception
            '% 배너 캐파 %만 초과 — 그 사이 다른 신청이 자리를 차지했습니다',
            to_char(d, 'MM/DD'), used + new.qty - lim
            using errcode = 'CAPA1';
        end if;
      end if;
    end if;

    if is_coupon then
      select limit_man into lim from capa where channel = '쿠폰';
      if lim is not null then
        select coalesce(sum(c.qty), 0) into used
          from campaigns c
         where c.no <> new.no
           and c.status in ('신청', '확정', '발송 완료')
           and c."offer" = '쿠폰'
           and (case when c.cycle = '주기성'
                     then d between c.from_date and c.to_date
                     else c.send_date = d end);
        if used + new.qty > lim then
          raise exception
            '% 쿠폰 캐파 %만 초과 — 그 사이 다른 신청이 자리를 차지했습니다',
            to_char(d, 'MM/DD'), used + new.qty - lim
            using errcode = 'CAPA1';
        end if;
      end if;
    end if;

  end loop;

  return new;
end $$ language plpgsql;

comment on function campaigns_capa_guard() is
  '저장 직전에 하루 캐파를 다시 세고, 같은 날 쓰기를 한 줄로 세운다. 03_capa_guard.sql';

drop trigger if exists campaigns_capa on campaigns;
create trigger campaigns_capa
  before insert or update on campaigns
  for each row execute function campaigns_capa_guard();

-- 표에 걸린 설명도 고쳐 둔다 — 이제 캐파 판정이 앱에만 있지 않다
comment on table campaigns is
  '캠페인 신청·확정 내역. 캐파는 앱에서 판정하고, 저장 직전에 DB가 한 번 더 막는다.';
