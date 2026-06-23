import type { SupabaseClient } from "@supabase/supabase-js";

export function formatPropostaIdentificador(seq: number, year = new Date().getFullYear()) {
  return `VN-${year}-${String(seq).padStart(4, "0")}`;
}

export function getPropostaIdentificadorDisplay(proposta: {
  identificador?: string | null;
  id?: string;
}) {
  const codigo = proposta.identificador?.trim();
  if (codigo) return codigo;
  if (proposta.id) {
    return proposta.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  }
  return "—";
}

export async function gerarIdentificadorProposta(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VN-${year}-`;

  const { count } = await supabase
    .from("propostas")
    .select("*", { count: "exact", head: true })
    .like("identificador", `${prefix}%`);

  let seq = (count ?? 0) + 1;

  for (let attempt = 0; attempt < 10; attempt++) {
    const identificador = formatPropostaIdentificador(seq, year);
    const { data: existing } = await supabase
      .from("propostas")
      .select("id")
      .eq("identificador", identificador)
      .maybeSingle();

    if (!existing) return identificador;
    seq++;
  }

  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}${suffix}`;
}
