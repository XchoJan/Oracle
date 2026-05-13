import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, Merriweather } from "next/font/google";
import "./globals.css";

const serif = Merriweather({
  weight: ["300", "400", "700"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-survey-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-survey-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Прогностическая карта · 24 месяца",
  description:
    "Структурированный самоотчёт и условный сценарий на два года: здоровье, финансы, отношения, работа, риски.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${serif.variable} ${mono.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="fn-serif min-h-full antialiased" suppressHydrationWarning>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
