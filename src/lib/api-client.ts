import type { Cliente, Proposta, Contrato, EscopoItemCatalog } from "./types";

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

  signPublicContrato: (id: string): Promise<Contrato> =>
    apiFetch(`/api/public/contratos/${id}/assinar`, { method: "PATCH" }),

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
};
