import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { FutureFlowBadge } from "@/components/shared/futureflow-badge";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "הר הביטוח — עוצמה",
  description: "טעינת הר הביטוח לפיירברי",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-heebo)]">
        {children}
        <FutureFlowBadge systemName="הר הביטוח — עוצמה" theme="dark" />
      </body>
    </html>
  );
}
