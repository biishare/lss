import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import "./globals.css";
import theme from "./theme";

export const metadata: Metadata = {
  title: {
    default: "Liceu São Silvestre",
    template: "%s | LSS",
  },
  description:
    "Sistema de gestão escolar do Liceu São Silvestre.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-MZ" className="h-full antialiased">
      <body className="min-h-full">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
