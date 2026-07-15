import { formatEscopoForContract } from "@/lib/escopo";
import { buildValoresFinanceirosText } from "@/lib/proposta-campos";

type TemplateContext = {
  empresa: string;
  cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  representante_legal?: string | null;
  representante_cpf?: string | null;
  representante_email?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  cep?: string | null;
  escopo: unknown;
  escopo_descricao_adicional?: string | null;
  campos_valores?: Record<string, string | number | null>;
  campos?: { chave: string; label: string; tipo_campo: string }[];
  setup: number;
  mensalidade: number;
  duracao: number;
  desconto_setup?: number;
  desconto_mensalidade?: number;
  condicao_descricao?: string | null;
  tipo_servico?: string | null;
  id_prop?: string | null;
};

export type ContratoPlaceholderItem = {
  token: string;
  label: string;
};

export const CONTRATO_PLACEHOLDER_ITEMS: ContratoPlaceholderItem[] = [
  { token: "{{empresa}}", label: "Nome da empresa" },
  { token: "{{cnpj}}", label: "CNPJ" },
  { token: "{{cidade}}", label: "Cidade" },
  { token: "{{estado}}", label: "Estado (UF)" },
  { token: "{{representante_legal}}", label: "Nome do representante legal" },
  { token: "{{representante_cpf}}", label: "CPF do representante legal" },
  { token: "{{representante_email}}", label: "E-mail do representante legal" },
  { token: "{{endereco_rua}}", label: "Rua / logradouro" },
  { token: "{{endereco_numero}}", label: "Número do endereço" },
  { token: "{{endereco_complemento}}", label: "Complemento do endereço" },
  { token: "{{cep}}", label: "CEP" },
  { token: "{{escopo}}", label: "Escopo da proposta" },
  { token: "{{valores_financeiros}}", label: "Valores financeiros" },
  { token: "{{condicao}}", label: "Condição especial" },
  { token: "{{tipo_servico}}", label: "Tipo de serviço" },
  { token: "{{data}}", label: "Data atual" },
  { token: "{{setup}}", label: "Valor de setup" },
  { token: "{{mensalidade}}", label: "Valor da mensalidade" },
  { token: "{{duracao}}", label: "Duração do contrato" },
  { token: "{{id_prop}}", label: "Identificador da proposta" },
];

export const CONTRATO_PLACEHOLDERS = CONTRATO_PLACEHOLDER_ITEMS.map((item) => item.token);

export function renderContractTemplate(template: string, ctx: TemplateContext) {
  const escopo = formatEscopoForContract(ctx.escopo, ctx.escopo_descricao_adicional);
  const valoresFinanceiros = buildValoresFinanceirosText(
    ctx.campos_valores ?? {},
    ctx.campos ?? [],
    {
      setup: ctx.setup,
      mensalidade: ctx.mensalidade,
      duracao: ctx.duracao,
    }
  );

  const replacements: Record<string, string> = {
    "{{empresa}}": (ctx.empresa || "CONTRATANTE").toUpperCase(),
    "{{cnpj}}": ctx.cnpj?.trim() || "—",
    "{{cidade}}": ctx.cidade?.trim() || "—",
    "{{estado}}": ctx.estado?.trim() || "—",
    "{{representante_legal}}": ctx.representante_legal?.trim() || "—",
    "{{nome_representante_legal}}": ctx.representante_legal?.trim() || "—",
    "{{representante_cpf}}": ctx.representante_cpf?.trim() || "—",
    "{{cpf_representante_legal}}": ctx.representante_cpf?.trim() || "—",
    "{{representante_email}}": ctx.representante_email?.trim() || "—",
    "{{email_representante_legal}}": ctx.representante_email?.trim() || "—",
    "{{endereco_rua}}": ctx.endereco_rua?.trim() || "—",
    "{{endereco_numero}}": ctx.endereco_numero?.trim() || "—",
    "{{endereco_complemento}}": ctx.endereco_complemento?.trim() || "—",
    "{{cep}}": ctx.cep?.trim() || "—",
    "{{escopo}}": escopo,
    "{{valores_financeiros}}": valoresFinanceiros,
    "{{condicao}}": ctx.condicao_descricao?.trim() || "Nenhuma condição especial informada.",
    "{{tipo_servico}}": ctx.tipo_servico?.trim() || "—",
    "{{data}}": new Date().toLocaleDateString("pt-BR"),
    "{{setup}}": ctx.setup.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    "{{mensalidade}}": ctx.mensalidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    "{{duracao}}": ctx.duracao === 0 ? "prazo indeterminado" : `${ctx.duracao} meses`,
    "{{id_prop}}": ctx.id_prop?.trim() || "—",
  };

  for (const [chave, valor] of Object.entries(ctx.campos_valores ?? {})) {
    const campo = (ctx.campos ?? []).find((c) => c.chave === chave);
    if (valor === null || valor === undefined) {
      replacements[`{{campo.${chave}}}`] = "—";
      continue;
    }
    if (
      typeof valor === "number" &&
      (campo?.tipo_campo === "currency" || campo?.tipo_campo === "calculated")
    ) {
      replacements[`{{campo.${chave}}}`] = valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      });
      continue;
    }
    replacements[`{{campo.${chave}}}`] = String(valor);
  }

  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }

  return output;
}
