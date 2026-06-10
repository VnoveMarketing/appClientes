"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { normalizeEscopo } from "@/lib/escopo";
import Link from "next/link";

const NAV_SECTIONS = [
  { id: "sobre", num: "01", label: "Agência" },
  { id: "escopo", num: "02", label: "Escopo" },
  { id: "processo", num: "03", label: "Processo" },
  { id: "investimento", num: "04", label: "Valores" },
  { id: "aceite", num: "05", label: "Aceite" },
];

export default function PropostaPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-proposta", id],
    queryFn: () => dbService.getPublicPropostaWithCliente(id),
  });

  const proposta = data?.proposta;
  const client = data?.cliente;

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

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const calcDiscount = (val: number, pct: number) => val - (val * pct) / 100;

  const finalSetup = calcDiscount(proposta.setup, proposta.desconto_setup);
  const finalMensal = calcDiscount(proposta.mensalidade, proposta.desconto_mensalidade);

  const createdDate = new Date(proposta.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const duracaoLabel =
    proposta.duracao === 0 ? "Prazo indeterminado" : `${proposta.duracao} meses`;

  return (
    <>
      <nav className="prop-nav">
        <a href="#top" className="prop-nav-logo">
          V<span>9</span>NOVE
        </a>
        <span className="prop-nav-date">{createdDate}</span>
      </nav>

      {/* Hero */}
      <section className="prop-hero" id="top">
        <div className="prop-hero-inner">
          <div className="prop-kicker">Proposta Comercial · V9nove</div>
          <h1 className="prop-hero-title">
            PROPOSTA<br />
            <em>COMERCIAL</em>
          </h1>
          <div className="prop-hero-client">{clientName}</div>
          <p className="prop-hero-desc">
            Solução completa de <strong>marketing digital e CRM</strong> para estruturar,
            acelerar e escalar os resultados da sua empresa.
          </p>
          {proposta.condicao_descricao && proposta.condicao_descricao !== "Nenhuma" && (
            <span className="prop-badge">{proposta.condicao_descricao}</span>
          )}
        </div>
      </section>

      {/* Section nav */}
      <div className="prop-pnav-wrap">
        <div className="prop-pnav">
          {NAV_SECTIONS.map((s) => (
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
          <div className="prop-s-label">01 — Quem Somos</div>
          <h2 className="prop-sec-title">
            WE ARE <em>V9NOVE</em>
          </h2>
          <div className="prop-intro-grid">
            <div>
              <p className="prop-sec-desc" style={{ marginBottom: 16 }}>
                A V9 é uma agência <strong>full service</strong>, com mais de 20 anos de
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

      {/* 02 — Escopo */}
      <div className="prop-divider" />
      <section className="prop-sec-bg2" id="escopo">
        <div className="prop-sec">
          <div className="prop-s-label">02 — Entregáveis</div>
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
          <div className="prop-s-label">03 — Ciclo de Atendimento</div>
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
          <div className="prop-s-label">04 — Investimento</div>
          <h2 className="prop-sec-title">
            VALORES DO <em>PROJETO</em>
          </h2>
          <p className="prop-sec-desc">
            Valores ajustados e condições especiais exclusivas para a contratação desta
            proposta comercial.
          </p>

          <div className="prop-invest-grid">
            <div className="prop-invest-card">
              <div>
                <div className="prop-invest-label">Etapa de implantação</div>
                <div className="prop-invest-name">Setup e Configurações</div>
                <p className="prop-invest-detail">
                  Onboarding, criação de canais, parametrização e treinamento de equipe.
                </p>
              </div>
              <div>
                {proposta.desconto_setup === 100 ? (
                  <>
                    <div className="prop-invest-price strike">{formatBRL(proposta.setup)}</div>
                    <div className="prop-invest-price highlight">ISENTO</div>
                  </>
                ) : (
                  <>
                    {proposta.desconto_setup > 0 && (
                      <div className="prop-invest-price strike">{formatBRL(proposta.setup)}</div>
                    )}
                    <div className="prop-invest-price">{formatBRL(finalSetup)}</div>
                    {proposta.desconto_setup > 0 && (
                      <span className="prop-discount-tag">{proposta.desconto_setup}% desconto</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="prop-invest-card featured">
              <span className="prop-invest-tag">Fee mensal</span>
              <div>
                <div className="prop-invest-label">Recorrência mensal</div>
                <div className="prop-invest-name">Mensalidade Operacional</div>
                <p className="prop-invest-detail">
                  Atuação diária operacional, gerenciamento de mídias e acompanhamento analítico.
                </p>
              </div>
              <div>
                {proposta.desconto_mensalidade > 0 && (
                  <div className="prop-invest-price strike">{formatBRL(proposta.mensalidade)}</div>
                )}
                <div className="prop-invest-price highlight">
                  {formatBRL(finalMensal)}
                  <span style={{ fontSize: 16, color: "var(--prop-gray-500)", marginLeft: 6 }}>
                    /mês
                  </span>
                </div>
                {proposta.desconto_mensalidade > 0 && (
                  <span className="prop-discount-tag">
                    {proposta.desconto_mensalidade}% desconto
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="prop-format" style={{ marginTop: 48 }}>
            <div className="prop-format-label">Resumo do contrato</div>
            <div className="prop-fmt-row">
              <span className="prop-fmt-key">Setup final</span>
              <span className="prop-fmt-val">
                {proposta.desconto_setup === 100 ? "Isento" : formatBRL(finalSetup)}
              </span>
            </div>
            <div className="prop-fmt-row">
              <span className="prop-fmt-key">Mensalidade</span>
              <span className="prop-fmt-val">{formatBRL(finalMensal)}</span>
            </div>
            <div className="prop-fmt-row">
              <span className="prop-fmt-key">Duração</span>
              <span className="prop-fmt-val">{duracaoLabel}</span>
            </div>
            <div className="prop-fmt-row">
              <span className="prop-fmt-key">Cliente</span>
              <span className="prop-fmt-val">{clientName}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — Termos e aceite */}
      <div className="prop-divider" />
      <section className="prop-sec-bg" id="aceite">
        <div className="prop-sec">
          <div className="prop-s-label">05 — Termos</div>
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
          <div className="prop-footer-copy">
            <span className="prop-footer-dot" />
            Agência de Marketing V9nove · Limeira/SP
          </div>
          <div className="prop-footer-copy">vnove.com.br</div>
        </div>
      </footer>
    </>
  );
}
