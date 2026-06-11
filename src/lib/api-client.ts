import type {
  Cliente,
  Proposta,
  Contrato,
  EscopoItemCatalog,
  TipoServico,
  TipoServicoEntregavel,
  ContratoModelo,
} from "./types";
import type { ContratoAssinaturaEvidencias } from "./signature-audit";

type PublicPropostaResponse = { proposta: Proposta; cliente: Cliente | null };
type PublicContratoResponse = { contrato: Contrato; cliente: Cliente | null };

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.error ?? body;
    } catch {
      // keep raw body
    }
    throw new Error(message || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  // CLIENTES
  getClientes: (): Promise<Cliente[]> => apiFetch("/api/clientes"),

  addCliente: (
    cliente: Omit<Cliente, "id" | "cliente_desde" | "created_at">
  ): Promise<Cliente> =>
    apiFetch("/api/clientes", { method: "POST", body: JSON.stringify(cliente) }),

  updateCliente: (id: string, updates: Partial<Cliente>): Promise<Cliente> =>
    apiFetch(`/api/clientes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteCliente: (id: string): Promise<void> =>
    apiFetch(`/api/clientes/${id}`, { method: "DELETE" }),

  // PROPOSTAS
  getPropostas: (): Promise<Proposta[]> => apiFetch("/api/propostas"),

  getPropostaById: (id: string): Promise<Proposta | null> =>
    apiFetch<Proposta>(`/api/propostas/${id}`).catch((e) => {
      if (String(e.message).includes("404") || String(e.message).includes("não encontrada")) {
        return null;
      }
      throw e;
    }),

  addProposta: (
    proposta: Omit<Proposta, "id" | "created_at">
  ): Promise<Proposta> =>
    apiFetch("/api/propostas", { method: "POST", body: JSON.stringify(proposta) }),

  updateProposta: (id: string, updates: Partial<Proposta>): Promise<Proposta> =>
    apiFetch(`/api/propostas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteProposta: (id: string): Promise<void> =>
    apiFetch(`/api/propostas/${id}`, { method: "DELETE" }),

  enviarPropostaEmail: (id: string): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/api/propostas/${id}/enviar-email`, { method: "POST" }),

  // CONTRATOS
  getContratos: (): Promise<Contrato[]> => apiFetch("/api/contratos"),

  getContratoById: (id: string): Promise<Contrato | null> =>
    apiFetch<Contrato>(`/api/contratos/${id}`).catch((e) => {
      if (String(e.message).includes("404") || String(e.message).includes("não encontrado")) {
        return null;
      }
      throw e;
    }),

  getContratoByPropostaId: (propostaId: string): Promise<Contrato | null> =>
    apiFetch<Contrato | null>(`/api/contratos/by-proposta/${propostaId}`),

  addContrato: (
    contrato: Omit<Contrato, "id" | "created_at">
  ): Promise<Contrato> =>
    apiFetch("/api/contratos", { method: "POST", body: JSON.stringify(contrato) }),

  updateContrato: (id: string, updates: Partial<Contrato>): Promise<Contrato> =>
    apiFetch(`/api/contratos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  getContratoEvidencias: (id: string): Promise<ContratoAssinaturaEvidencias> =>
    apiFetch(`/api/contratos/${id}/evidencias`),

  // PUBLIC
  getPublicPropostaById: async (id: string): Promise<PublicPropostaResponse | null> => {
    try {
      return await apiFetch<PublicPropostaResponse>(`/api/public/propostas/${id}`);
    } catch (e) {
      if (String((e as Error).message).includes("404") || String((e as Error).message).includes("não encontrada")) {
        return null;
      }
      throw e;
    }
  },

  getPublicProposta: async (id: string): Promise<Proposta | null> => {
    const data = await apiClient.getPublicPropostaById(id);
    return data?.proposta ?? null;
  },

  getPublicClienteForProposta: async (id: string): Promise<Cliente | null> => {
    const data = await apiClient.getPublicPropostaById(id);
    return data?.cliente ?? null;
  },

  acceptPublicProposta: (
    id: string,
    clientUpdates: {
      empresa: string;
      email: string;
      telefone: string;
      cnpj: string;
      ramo_atividade: string;
      cidade: string;
      estado: string;
      nome: string;
    }
  ): Promise<Proposta> =>
    apiFetch(`/api/public/propostas/${id}/aceitar`, {
      method: "PATCH",
      body: JSON.stringify({ clientUpdates }),
    }),

  getPublicContratoById: async (id: string): Promise<PublicContratoResponse | null> => {
    try {
      return await apiFetch<PublicContratoResponse>(`/api/public/contratos/${id}`);
    } catch (e) {
      if (String((e as Error).message).includes("404") || String((e as Error).message).includes("não encontrado")) {
        return null;
      }
      throw e;
    }
  },

  getPublicContrato: async (id: string): Promise<Contrato | null> => {
    const data = await apiClient.getPublicContratoById(id);
    return data?.contrato ?? null;
  },

  getPublicClienteForContrato: async (id: string): Promise<Cliente | null> => {
    const data = await apiClient.getPublicContratoById(id);
    return data?.cliente ?? null;
  },

  signPublicContrato: (
    id: string,
    evidencias: {
      signatario_nome: string;
      signatario_cpf: string;
      signatario_email: string;
      signatario_telefone?: string;
      signatario_cnpj?: string;
      user_agent?: string;
      geo_latitude?: number | null;
      geo_longitude?: number | null;
      geo_precisao?: number | null;
      geo_fonte?: string | null;
      assinatura_tipo: "draw" | "type";
      assinatura_conteudo: string;
      otp_token_id?: string | null;
      otp_validado?: boolean;
    }
  ): Promise<Contrato> =>
    apiFetch(`/api/public/contratos/${id}/assinar`, {
      method: "PATCH",
      body: JSON.stringify(evidencias),
    }),

  // ESCOPO
  getEscopoItens: (): Promise<EscopoItemCatalog[]> =>
    apiFetch("/api/escopo-itens"),

  addEscopoItem: (item: { nome: string; descricao: string }): Promise<EscopoItemCatalog> =>
    apiFetch("/api/escopo-itens", {
      method: "POST",
      body: JSON.stringify(item),
    }),

  // AI
  extractCartaoSocial: (file: string) =>
    apiFetch<{
      empresa?: string;
      cnpj?: string;
      email?: string;
      telefone?: string;
      cidade?: string;
      estado?: string;
      ramo_atividade?: string;
      nome?: string;
    }>("/api/public/extract-cartao-social", {
      method: "POST",
      body: JSON.stringify({ file }),
    }),

  // TIPOS DE SERVIÇO
  getTiposServico: (): Promise<TipoServico[]> => apiFetch("/api/tipos-servico"),

  addTipoServico: (payload: {
    nome: string;
    descricao?: string;
    campos?: Array<{
      chave: string;
      label: string;
      tipo_campo?: string;
      ordem?: number;
      obrigatorio?: boolean;
      placeholder?: string;
    }>;
    entregaveis?: Array<{ nome: string; descricao?: string; ordem?: number }>;
  }): Promise<TipoServico> =>
    apiFetch("/api/tipos-servico", { method: "POST", body: JSON.stringify(payload) }),

  updateTipoServico: (
    id: string,
    payload: {
      nome?: string;
      descricao?: string;
      campos?: Array<{
        chave: string;
        label: string;
        tipo_campo?: string;
        ordem?: number;
        obrigatorio?: boolean;
        placeholder?: string;
      }>;
      entregaveis?: Array<{ nome: string; descricao?: string; ordem?: number }>;
    }
  ): Promise<TipoServico> =>
    apiFetch(`/api/tipos-servico/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deleteTipoServico: (id: string): Promise<void> =>
    apiFetch(`/api/tipos-servico/${id}`, { method: "DELETE" }),

  addEntregavelTipo: (
    tipoId: string,
    item: { nome: string; descricao?: string; ordem?: number }
  ): Promise<TipoServicoEntregavel> =>
    apiFetch(`/api/tipos-servico/${tipoId}/entregaveis`, {
      method: "POST",
      body: JSON.stringify(item),
    }),

  deleteEntregavelTipo: (tipoId: string, entregavelId: string) =>
    apiFetch(`/api/tipos-servico/${tipoId}/entregaveis?entregavelId=${entregavelId}`, {
      method: "DELETE",
    }),

  // CONTRATO MODELOS
  getContratoModelos: (): Promise<ContratoModelo[]> => apiFetch("/api/contrato-modelos"),

  addContratoModelo: (payload: {
    nome: string;
    conteudo_template?: string;
    arquivo_url?: string | null;
    arquivo_nome?: string | null;
    mime_type?: string | null;
    ativo?: boolean;
  }): Promise<ContratoModelo> =>
    apiFetch("/api/contrato-modelos", { method: "POST", body: JSON.stringify(payload) }),

  updateContratoModelo: (id: string, updates: Partial<ContratoModelo>): Promise<ContratoModelo> =>
    apiFetch(`/api/contrato-modelos/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),

  deleteContratoModelo: (id: string): Promise<void> =>
    apiFetch(`/api/contrato-modelos/${id}`, { method: "DELETE" }),

  uploadContratoModelo: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/contrato-modelos/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Erro ${res.status}`);
    }
    return res.json() as Promise<{
      conteudo_template: string;
      arquivo_nome: string;
      mime_type: string | null;
    }>;
  },
};
