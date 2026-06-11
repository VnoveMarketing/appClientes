import type { SupabaseClient } from "@supabase/supabase-js";
import { formatEscopoForContract } from "@/lib/escopo";
import { renderContractTemplate } from "@/lib/contract-template";

export type PropostaForContract = {
  setup: number;
  mensalidade: number;
  desconto_setup: number;
  desconto_mensalidade: number;
  duracao: number;
  condicao_descricao?: string | null;
  escopo: unknown;
  escopo_descricao_adicional?: string | null;
  campos_valores?: Record<string, string | number | null> | null;
};

export type ClienteForContract = {
  empresa: string;
  cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  nome?: string | null;
};

export function calcDiscountedValue(val: number, pct: number) {
  return val - (val * pct) / 100;
}

export function buildDetalhesFinanceiros(proposta: PropostaForContract) {
  return proposta.condicao_descricao?.trim()
    ? `Condição especial aplicada: ${proposta.condicao_descricao.trim()}`
    : "Nenhuma condição especial informada.";
}

export function buildContractContent(
  proposta: PropostaForContract,
  cliente: ClienteForContract,
  options?: {
    tipoServicoNome?: string | null;
    campos?: { chave: string; label: string; tipo_campo: string }[];
  }
) {
  const discountedSetup = calcDiscountedValue(proposta.setup, proposta.desconto_setup);
  const discountedMensal = calcDiscountedValue(
    proposta.mensalidade,
    proposta.desconto_mensalidade
  );

  const clientName = cliente.empresa?.trim() || "CONTRATANTE";
  const escopoTexto = formatEscopoForContract(
    proposta.escopo,
    proposta.escopo_descricao_adicional
  );

  const duracaoTexto =
    proposta.duracao === 0 ? "prazo indeterminado" : `${proposta.duracao} meses`;

  return (
    `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL\n\n` +
    `CONTRATANTE: ${clientName.toUpperCase()}\n` +
    (cliente.cnpj ? `CNPJ: ${cliente.cnpj}\n` : "") +
    (cliente.cidade && cliente.estado
      ? `Sede: ${cliente.cidade}/${cliente.estado}\n`
      : "") +
    (cliente.nome ? `Representante Legal: ${cliente.nome}\n` : "") +
    `CONTRATADA: AGÊNCIA MARKETING V9NOVE LTDA\n\n` +
    `CLÁUSULA PRIMEIRA - DO OBJETO\n` +
    `O presente contrato tem por objeto a prestação de serviços de marketing digital conforme o seguinte escopo detalhado:\n` +
    `${escopoTexto}\n\n` +
    `CLÁUSULA SEGUNDA - DOS VALORES E FORMA DE PAGAMENTO\n` +
    `Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA:\n` +
    `a) Valor de Setup (Implantação): R$ ${discountedSetup.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}\n` +
    `b) Valor Recorrente (Mensalidade): R$ ${discountedMensal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })} mensais pelo período de ${duracaoTexto}.\n\n` +
    `CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES\n` +
    `As partes se obrigam a cumprir mutuamente as cláusulas e condições descritas na proposta oficial e de acordo com a LGPD.\n\n` +
    `Limeira/SP, ${new Date().toLocaleDateString("pt-BR")}`
  );
}

export async function buildContractContentFromDb(
  supabase: SupabaseClient,
  proposta: PropostaForContract,
  cliente: ClienteForContract,
  options?: {
    tipoServicoNome?: string | null;
    campos?: { chave: string; label: string; tipo_campo: string }[];
  }
) {
  const { data: modelo } = await supabase
    .from("contrato_modelos")
    .select("conteudo_template")
    .eq("ativo", true)
    .maybeSingle();

  if (modelo?.conteudo_template?.trim()) {
    const discountedSetup = calcDiscountedValue(proposta.setup, proposta.desconto_setup);
    const discountedMensal = calcDiscountedValue(
      proposta.mensalidade,
      proposta.desconto_mensalidade
    );

    return renderContractTemplate(modelo.conteudo_template, {
      empresa: cliente.empresa,
      cnpj: cliente.cnpj,
      cidade: cliente.cidade,
      estado: cliente.estado,
      representante_legal: cliente.nome,
      escopo: proposta.escopo,
      escopo_descricao_adicional: proposta.escopo_descricao_adicional,
      campos_valores: proposta.campos_valores ?? {},
      campos: options?.campos ?? [],
      setup: discountedSetup,
      mensalidade: discountedMensal,
      duracao: proposta.duracao,
      desconto_setup: proposta.desconto_setup,
      desconto_mensalidade: proposta.desconto_mensalidade,
      condicao_descricao: proposta.condicao_descricao,
      tipo_servico: options?.tipoServicoNome,
    });
  }

  return buildContractContent(proposta, cliente, options);
}

export function getContractFinancialValues(proposta: PropostaForContract) {
  return {
    valor_final_setup: calcDiscountedValue(proposta.setup, proposta.desconto_setup),
    valor_final_mensal: calcDiscountedValue(
      proposta.mensalidade,
      proposta.desconto_mensalidade
    ),
  };
}
