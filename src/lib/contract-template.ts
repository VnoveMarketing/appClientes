import { formatEscopoForContract } from "@/lib/escopo";
import { buildValoresFinanceirosText } from "@/lib/proposta-campos";

type TemplateContext = {
  empresa: string;
  cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  representante_legal?: string | null;
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
};

export const CONTRATO_PLACEHOLDERS = [
  "{{empresa}}",
  "{{cnpj}}",
  "{{cidade}}",
  "{{estado}}",
  "{{representante_legal}}",
  "{{escopo}}",
  "{{valores_financeiros}}",
  "{{condicao}}",
  "{{tipo_servico}}",
  "{{data}}",
  "{{setup}}",
  "{{mensalidade}}",
  "{{duracao}}",
];

export function renderContractTemplate(template: string, ctx: TemplateContext) {
  const escopo = formatEscopoForContract(ctx.escopo, ctx.escopo_descricao_adicional);
  const valoresFinanceiros = buildValoresFinanceirosText(
    ctx.campos_valores ?? {},
    ctx.campos ?? [],
    {
      setup: ctx.setup,
      mensalidade: ctx.mensalidade,
      duracao: ctx.duracao,
      desconto_setup: ctx.desconto_setup,
      desconto_mensalidade: ctx.desconto_mensalidade,
    }
  );

  const replacements: Record<string, string> = {
    "{{empresa}}": (ctx.empresa || "CONTRATANTE").toUpperCase(),
    "{{cnpj}}": ctx.cnpj?.trim() || "—",
    "{{cidade}}": ctx.cidade?.trim() || "—",
    "{{estado}}": ctx.estado?.trim() || "—",
    "{{representante_legal}}": ctx.representante_legal?.trim() || "—",
    "{{escopo}}": escopo,
    "{{valores_financeiros}}": valoresFinanceiros,
    "{{condicao}}": ctx.condicao_descricao?.trim() || "Nenhuma condição especial informada.",
    "{{tipo_servico}}": ctx.tipo_servico?.trim() || "—",
    "{{data}}": new Date().toLocaleDateString("pt-BR"),
    "{{setup}}": ctx.setup.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    "{{mensalidade}}": ctx.mensalidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    "{{duracao}}": ctx.duracao === 0 ? "prazo indeterminado" : `${ctx.duracao} meses`,
  };

  for (const [chave, valor] of Object.entries(ctx.campos_valores ?? {})) {
    replacements[`{{campo.${chave}}}`] =
      valor === null || valor === undefined ? "—" : String(valor);
  }

  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }

  return output;
}
