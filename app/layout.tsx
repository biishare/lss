import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestao Academica",
  description: "Demo de gestão académica",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
