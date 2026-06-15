import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunGarden",
  description: "러닝 기록으로 식물을 성장시키는 원예 서비스"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
