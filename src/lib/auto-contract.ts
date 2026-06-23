import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildContractContentFromDb,
  buildDetalhesFinanceiros,
  getContractFinancialValues,
} from "@/lib/contract-builder";
import { hashDocumentContent } from "@/lib/signature-audit";

type PropostaRow = {
  id: string;
  identificador?: string | null;
  cliente_id: string;
  setup: number;
  mensalidade: number;
  desconto_setup: number;
  desconto_mensalidade: number;
  duracao: number;
  condicao_descricao: string | null;
  escopo: unknown;
  escopo_descricao_adicional?: string | null;
  campos_valores?: Record<string, string | number | null> | null;
  tipo_servico_id?: string | null;
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

  let tipoServicoNome: string | null = null;
  let campos: { chave: string; label: string; tipo_campo: string }[] = [];

  if (proposta.tipo_servico_id) {
    const { data: tipo } = await supabase
      .from("tipos_servico")
      .select("nome")
      .eq("id", proposta.tipo_servico_id)
      .maybeSingle();
    tipoServicoNome = tipo?.nome ?? null;

    const { data: tipoCampos } = await supabase
      .from("tipo_servico_campos")
      .select("chave, label, tipo_campo")
      .eq("tipo_servico_id", proposta.tipo_servico_id)
      .order("ordem");
    campos = tipoCampos ?? [];
  }

  const { valor_final_setup, valor_final_mensal } = getContractFinancialValues(proposta, campos);
  const conteudo_contrato = await buildContractContentFromDb(supabase, proposta, cliente, {
    tipoServicoNome,
    campos,
  });
  const detalhes_financeiros = buildDetalhesFinanceiros(proposta);
  const documento_hash_sha256 = hashDocumentContent(conteudo_contrato);

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert([
      {
        proposta_id: proposta.id,
        cliente_id: proposta.cliente_id,
        status: "pendente_financeiro",
        valor_final_setup,
        valor_final_mensal,
        detalhes_financeiros,
        conteudo_contrato,
        documento_hash_sha256,
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
