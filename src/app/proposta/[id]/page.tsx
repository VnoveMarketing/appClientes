"use client";

import React, { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { normalizeEscopo } from "@/lib/escopo";
import Link from "next/link";
import { AgencyLogo } from "@/components/agency-brand";
import type { CasePortfolio } from "@/lib/types";
import {
  buildPropostaInvestimento,
  formatCurrency,
  type PropostaInvestCard,
} from "@/lib/proposta-investimento";
import { getPropostaIdentificadorDisplay } from "@/lib/proposta-identificador";

function PropostaInvestPrice({
  card,
  highlighted = false,
}: {
  card: PropostaInvestCard;
  highlighted?: boolean;
}) {
  if (card.isExempt) {
    return (
      <div>
        {card.originalAmount !== undefined && (
          <div className="prop-invest-price strike">{formatCurrency(card.originalAmount)}</div>
        )}
        <div className="prop-invest-price highlight">ISENTO</div>
      </div>
    );
  }

  return (
    <div>
      {card.originalAmount !== undefined && (card.discountPct ?? 0) > 0 && (
        <div className="prop-invest-price strike">{formatCurrency(card.originalAmount)}</div>
      )}
      <div className={`prop-invest-price${highlighted ? " highlight" : ""}`}>
        {formatCurrency(card.amount)}
        {card.suffix ? (
          <span style={{ fontSize: 16, color: "var(--prop-gray-500)", marginLeft: 6 }}>
            {card.suffix}
          </span>
        ) : null}
      </div>
      {(card.discountPct ?? 0) > 0 && (
        <span className="prop-discount-tag">{card.discountPct}% desconto</span>
      )}
    </div>
  );
}

function PropostaInvestCardBlock({
  card,
  featured = false,
  tag,
}: {
  card: PropostaInvestCard;
  featured?: boolean;
  tag?: string;
}) {
  return (
    <div className={`prop-invest-card${featured ? " featured" : ""}`}>
      {tag ? <span className="prop-invest-tag">{tag}</span> : null}
      <div>
        <div className="prop-invest-label">{card.label}</div>
        <div className="prop-invest-name">{card.title}</div>
        {card.detail ? <p className="prop-invest-detail">{card.detail}</p> : null}
      </div>
      <PropostaInvestPrice card={card} highlighted={featured} />
    </div>
  );
}

const BASE_SECTIONS = [
  { id: "sobre", label: "Agência", showWhenCases: false },
  { id: "cases", label: "Cases", showWhenCases: true },
  { id: "escopo", label: "Escopo", showWhenCases: false },
  { id: "processo", label: "Processo", showWhenCases: false },
  { id: "investimento", label: "Valores", showWhenCases: false },
  { id: "aceite", label: "Aceite", showWhenCases: false },
];

export default function PropostaPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-proposta", id],
    queryFn: () => dbService.getPublicPropostaWithCliente(id),
  });

  const proposta = data?.proposta;
  const client = data?.cliente;
  const tipoServico = data?.tipo_servico ?? null;
  const portfolioCases = (data?.cases ?? []) as CasePortfolio[];

  const navSections = BASE_SECTIONS.filter(
    (section) => !section.showWhenCases || portfolioCases.length > 0
  ).map((section, index) => ({
    id: section.id,
    label: section.label,
    num: String(index + 1).padStart(2, "0"),
  }));

  const sectionIndex = (id: string) =>
    String(navSections.findIndex((s) => s.id === id) + 1).padStart(2, "0");

  const clientAccent = client?.cor_principal ?? undefined;
  const brandedStyle = clientAccent
    ? ({ "--prop-client-accent": clientAccent } as React.CSSProperties)
    : undefined;

  useEffect(() => {
    if (!proposta) return;
    dbService.trackPropostaVisualizada(id).catch(() => {});
  }, [id, proposta?.id]);

  if (isLoading) {
    return (
      <div className="prop-center-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="prop-spinner" />
          <span style={{ fontSize: 14 }}>Carregando proposta comercial...</span>
        </div>
      </div>
    );
  }

  if (error || !proposta) {
    return (
      <div className="prop-center-screen">
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <p className="prop-sec-title" style={{ fontSize: 36, marginBottom: 12 }}>
            PROPOSTA <em>NÃO ENCONTRADA</em>
          </p>
          <p className="prop-sec-desc" style={{ fontSize: 14 }}>
            O link acessado é inválido ou a proposta foi removida do nosso sistema.
          </p>
        </div>
      </div>
    );
  }

  const clientName = client ? client.empresa : "Empresa Cliente";
  const escopoItems = normalizeEscopo(proposta.escopo);
  const isPendente = proposta.status === "pendente" || proposta.status === "em_analise";
  const investimento = buildPropostaInvestimento(proposta, tipoServico);
  const resumoRows = [
    ...investimento.resumo,
    { key: "Cliente", value: clientName },
  ];

  const createdDate = new Date(proposta.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const propostaIdentificador = getPropostaIdentificadorDisplay(proposta);

  const hasHeroImage = Boolean(client?.hero_image_url);

  return (
    <div className="prop-branded" style={brandedStyle}>
      <nav className="prop-nav">
        <a href="#top" className="prop-nav-logo">
          <AgencyLogo height={32} />
        </a>
        <span className="prop-nav-date">{createdDate}</span>
      </nav>

      {/* Hero */}
      <section
        className={`prop-hero${hasHeroImage ? " prop-hero-has-bg" : ""}`}
        id="top"
      >
        {hasHeroImage ? (
          <>
            <div
              className="prop-hero-bg"
              style={{ backgroundImage: `url(${client!.hero_image_url})` }}
              aria-hidden
            />
            <div className="prop-hero-gradient" aria-hidden />
          </>
        ) : null}
        <div className="prop-hero-inner prop-hero-split">
          <div className="prop-hero-content">
            <div className="prop-hero-meta">
              <div className="prop-kicker">Proposta Comercial · Agência Vnove</div>
            </div>
            <h1 className="prop-hero-title">
              PROPOSTA<br />
              <em>COMERCIAL</em>
            </h1>
            <span className="prop-proposta-id">{propostaIdentificador}</span>
            <div className="prop-hero-client">{clientName}</div>
            <p className="prop-hero-desc">
              Solução completa de <strong>marketing digital e CRM</strong> para estruturar,
              acelerar e escalar os resultados da sua empresa.
            </p>
            {proposta.condicao_descricao && proposta.condicao_descricao !== "Nenhuma" && (
              <span className="prop-badge">{proposta.condicao_descricao}</span>
            )}
          </div>
          {client?.logo_url ? (
            <div className="prop-hero-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={client.logo_url}
                alt={clientName}
                className="prop-hero-client-logo"
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Section nav */}
      <div className="prop-pnav-wrap">
        <div className="prop-pnav">
          {navSections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="prop-pnav-item">
              <span className="prop-pnav-num">{s.num}</span>
              <span className="prop-pnav-name">{s.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* 01 — Agência */}
      <div className="prop-divider" />
      <section className="prop-sec-bg" id="sobre">
        <div className="prop-sec">
          <div className="prop-s-label">{sectionIndex("sobre")} — Quem Somos</div>
          <h2 className="prop-sec-title">
            WE ARE <em>VNOVE</em>
          </h2>
          <div className="prop-intro-grid">
            <div>
              <p className="prop-sec-desc" style={{ marginBottom: 16 }}>
                A Agência Vnove é uma agência <strong>full service</strong>, com mais de 20 anos de
                experiência no mercado e equipe pronta para planejar, implementar e mensurar
                resultados de campanhas online e offline de forma integrada.
              </p>
              <p className="prop-sec-desc">
                Mais do que falar de nós mesmos, mostramos resultados que impactam diretamente
                no faturamento e no crescimento das marcas atendidas em todo o território nacional.
              </p>
            </div>
            <div className="prop-stats">
              <div className="prop-stat">
                <div className="prop-stat-value">+90M</div>
                <div className="prop-stat-label">faturados no digital</div>
              </div>
              <div className="prop-stat">
                <div className="prop-stat-value muted">+600</div>
                <div className="prop-stat-label">projetos realizados</div>
              </div>
              <div className="prop-stat">
                <div className="prop-stat-value muted">+70</div>
                <div className="prop-stat-label">clientes nacionais e int.</div>
              </div>
              <div className="prop-stat">
                <div className="prop-stat-value">+15M</div>
                <div className="prop-stat-label">investidos em tráfego</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {portfolioCases.length > 0 ? (
        <>
          <div className="prop-divider" />
          <section className="prop-sec-bg2" id="cases">
            <div className="prop-sec">
              <div className="prop-s-label">{sectionIndex("cases")} — Portfólio</div>
              <h2 className="prop-sec-title">
                CASES <em>RELACIONADOS</em>
              </h2>
              <p className="prop-sec-desc">
                Projetos selecionados com resultados relevantes para o seu segmento.
              </p>
              <div className="prop-cases-grid">
                {portfolioCases.map((item) => {
                  const card = (
                    <>
                      <div className="prop-case-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imagem_url} alt={item.nome} />
                      </div>
                      <div className="prop-case-body">
                        <div className="prop-case-name">{item.nome}</div>
                      </div>
                    </>
                  );

                  if (item.link) {
                    return (
                      <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="prop-case-card"
                      >
                        {card}
                      </a>
                    );
                  }

                  return (
                    <div key={item.id} className="prop-case-card">
                      {card}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Escopo */}
      <div className="prop-divider" />
      <section className="prop-sec-bg2" id="escopo">
        <div className="prop-sec">
          <div className="prop-s-label">{sectionIndex("escopo")} — Entregáveis</div>
          <h2 className="prop-sec-title">
            ESCOPO DA <em>SOLUÇÃO</em>
          </h2>
          <p className="prop-sec-desc">
            A proposta compreende um contrato de prestação de serviços completo, garantindo
            acesso às soluções especificadas abaixo:
          </p>

          <div className="prop-escopo-list">
            {escopoItems.map((item, idx) => (
              <div key={`${item.nome}-${idx}`} className="prop-escopo-item">
                <div className="prop-escopo-dot" />
                <div>
                  <div className="prop-escopo-name">{item.nome}</div>
                  <div className="prop-escopo-desc">
                    {item.descricao?.trim() ||
                      "Implantação e otimização da solução para aceleração dos resultados da sua empresa."}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {proposta.escopo_descricao_adicional ? (
            <div className="prop-escopo-extra">{proposta.escopo_descricao_adicional}</div>
          ) : null}
        </div>
      </section>

      {/* 03 — Processo */}
      <div className="prop-divider" />
      <section className="prop-sec-bg" id="processo">
        <div className="prop-sec">
          <div className="prop-s-label">{sectionIndex("processo")} — Ciclo de Atendimento</div>
          <h2 className="prop-sec-title">
            ONBOARDING <em>E ROTINA</em>
          </h2>

          <div className="prop-steps">
            {[
              {
                title: "Onboarding",
                desc: "Briefing detalhado e reunião com responsáveis de cada área para alinhamento e planejamento estratégico.",
              },
              {
                title: "Ações iniciais",
                desc: "Primeira reunião com ações iniciais da marca: institucional, redes orgânicas, tráfego pago e cronogramas.",
              },
              {
                title: "Rotina recorrente",
                desc: "Contato diário com o Mini Squad da agência e reuniões periódicas de acompanhamento.",
              },
              {
                title: "Sucesso",
                desc: "Reunião semestral estratégica com líderes para análise de resultados e planejamento dos próximos saltos.",
              },
            ].map((step, i) => (
              <div key={step.title} className="prop-step">
                <div className="prop-step-num">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="prop-step-title">{step.title}</div>
                  <div className="prop-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 — Investimento */}
      <div className="prop-divider" />
      <section className="prop-sec-bg2" id="investimento">
        <div className="prop-sec">
          <div className="prop-s-label">{sectionIndex("investimento")} — Investimento</div>
          <h2 className="prop-sec-title">
            VALORES DO <em>PROJETO</em>
          </h2>
          <p className="prop-sec-desc">
            Valores ajustados e condições especiais exclusivas para a contratação desta
            proposta comercial.
          </p>

          <div
            className={`prop-invest-grid${
              investimento.secondaryCard ? "" : " prop-invest-grid--single"
            }`}
          >
            {investimento.secondaryCard ? (
              <PropostaInvestCardBlock card={investimento.secondaryCard} />
            ) : null}
            <PropostaInvestCardBlock
              card={investimento.primaryCard}
              featured
              tag={investimento.tipoNome}
            />
          </div>

          <div className="prop-format" style={{ marginTop: 48 }}>
            <div className="prop-format-label">Resumo do contrato</div>
            {resumoRows.map((row) => (
              <div key={row.key} className="prop-fmt-row">
                <span className="prop-fmt-key">{row.key}</span>
                <span className="prop-fmt-val">
                  {row.value}
                  {row.valueMuted ? (
                    <span className="prop-fmt-val-muted">{row.valueMuted}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — Termos e aceite */}
      <div className="prop-divider" />
      <section className="prop-sec-bg" id="aceite">
        <div className="prop-sec">
          <div className="prop-s-label">{sectionIndex("aceite")} — Termos</div>
          <h2 className="prop-sec-title">
            NÃO ESTÃO <em>INCLUSOS</em>
          </h2>
          <div className="prop-terms-list">
            {[
              "Verba investida em Ads direto nas plataformas (Meta/Google).",
              "Custos com captações audiovisuais fora dos limites da cidade.",
              "Serviço de fotografia profissional terceirizado.",
              "Operação de equipe, hospedagem ou custos logísticos de eventos.",
              "Treinamentos comerciais adicionais pós-leads das campanhas.",
            ].map((item) => (
              <div key={item} className="prop-terms-li">
                {item}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48 }}>
            <div className="prop-s-label">Termos da proposta</div>
            <div className="prop-terms-list">
              {[
                "Os valores mencionados nesta proposta comercial já contemplam impostos.",
                "Esta proposta é válida pelo prazo de até 10 dias corridos da sua emissão.",
                "As partes se comprometem mutuamente ao cumprimento da LGPD.",
              ].map((item) => (
                <div key={item} className="prop-terms-li">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {isPendente ? (
            <div className="prop-cta">
              <div>
                <h3>PRONTO PARA ACELERAR?</h3>
                <p>
                  Ao aceitar, você preencherá as informações cadastrais e nossa equipe gerará
                  o contrato oficial de prestação de serviços.
                </p>
              </div>
              <Link href={`/proposta/${proposta.id}/aceitar`} className="prop-btn prop-btn-blue">
                Aceitar proposta
              </Link>
            </div>
          ) : (
            <div className="prop-cta accepted">
              <div>
                <h3>PROPOSTA ACEITA</h3>
                <p>
                  Esta proposta comercial já foi validada. O contrato está em processo de
                  elaboração ou assinatura pela equipe jurídica e financeira.
                </p>
              </div>
              <span className="prop-badge" style={{ marginTop: 0 }}>
                Status: {proposta.status}
              </span>
            </div>
          )}
        </div>
      </section>

      <footer className="prop-footer">
        <div className="prop-footer-inner">
          <div className="prop-footer-copy prop-footer-brand">
            <AgencyLogo height={20} />
            <span>Limeira/SP</span>
          </div>
          <div className="prop-footer-copy">vnove.com.br</div>
        </div>
      </footer>
    </div>
  );
}
