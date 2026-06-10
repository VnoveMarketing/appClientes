import { Bebas_Neue, Barlow, Barlow_Condensed } from "next/font/google";
import "./proposta.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const barlow = Barlow({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
});

export default function PropostaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${bebasNeue.variable} ${barlow.variable} ${barlowCondensed.variable} prop-page`}
    >
      {children}
    </div>
  );
}
