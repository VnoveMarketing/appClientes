export interface CaseCategoria {
  id: string;
  nome: string;
  created_at: string;
}

export interface CasePortfolio {
  id: string;
  nome: string;
  imagem_url: string;
  categoria_id: string;
  link?: string | null;
  ordem: number;
  created_at: string;
  case_categorias?: Pick<CaseCategoria, "id" | "nome"> | null;
}

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
}
