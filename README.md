# 캠페인 스케줄 관리 대시보드

KAIST · SK브로드밴드 12팀 (써니C)

마케터가 **캐파에 여유가 있는 날을 찾아 캠페인 발송을 신청**하고,
담당자가 **발송 시각을 배정해 확정**하는 대시보드입니다.
지금 구글 스프레드시트로 하는 일을 대신합니다.

---

## 처음 오셨다면

| 목적 | 읽을 것 |
|---|---|
| **뭘 만드는 건지 알고 싶다** | [history.md](history.md) — 배경 · 규칙 · 여기까지 온 과정 |
| **왜 이렇게 정했는지 알고 싶다** | [DECISIONS.md](DECISIONS.md) — 결정과 근거, 뒤집힌 것 포함 |
| **이어받아 고쳐야 한다** | [MAINTENANCE.md](MAINTENANCE.md) — 검증 · 배포 · 보안 · 알려진 빚 |
| **DB를 붙여야 한다** | [supabase/README.md](supabase/README.md) |

**규칙을 딱 하나만 본다면** — `webapp/lib/domain.ts` 입니다.
캐파 · 상태 · 판정 · 추천이 전부 거기 있고, 프레임워크에 기대지 않습니다.

---

## 지금 바로 보려면

### HTML 프로토타입 — 설치 없음

```
prototype0802_code.html 을 브라우저로 엽니다
```

네트워크 없이 돕니다. 데이터는 파일 안에 있어 새로고침하면 초기화됩니다.
`prototype0728 ~ 0801` 은 날짜별 스냅샷이라 **비교용으로 얼려 둔 것**입니다. 고치지 마세요.

배포본 — https://kellyb1024.github.io/mySUNIC_team12/prototype0802_code.html

### 웹앱 — 이식 중

```bash
cd webapp
npm install
npm run dev        # http://localhost:3000
```

`.env.local` 에 Supabase 접속 정보가 있어야 데이터가 올라옵니다.
없으면 빈 화면입니다. 설정은 [supabase/README.md](supabase/README.md).

---

## 구조

```
prototype0728~0802_code.html   날짜별 스냅샷. 0802 가 최신
config.js                      HTML 용 접속 정보
supabase/                      스키마 · 시드 204건
webapp/
  lib/domain.ts                ★ 규칙. 프레임워크 무관
  lib/db.ts                    서버 연결
  lib/useCampaigns.ts          읽기 · 쓰기 · 실시간
  components/ · app/           화면
```

---

## 고친 뒤 반드시

```bash
cd webapp
npm run parity     # 규칙이 프로토타입과 같은 값을 내는가 (1,087항목)
npm run db:check   # DB 연결 · 데이터 · 값 일치
npm run build
```

`parity` 가 깨지면 규칙이 갈라진 것입니다. 자세한 것은 [MAINTENANCE.md](MAINTENANCE.md).

---

## ⚠️ 알아두실 것

이 저장소는 **공개**이고 로그인이 아직 없습니다.
Supabase 접근 키가 공개되므로 **키를 본 사람이 데이터를 넣고 고칠 수 있습니다.**
지우기만 막아 두어 통째로 사라지지는 않고, `supabase/02_seed.sql` 로 복구됩니다.

**실제 운영 전에는 반드시 로그인을 붙이고 권한을 좁혀야 합니다.**
자세한 것은 [MAINTENANCE.md](MAINTENANCE.md) 6장.
