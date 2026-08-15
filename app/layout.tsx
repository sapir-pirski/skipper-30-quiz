import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מתכוננים לים",
  description: "תרגול שאלות משיט לפי נושא, עם משוב מיידי והתקדמות אישית.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  appleWebApp: { capable: true, title: "מתכוננים לים", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#063b66", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
