"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function PropostaPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Tanstack Queries
  const { data: proposta, isLoading, error } = useQuery({
    queryKey: ["proposta", id],
    queryFn: () => dbService.getPropostaById(id),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: dbService.getClientes,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09A3E9]" />
          <span>Carregando proposta comercial...</span>
        </div>
      </div>
    );
  }

  if (error || !proposta) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="flex flex-col items-center gap-2 text-center max-w-md px-6">
          <AlertTriangle className="size-12 text-rose-500" />
          <span className="text-lg font-semibold text-white">Proposta não encontrada</span>
          <span className="text-sm text-zinc-500">
            O link acessado é inválido ou a proposta foi removida do nosso sistema.
          </span>
        </div>
      </div>
    );
  }

  const client = clientes.find((c) => c.id === proposta.cliente_id);
  const clientName = client ? client.empresa : "Empresa Cliente";

  // Helper format
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const calcDiscount = (val: number, pct: number) => {
    return val - (val * pct) / 100;
  };

  const finalSetup = calcDiscount(proposta.setup, proposta.desconto_setup);
  const finalMensal = calcDiscount(proposta.mensalidade, proposta.desconto_mensalidade);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 font-sans selection:bg-[#09A3E9] selection:text-white">
      {/* 1. COVER PAGE SLIDE */}
      <section className="min-h-screen flex flex-col justify-between p-8 md:p-16 relative overflow-hidden border-b border-zinc-900">
        {/* Sky blue accent glow */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#09A3E9]/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Top Header */}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5 select-none">
            <span className="text-2xl font-black text-white tracking-wider">VN</span>
            <span className="text-2xl font-black text-[#09A3E9] tracking-wider">9</span>
            <span className="text-2xl font-black text-white tracking-wider">VE</span>
          </div>
          <span className="text-xs text-zinc-500 tracking-widest uppercase font-mono">
            {new Date(proposta.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Main Content */}
        <div className="my-auto max-w-4xl">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-none">
            PROPOSTA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#09A3E9]">
              COMERCIAL
            </span>
          </h1>
          <div className="mt-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div className="border-l-2 border-[#09A3E9] pl-4">
              <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Preparada para</span>
              <h2 className="text-2xl font-bold text-white mt-1">{clientName}</h2>
            </div>
            {proposta.condicao_descricao && (
              <div className="bg-[#09A3E9]/10 border border-[#09A3E9]/20 rounded-lg px-4 py-2 text-xs text-zinc-300 md:max-w-md">
                💡 {proposta.condicao_descricao}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full border-t border-zinc-800/40 pt-8">
          <div className="text-xs text-zinc-500">
            vnove.com.br | © {new Date().getFullYear()} Agencia V9nove
          </div>
          <div className="flex items-center gap-2 text-[#09A3E9] text-xs font-mono tracking-wider animate-bounce md:animate-none">
            ROLE PARA BAIXO <ArrowRight className="size-4 rotate-90" />
          </div>
        </div>
      </section>

      {/* 2. INSTITUTIONAL PITCH ("WE ARE V9") */}
      <section className="min-h-screen flex flex-col justify-center py-20 px-8 md:px-16 border-b border-zinc-900 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <span className="text-xs text-[#09A3E9] font-mono tracking-widest uppercase">Quem Somos</span>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
              WE ARE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#09A3E9] to-white">
                V9NOVE.
              </span>
            </h2>
            <p className="text-zinc-400 leading-relaxed text-base md:text-lg">
              A V9 é uma agência <strong className="text-white">full service</strong>, com mais de 20 anos de experiência no mercado e com equipe pronta para planejar, implementar e mensurar os resultados de campanhas online e offline de forma ampla e integrada.
            </p>
            <p className="text-zinc-500 leading-relaxed text-sm">
              Mais do que falar de nós mesmos, mostramos nossos resultados que impactam diretamente no faturamento e no crescimento das marcas atendidas em todo o território nacional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2 hover:border-[#09A3E9]/30 transition-all group">
              <span className="text-2xl md:text-4xl font-extrabold text-[#09A3E9] group-hover:scale-105 transition-transform duration-300">
                +90 milhões
              </span>
              <span className="text-xs text-zinc-400 font-medium">faturados no Digital</span>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2 hover:border-[#09A3E9]/30 transition-all group">
              <span className="text-2xl md:text-4xl font-extrabold text-white group-hover:scale-105 transition-transform duration-300">
                +600
              </span>
              <span className="text-xs text-zinc-400 font-medium">projetos realizados</span>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2 hover:border-[#09A3E9]/30 transition-all group">
              <span className="text-2xl md:text-4xl font-extrabold text-white group-hover:scale-105 transition-transform duration-300">
                +70
              </span>
              <span className="text-xs text-zinc-400 font-medium">clientes nacionais e int.</span>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-2 hover:border-[#09A3E9]/30 transition-all group">
              <span className="text-2xl md:text-4xl font-extrabold text-[#09A3E9] group-hover:scale-105 transition-transform duration-300">
                +15 milhões
              </span>
              <span className="text-xs text-zinc-400 font-medium">investidos em Tráfego</span>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. DELIVERABLES / ESCOPO DA SOLUÇÃO */}
      <section className="min-h-screen flex flex-col justify-center py-20 px-8 md:px-16 border-b border-zinc-900 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-12">
          <span className="text-xs text-[#09A3E9] font-mono tracking-widest uppercase">Entregáveis</span>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            ESCOPO DA SOLUÇÃO
          </h2>
          <p className="text-zinc-400 max-w-2xl text-sm">
            A proposta compreende um contrato de prestação de serviços completo, garantindo acesso às soluções especificadas abaixo:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposta.escopo.map((item, idx) => (
            <Card key={idx} className="bg-zinc-900/50 border-zinc-800/80 p-6 hover:border-[#09A3E9]/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-[#09A3E9]/10 p-2 text-[#09A3E9]">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-white text-base">{item}</h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Implantação e otimização da solução para aceleração dos resultados da sua empresa.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. CICLO DE ATENDIMENTO */}
      <section className="min-h-screen flex flex-col justify-center py-20 px-8 md:px-16 border-b border-zinc-900 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-12">
          <span className="text-xs text-[#09A3E9] font-mono tracking-widest uppercase">Ciclo de Atendimento</span>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            PROCESSO DE ONBOARDING E ROTINA
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-zinc-800 text-white font-extrabold text-sm border border-zinc-700">
                1
              </div>
              <h3 className="font-bold text-white text-lg">Onboarding</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Resposta de Briefing detalhado e/ou reunião com os responsáveis de cada área para alinhamento e definição de planejamento estratégico.
            </p>
          </div>

          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-zinc-800 text-white font-extrabold text-sm border border-zinc-700">
                2
              </div>
              <h3 className="font-bold text-white text-lg">Ações iniciais</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Primeira reunião compreendendo as ações iniciais da marca em termos de institucional, redes orgânicas, tráfego pago e cronogramas.
            </p>
          </div>

          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-[#09A3E9]/20 text-[#09A3E9] font-extrabold text-sm border border-[#09A3E9]/30">
                3
              </div>
              <h3 className="font-bold text-white text-lg">Rotina recorrente</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A rotina da marca pega tração, com contato diário com o Mini Squad da agência e reuniões periódicas de acompanhamento.
            </p>
          </div>

          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-zinc-800 text-white font-extrabold text-sm border border-zinc-700">
                4
              </div>
              <h3 className="font-bold text-white text-lg">Sucesso</h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Reunião semestral estratégica com todo o time de líderes para análise detalhada de resultados e planejamento dos próximos saltos.
            </p>
          </div>
        </div>
      </section>

      {/* 5. INVESTMENT VALUES */}
      <section className="min-h-screen flex flex-col justify-center py-20 px-8 md:px-16 border-b border-zinc-900 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-12 text-center items-center">
          <span className="text-xs text-[#09A3E9] font-mono tracking-widest uppercase">Investimento</span>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            VALORES DO PROJETO
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            Valores ajustados e condições especiais exclusivas para a contratação desta proposta comercial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Setup card */}
          <Card className="bg-zinc-900 border-zinc-800 p-8 flex flex-col justify-between gap-6 hover:border-zinc-700 transition-all">
            <div className="flex flex-col gap-2">
              <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Etapa de Implantação</span>
              <h3 className="text-2xl font-bold text-white">Setup e Configurações</h3>
              <p className="text-zinc-400 text-xs leading-relaxed mt-2">
                Atividades de onboarding, criação de canais, parametrização e treinamento de equipe.
              </p>
            </div>
            <div className="flex flex-col gap-1 border-t border-zinc-800 pt-4">
              {proposta.desconto_setup === 100 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500 line-through text-lg font-bold">{formatBRL(proposta.setup)}</span>
                  <span className="text-3xl font-black text-[#09A3E9]">ISENTO</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {proposta.desconto_setup > 0 && (
                    <span className="text-zinc-500 line-through text-sm font-bold">{formatBRL(proposta.setup)}</span>
                  )}
                  <span className="text-3xl font-black text-white">{formatBRL(finalSetup)}</span>
                  {proposta.desconto_setup > 0 && (
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                      {proposta.desconto_setup}% Desconto
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Monthly Card */}
          <Card className="bg-zinc-900 border-zinc-800 p-8 flex flex-col justify-between gap-6 hover:border-zinc-700 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#09A3E9] text-white text-[10px] uppercase font-mono tracking-wider font-extrabold px-3 py-1 rounded-bl">
              FEE MENSAL
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Recorrência Mensal</span>
              <h3 className="text-2xl font-bold text-white">Mensalidade Operacional</h3>
              <p className="text-zinc-400 text-xs leading-relaxed mt-2">
                Atuação diária operacional, gerenciamento de mídias e acompanhamento analítico.
              </p>
            </div>
            <div className="flex flex-col gap-1 border-t border-zinc-800 pt-4">
              {proposta.desconto_mensalidade > 0 && (
                <span className="text-zinc-500 line-through text-sm font-bold">{formatBRL(proposta.mensalidade)}</span>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#09A3E9]">{formatBRL(finalMensal)}</span>
                <span className="text-zinc-400 text-xs">/mês</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Calendar className="size-3 text-zinc-500" />
                  Período de {proposta.duracao} meses
                </span>
                {proposta.desconto_mensalidade > 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                    {proposta.desconto_mensalidade}% Desconto
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. TERMS, EXCLUSIONS & ACCEPTANCE BUTTON */}
      <section className="min-h-screen flex flex-col justify-between py-20 px-8 md:px-16 max-w-5xl mx-auto relative">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="text-xs text-[#09A3E9] font-mono tracking-widest uppercase">Termos e Condições</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">NÃO ESTÃO INCLUSOS</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-400 list-disc pl-4">
              <li>Verba investida em Ads direto nas plataformas (Meta/Google).</li>
              <li>Custos com captações audiovisuais fora dos limites da cidade.</li>
              <li>Serviço de fotografia profissional terceirizado.</li>
              <li>Operação de equipe, hospedagem ou custos logísticos de eventos.</li>
              <li>Treinamentos comerciais adicionais pós-leads das campanhas.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-4 mt-4 border-t border-zinc-800 pt-8">
            <h2 className="text-lg font-bold text-white">TERMOS DA PROPOSTA</h2>
            <ul className="flex flex-col gap-3 text-xs text-zinc-400 list-disc pl-4 leading-relaxed">
              <li>Os valores mencionados nesta proposta comercial já contemplam impostos.</li>
              <li>Esta proposta é válida pelo prazo de até 10 dias corridos da sua emissão.</li>
              <li>As partes se comprometem mutuamente ao cumprimento da LGPD.</li>
            </ul>
          </div>
        </div>

        {proposta.status === "pendente" ? (
          <div className="mt-16 bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-bold text-white text-lg">Pronto para acelerar os resultados da sua empresa?</h3>
              <p className="text-zinc-400 text-xs mt-1">
                Ao clicar em aceitar, você preencherá as informações cadastrais e nossa equipe gerará o contrato.
              </p>
            </div>
            <Link href={`/proposta/${proposta.id}/aceitar`}>
              <Button className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold px-8 py-3 rounded-lg shadow-lg shadow-[#09A3E9]/20 group">
                Aceitar Proposta Comercial
                <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-16 bg-zinc-900/40 border border-emerald-500/10 rounded-xl p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <FileCheck className="size-10 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-lg">Esta proposta comercial já foi aceita!</h3>
                <p className="text-zinc-500 text-xs mt-1">
                  O contrato oficial está sendo elaborado pelo time jurídico/financeiro da agência.
                </p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-mono tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold">
              ACEITA
            </span>
          </div>
        )}

        <div className="text-center text-xs text-zinc-650 mt-16 border-t border-zinc-800/40 pt-8 w-full">
          Agência de Marketing V9nove - Limeira/SP
        </div>
      </section>
    </div>
  );
}
