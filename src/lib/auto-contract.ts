import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildContractContent,
  buildDetalhesFinanceiros,
  getContractFinancialValues,
} from "@/lib/contract-builder";

type PropostaRow = {
  id: string;
  cliente_id: string;
  setup: number;
  mensalidade: number;
  desconto_setup: number;
  desconto_mensalidade: number;
  duracao: number;
  condicao_descricao: string | null;
  escopo: unknown;
  escopo_descricao_adicional?: string | null;
};

type ClienteRow = {
  empresa: string;
  cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  nome?: string | null;
};

export async function generateContractFromProposta(
  supabase: SupabaseClient,
  proposta: PropostaRow,
  cliente: ClienteRow
) {
  const { data: existing } = await supabase
    .from("contratos")
    .select("id")
    .eq("proposta_id", proposta.id)
    .maybeSingle();

  if (existing) return existing;

  const { valor_final_setup, valor_final_mensal } = getContractFinancialValues(proposta);
  const conteudo_contrato = buildContractContent(proposta, cliente);
  const detalhes_financeiros = buildDetalhesFinanceiros(proposta);

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert([
      {
        proposta_id: proposta.id,
        cliente_id: proposta.cliente_id,
        status: "pendente_assinatura",
        valor_final_setup,
        valor_final_mensal,
        detalhes_financeiros,
        conteudo_contrato,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: propostaError } = await supabase
    .from("propostas")
    .update({ status: "contrato_gerado" })
    .eq("id", proposta.id);

  if (propostaError) throw new Error(propostaError.message);

  return contrato;
}
