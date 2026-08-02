import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '캠페인 대시보드',
  description: 'SK브로드밴드 캠페인 스케줄 관리',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  /* 글꼴은 globals.css 의 @import 로 불러온다 — 프로토타입과 같은 조합을 쓰기 위해 */
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
