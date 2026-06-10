"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import Link from "next/link";

export default function PropostaSucessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data } = useQuery({
    queryKey: ["public-proposta", id],
    queryFn: () => dbService.getPublicPropostaWithCliente(id),
  });

  const client = data?.cliente;
  const clientName = client ? client.empresa : "sua empresa";

  return (
    <>
      <nav className="prop-nav">
        <Link href={`/proposta/${id}`} className="prop-nav-logo">
          V<span>9</span>NOVE
        </Link>
      </nav>

      <section className="prop-hero" style={{ minHeight: "80vh" }}>
        <div className="prop-hero-inner" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          <div className="prop-kicker" style={{ justifyContent: "center" }}>
            Proposta aceita
          </div>
          <h1 className="prop-hero-title" style={{ fontSize: "clamp(48px, 8vw, 72px)" }}>
            TUDO <em>CERTO!</em>
          </h1>
          <p className="prop-hero-desc" style={{ margin: "0 auto 40px" }}>
            A proposta comercial para <strong>{clientName}</strong> foi validada com sucesso.
            Nosso time está gerando o contrato de prestação de serviços — em breve você receberá
            o link para assinatura digital.
          </p>
          <Link href={`/proposta/${id}`} className="prop-btn prop-btn-ghost">
            Visualizar proposta
          </Link>
        </div>
      </section>

      <footer className="prop-footer">
        <div className="prop-footer-inner" style={{ justifyContent: "center" }}>
          <div className="prop-footer-copy">
            <span className="prop-footer-dot" />
            Agência de Marketing V9nove
          </div>
        </div>
      </footer>
    </>
  );
}
