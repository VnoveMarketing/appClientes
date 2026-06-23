import type { TipoServicoCampo } from "./tipos-servico";

export type CampoCalculo = {
  operacao: "multiply" | "add" | "divide";
  operandos: string[];
};

export function parseOperandosText(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatOperandosText(operandos: string[]): string {
  return operandos.join(", ");
}

export function parseCampoCalculo(raw: unknown): CampoCalculo | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const operacao = obj.operacao;
  const operandos = obj.operandos;

  if (operacao !== "multiply" && operacao !== "add" && operacao !== "divide") return null;
  if (!Array.isArray(operandos) || operandos.length < 2) return null;
  if (operacao === "divide" && operandos.length !== 2) return null;

  const parsedOperandos = operandos.filter(
    (o): o is string => typeof o === "string" && o.length > 0
  );
  if (parsedOperandos.length < 2) return null;
  if (operacao === "divide" && parsedOperandos.length !== 2) return null;

  return {
    operacao,
    operandos: parsedOperandos,
  };
}

export function computeCampoCalculado(
  campo: Pick<TipoServicoCampo, "calculo" | "chave">,
  camposValores: Record<string, string | number | null | undefined>
): number | null {
  const calculo = parseCampoCalculo(campo.calculo);
  if (!calculo) return null;

  const valores = calculo.operandos.map((chave) => Number(camposValores[chave] ?? 0));
  if (valores.some((v) => !Number.isFinite(v))) return null;

  if (calculo.operacao === "divide") {
    const [dividendo, divisor] = valores;
    if (divisor === 0) return null;
    return dividendo / divisor;
  }

  if (calculo.operacao === "multiply") {
    return valores.reduce((acc, v) => acc * v, 1);
  }

  return valores.reduce((acc, v) => acc + v, 0);
}

export function enrichCamposValoresComCalculados(
  campos: TipoServicoCampo[],
  camposValores: Record<string, string | number | null | undefined>
): Record<string, number | string | null> {
  const result: Record<string, number | string | null> = {};
  for (const [k, v] of Object.entries(camposValores)) {
    result[k] = v ?? null;
  }

  for (const campo of campos) {
    if (campo.tipo_campo !== "calculated") continue;
    const computed = computeCampoCalculado(campo, camposValores);
    if (computed !== null) {
      result[campo.chave] = computed;
    }
  }

  return result;
}

export function formatCalculatedCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
