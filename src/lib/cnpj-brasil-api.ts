export type BrasilApiCnpjResponse = {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnae_fiscal_descricao?: string | null;
  municipio?: string | null;
  uf?: string | null;
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  descricao_situacao_cadastral?: string | null;
  qsa?: Array<{
    nome_socio: string;
    qualificacao_socio: string;
  }>;
};

export type CnpjLookupResult = {
  empresa?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  ramo_atividade?: string;
  nome?: string;
  situacao_cadastral?: string;
};

export function stripCnpj(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnpjInput(value: string) {
  const digits = stripCnpj(value).slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function isCnpjComplete(value: string) {
  return stripCnpj(value).length === 14;
}

const BRASIL_API_CNPJ_URL = "https://brasilapi.com.br/api/cnpj/v1";

export async function fetchBrasilApiCnpj(digits: string) {
  const response = await fetch(`${BRASIL_API_CNPJ_URL}/${digits}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AgenciaVnove-CRM/1.0 (+https://vnove.com.br)",
    },
    cache: "no-store",
  });

  return response;
}

function formatTelefone(raw?: string | null) {
  if (!raw?.trim()) return undefined;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return raw.trim();
}

function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pickRepresentanteLegal(qsa?: BrasilApiCnpjResponse["qsa"]) {
  if (!qsa?.length) return undefined;

  const preferred = qsa.find((socio) =>
    /administrador|presidente|diretor|sócio|socio/i.test(socio.qualificacao_socio)
  );

  return titleCaseWords((preferred ?? qsa[0]).nome_socio);
}

export function mapBrasilApiCnpjToForm(data: BrasilApiCnpjResponse): CnpjLookupResult {
  const empresaBase =
    data.nome_fantasia?.trim() || data.razao_social?.trim() || undefined;

  return {
    empresa: empresaBase ? titleCaseWords(empresaBase) : undefined,
    cnpj: formatCnpjInput(data.cnpj),
    email: data.email?.trim() || undefined,
    telefone: formatTelefone(data.ddd_telefone_1 || data.ddd_telefone_2),
    cidade: data.municipio ? titleCaseWords(data.municipio) : undefined,
    estado: data.uf?.trim().toUpperCase().slice(0, 2) || undefined,
    ramo_atividade: data.cnae_fiscal_descricao?.trim() || undefined,
    nome: pickRepresentanteLegal(data.qsa),
    situacao_cadastral: data.descricao_situacao_cadastral?.trim() || undefined,
  };
}
