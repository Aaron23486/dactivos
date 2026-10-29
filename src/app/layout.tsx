import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dactivos | Gestión de activos",
  description: "Sistema de gestión y control de activos tecnológicos",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Todas las páginas se generan en cada solicitud: así Next.js puede poner el nonce de la CSP en
  // sus scripts. Una página prerenderizada no lo tendría y el navegador bloquearía sus scripts (D14).
  await connection();
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
