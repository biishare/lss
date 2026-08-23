import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liceu São Silvestre",
  description:
    "Sistema de gestão escolar do Liceu São Silvestre.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
