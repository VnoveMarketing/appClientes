import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal de Clientes V9nove",
  description: "Gerenciamento de clientes e propostas comerciais da Agência V9nove",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${interTight.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0B0B] text-white selection:bg-[#09A3E9] selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


