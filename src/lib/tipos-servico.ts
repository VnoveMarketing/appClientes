export type TipoCampoKind = "number" | "text" | "currency" | "percent" | "calculated";

export type TipoServicoCampo = {
  id: string;
  tipo_servico_id: string;
  chave: string;
  label: string;
  tipo_campo: TipoCampoKind;
  ordem: number;
  obrigatorio: boolean;
  placeholder: string;
  calculo?: { operacao: "multiply" | "add"; operandos: string[] } | null;
};

export type TipoServicoEntregavel = {
  id: string;
  tipo_servico_id: string;
  nome: string;
  descricao: string;
  ordem: number;
};

export type TipoServico = {
  id: string;
  nome: string;
  descricao: string;
  created_at: string;
  campos?: TipoServicoCampo[];
  entregaveis?: TipoServicoEntregavel[];
};

export type ContratoModelo = {
  id: string;
  nome: string;
  conteudo_template: string;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  mime_type: string | null;
  ativo: boolean;
  created_at: string;
};

export function entregaveisToEscopo(
  entregaveis: TipoServicoEntregavel[]
): { nome: string; descricao: string; entregavel_id?: string }[] {
  return [...entregaveis]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => ({
      nome: item.nome,
      descricao: item.descricao,
      entregavel_id: item.id,
    }));
}
