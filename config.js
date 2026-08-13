/* ══════════════════════════════════════════════════════════════════════
   Supabase 접속 정보

   Supabase 대시보드 → Project Settings → API 에서 두 값을 복사해 넣으세요.

     url : Project URL          예) https://abcdefghijkl.supabase.co
     key : anon (public) 키     eyJhbGciOi… 로 시작하는 긴 문자열

   ⚠️  service_role 키는 절대 넣지 마세요.
       모든 권한을 가지는 키라 여기 넣는 순간 누구나 데이터를 지울 수 있습니다.
       anon 키는 브라우저에 공개되는 것이 정상이며,
       실제 접근 범위는 Supabase 의 RLS 정책이 정합니다.

   비워 두면 프로토타입은 HTML 안의 더미 204건으로 그대로 돕니다.
   주소 뒤에 ?db=local 을 붙이면 값을 채워 둔 채로도 로컬로 볼 수 있습니다.
   ══════════════════════════════════════════════════════════════════════ */
window.SUPA_CONFIG = {
  url: '',
  key: '',
};
