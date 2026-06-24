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
  descricao_tipo_de_logradouro?: string | null;
  descricao_tipo_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | number | null;
  complemento?: string | null;
  cep?: string | number | null;
  bairro?: string | null;
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
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  cep?: string;
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

export function isCnpjValid(value: string) {
  const digits = stripCnpj(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => {
      return total + Number(base[index]) * weight;
    }, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstDigit !== Number(digits[12])) return false;

  const secondDigit = calcDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return secondDigit === Number(digits[13]);
}

const BRASIL_API_CNPJ_URL = "https://brasilapi.com.br/api/cnpj/v1";
const BRASIL_API_CEP_URL = "https://brasilapi.com.br/api/cep/v1";

const BRASIL_API_HEADERS = {
  Accept: "application/json",
  "User-Agent": "AgenciaVnove-CRM/1.0 (+https://vnove.com.br)",
};

function extractNumeroFromText(text: string): { rua: string; numero?: string } {
  const trimmed = text.trim();
  const patterns = [
    /^(.+?),\s*n?[º°o.]?\s*(\d+[\w\-]*)\s*$/i,
    /^(.+?)\s+n[º°o.]?\s*(\d+[\w\-]*)\s*$/i,
    /^(.+?)\s+(\d+[\w\-]*)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { rua: match[1].trim(), numero: match[2].trim() };
    }
  }

  return { rua: trimmed };
}

function resolveEnderecoFromCnpj(data: BrasilApiCnpjResponse) {
  const numeroReceita = formatNumeroEndereco(data.numero);
  let enderecoRua = buildEnderecoRua(data);
  let enderecoNumero = numeroReceita;

  const logradouroBruto = data.logradouro?.trim() ?? "";
  if (!enderecoNumero && logradouroBruto) {
    const extraido = extractNumeroFromText(logradouroBruto);
    if (extraido.numero) {
      enderecoNumero = extraido.numero;
      if (!enderecoRua) {
        const tipo = (data.descricao_tipo_de_logradouro ?? data.descricao_tipo_logradouro)?.trim();
        enderecoRua = titleCaseWords(
          tipo ? `${tipo} ${extraido.rua}` : extraido.rua
        );
      }
    }
  }

  return { enderecoRua, enderecoNumero };
}

async function fetchWithRetry(getResponse: () => Promise<Response>, retries = 2) {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await getResponse();
    lastResponse = response;

    if (response.ok || response.status === 404) return response;
    if (![429, 502, 503, 504].includes(response.status)) return response;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }

  return lastResponse!;
}

export async function fetchBrasilApiCnpj(digits: string) {
  return fetchWithRetry(() =>
    fetch(`${BRASIL_API_CNPJ_URL}/${digits}`, {
      headers: BRASIL_API_HEADERS,
      cache: "no-store",
    })
  );
}

type BrasilApiCepResponse = {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
};

export async function fetchBrasilApiCep(digits: string) {
  return fetchWithRetry(() =>
    fetch(`${BRASIL_API_CEP_URL}/${digits}`, {
      headers: BRASIL_API_HEADERS,
      cache: "no-store",
    })
  );
}

export async function enrichCnpjLookupWithCep(
  lookup: CnpjLookupResult
): Promise<CnpjLookupResult> {
  if (lookup.endereco_rua?.trim()) return lookup;

  const cepDigits = (lookup.cep ?? "").replace(/\D/g, "");
  if (cepDigits.length !== 8) return lookup;

  try {
    const response = await fetchBrasilApiCep(cepDigits);
    if (!response.ok) return lookup;

    const data = (await response.json()) as BrasilApiCepResponse;

    return {
      ...lookup,
      endereco_rua: data.street?.trim() ? titleCaseWords(data.street.trim()) : lookup.endereco_rua,
      cidade: lookup.cidade ?? (data.city?.trim() ? titleCaseWords(data.city.trim()) : undefined),
      estado: lookup.estado ?? data.state?.trim().toUpperCase().slice(0, 2),
      endereco_complemento:
        lookup.endereco_complemento ??
        (data.neighborhood?.trim() ? titleCaseWords(data.neighborhood.trim()) : undefined),
    };
  } catch {
    return lookup;
  }
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

export function formatCepInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildEnderecoRua(data: BrasilApiCnpjResponse) {
  const tipo = (
    data.descricao_tipo_de_logradouro ?? data.descricao_tipo_logradouro
  )?.trim();
  const logradouro = data.logradouro?.trim();
  if (tipo && logradouro) return titleCaseWords(`${tipo} ${logradouro}`);
  if (logradouro) return titleCaseWords(logradouro);
  return undefined;
}

function formatNumeroEndereco(value: string | number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const upper = text.toUpperCase();
  if (upper === "S/N" || upper === "SN" || upper === "S N") return undefined;
  return text;
}

export function mapBrasilApiCnpjToForm(data: BrasilApiCnpjResponse): CnpjLookupResult {
  const empresaBase =
    data.nome_fantasia?.trim() || data.razao_social?.trim() || undefined;

  const cepRaw = data.cep != null ? String(data.cep).replace(/\D/g, "") : "";
  const { enderecoRua, enderecoNumero } = resolveEnderecoFromCnpj(data);

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
    endereco_rua: enderecoRua,
    endereco_numero: enderecoNumero,
    endereco_complemento: data.complemento?.trim()
      ? titleCaseWords(data.complemento.trim())
      : data.bairro?.trim()
        ? titleCaseWords(data.bairro.trim())
        : undefined,
    cep: cepRaw ? formatCepInput(cepRaw) : undefined,
  };
}
