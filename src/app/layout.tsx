import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal de Clientes | Agência Vnove",
  description: "Gerenciamento de clientes e propostas comerciais da Agência Vnove",
  icons: {
    icon: "/icone-agencia.svg",
    apple: "/icone-agencia.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${interTight.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0B0B] text-white selection:bg-[#09A3E9] selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


