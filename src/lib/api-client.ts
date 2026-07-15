import type {
  Cliente,
  Proposta,
  Contrato,
  EscopoItemCatalog,
  TipoServico,
  TipoServicoEntregavel,
  ContratoModelo,
  TipoUsuario,
  Permissao,
  UsuarioProfile,
  NivelPermissao,
  CaseCategoria,
  CasePortfolio,
} from "./types";
import type { ContratoAssinaturaEvidencias } from "./signature-audit";

type PublicPropostaResponse = {
  proposta: Proposta;
  cliente: Cliente | null;
  cases?: CasePortfolio[];
  tipo_servico?: TipoServico | null;
};
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

  uploadClienteLogo: (id: string, file: File): Promise<Cliente> => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`/api/clientes/${id}/logo`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Erro ${res.status}`);
      }
      return res.json();
    });
  },

  uploadClienteHeroImage: (id: string, file: File): Promise<Cliente> => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`/api/clientes/${id}/hero-image`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Erro ${res.status}`);
      }
      return res.json();
    });
  },

  // CASE CATEGORIAS
  getCaseCategorias: (): Promise<CaseCategoria[]> => apiFetch("/api/case-categorias"),

  addCaseCategoria: (payload: { nome: string }): Promise<CaseCategoria> =>
    apiFetch("/api/case-categorias", { method: "POST", body: JSON.stringify(payload) }),

  updateCaseCategoria: (id: string, payload: { nome: string }): Promise<CaseCategoria> =>
    apiFetch(`/api/case-categorias/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deleteCaseCategoria: (id: string): Promise<void> =>
    apiFetch(`/api/case-categorias/${id}`, { method: "DELETE" }),

  // CASES
  getCases: (categoriaId?: string): Promise<CasePortfolio[]> => {
    const qs = categoriaId ? `?categoria_id=${encodeURIComponent(categoriaId)}` : "";
    return apiFetch(`/api/cases${qs}`);
  },

  addCase: (payload: {
    nome: string;
    imagem_url: string;
    categoria_id: string;
    link?: string | null;
    ordem?: number;
    codigo?: string | null;
  }): Promise<CasePortfolio> =>
    apiFetch("/api/cases", { method: "POST", body: JSON.stringify(payload) }),

  updateCase: (
    id: string,
    payload: Partial<{
      nome: string;
      imagem_url: string;
      categoria_id: string;
      link: string | null;
      ordem: number;
      codigo: string | null;
    }>
  ): Promise<CasePortfolio> =>
    apiFetch(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deleteCase: (id: string): Promise<void> =>
    apiFetch(`/api/cases/${id}`, { method: "DELETE" }),

  uploadCaseImagem: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch("/api/cases/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Erro ${res.status}`);
      }
      return res.json();
    });
  },

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

  getAdminContratoWithCliente: async (
    id: string
  ): Promise<{ contrato: Contrato; cliente: Cliente | null } | null> => {
    try {
      return await apiFetch<{ contrato: Contrato; cliente: Cliente | null }>(
        `/api/contratos/${id}`
      );
    } catch (e) {
      if (String((e as Error).message).includes("404") || String((e as Error).message).includes("não encontrado")) {
        return null;
      }
      throw e;
    }
  },

  getContratoById: async (id: string): Promise<Contrato | null> => {
    try {
      const data = await apiFetch<{ contrato: Contrato; cliente: Cliente | null }>(
        `/api/contratos/${id}`
      );
      return data?.contrato ?? null;
    } catch (e) {
      if (String((e as Error).message).includes("404") || String((e as Error).message).includes("não encontrado")) {
        return null;
      }
      throw e;
    }
  },

  liberarContratoAssinatura: (id: string): Promise<Contrato> =>
    apiFetch(`/api/contratos/${id}/liberar-assinatura`, { method: "POST" }),

  revisarContrato: (
    id: string,
    updates: {
      valor_final_setup?: number;
      valor_final_mensal?: number;
      detalhes_financeiros?: string;
      conteudo_contrato?: string;
    }
  ): Promise<Contrato> =>
    apiFetch(`/api/contratos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
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

  deleteContrato: (id: string): Promise<void> =>
    apiFetch(`/api/contratos/${id}`, { method: "DELETE" }),

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

  trackPropostaVisualizada: (id: string): Promise<{ visualizada_em: string }> =>
    apiFetch(`/api/public/propostas/${id}/visualizar`, { method: "POST" }),

  trackContratoAssinaturaIniciada: (id: string): Promise<{ assinatura_iniciada_em: string }> =>
    apiFetch(`/api/public/contratos/${id}/iniciar-assinatura`, { method: "POST" }),

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
      representante_cpf: string;
      representante_email: string;
      endereco_rua: string;
      endereco_numero: string;
      endereco_complemento: string;
      cep: string;
    }
  ): Promise<Proposta> =>
    apiFetch(`/api/public/propostas/${id}/aceitar`, {
      method: "PATCH",
      body: JSON.stringify({ clientUpdates }),
    }),

  savePublicPropostaClienteDados: (
    id: string,
    dados: {
      empresa?: string;
      email?: string;
      telefone?: string;
      cnpj?: string;
      ramo_atividade?: string;
      cidade?: string;
      estado?: string;
      nome?: string;
      representante_cpf?: string;
      representante_email?: string;
      endereco_rua?: string;
      endereco_numero?: string;
      endereco_complemento?: string;
      cep?: string;
    }
  ) =>
    apiFetch<Cliente>(`/api/public/propostas/${id}/cliente-dados`, {
      method: "PATCH",
      body: JSON.stringify(dados),
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

  // CNPJ
  lookupCnpj: (cnpj: string) =>
    apiFetch<{
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
    }>(`/api/public/cnpj/${encodeURIComponent(cnpj.replace(/\D/g, ""))}`),

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

  // USUÁRIOS E PERMISSÕES
  getUsuarios: (): Promise<UsuarioProfile[]> => apiFetch("/api/usuarios"),

  convidarUsuario: (payload: {
    email: string;
    full_name: string;
    tipo_usuario_id: string;
  }): Promise<UsuarioProfile & { message?: string }> =>
    apiFetch("/api/usuarios", { method: "POST", body: JSON.stringify(payload) }),

  updateUsuario: (
    id: string,
    updates: Partial<Pick<UsuarioProfile, "full_name" | "tipo_usuario_id" | "nivel_permissao" | "ativo">>
  ): Promise<UsuarioProfile> =>
    apiFetch(`/api/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),

  reenviarConviteUsuario: (id: string): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/api/usuarios/${id}/reenviar-convite`, { method: "POST" }),

  deleteUsuario: (id: string): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/api/usuarios/${id}`, { method: "DELETE" }),

  getTiposUsuario: (): Promise<TipoUsuario[]> => apiFetch("/api/tipos-usuario"),

  addTipoUsuario: (payload: {
    nome: string;
    slug: string;
    descricao?: string;
    ordem?: number;
    ativo?: boolean;
    permissoes?: { permissao_id: string; nivel: NivelPermissao }[];
  }): Promise<TipoUsuario> =>
    apiFetch("/api/tipos-usuario", { method: "POST", body: JSON.stringify(payload) }),

  updateTipoUsuario: (
    id: string,
    payload: {
      nome: string;
      slug: string;
      descricao?: string;
      ordem?: number;
      ativo?: boolean;
      permissoes?: { permissao_id: string; nivel: NivelPermissao }[];
    }
  ): Promise<TipoUsuario> =>
    apiFetch(`/api/tipos-usuario/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deleteTipoUsuario: (id: string): Promise<void> =>
    apiFetch(`/api/tipos-usuario/${id}`, { method: "DELETE" }),

  getPermissoes: (): Promise<Permissao[]> => apiFetch("/api/permissoes"),

  addPermissao: (payload: {
    chave: string;
    nome: string;
    descricao?: string;
    modulo: string;
  }): Promise<Permissao> =>
    apiFetch("/api/permissoes", { method: "POST", body: JSON.stringify(payload) }),

  updatePermissao: (
    id: string,
    payload: Partial<{ chave: string; nome: string; descricao: string; modulo: string }>
  ): Promise<Permissao> =>
    apiFetch(`/api/permissoes/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deletePermissao: (id: string): Promise<void> =>
    apiFetch(`/api/permissoes/${id}`, { method: "DELETE" }),
};
