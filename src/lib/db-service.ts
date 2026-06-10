import { apiClient } from "./api-client";
import { Cliente, Proposta, Contrato, EscopoItemCatalog } from "./types";

export type { Cliente, Proposta, Contrato };

export const dbService = {
  getClientes: () => apiClient.getClientes(),
  addCliente: (cliente: Omit<Cliente, "id" | "cliente_desde" | "created_at">) =>
    apiClient.addCliente(cliente),
  updateCliente: (id: string, updates: Partial<Cliente>) =>
    apiClient.updateCliente(id, updates),
  deleteCliente: (id: string) => apiClient.deleteCliente(id),

  getPropostas: () => apiClient.getPropostas(),
  getPropostaById: (id: string) => apiClient.getPropostaById(id),
  addProposta: (proposta: Omit<Proposta, "id" | "created_at">) =>
    apiClient.addProposta(proposta),
  updateProposta: (id: string, updates: Partial<Proposta>) =>
    apiClient.updateProposta(id, updates),
  deleteProposta: (id: string) => apiClient.deleteProposta(id),

  getContratos: () => apiClient.getContratos(),
  getContratoById: (id: string) => apiClient.getContratoById(id),
  getContratoByPropostaId: (propostaId: string) =>
    apiClient.getContratoByPropostaId(propostaId),
  addContrato: (contrato: Omit<Contrato, "id" | "created_at">) =>
    apiClient.addContrato(contrato),
  updateContrato: (id: string, updates: Partial<Contrato>) =>
    apiClient.updateContrato(id, updates),

  // Public pages
  getPublicPropostaById: (id: string) => apiClient.getPublicProposta(id),
  getPublicPropostaWithCliente: (id: string) => apiClient.getPublicPropostaById(id),
  getPublicClienteForProposta: (id: string) => apiClient.getPublicClienteForProposta(id),
  acceptPublicProposta: (
    id: string,
    clientUpdates: Parameters<typeof apiClient.acceptPublicProposta>[1]
  ) => apiClient.acceptPublicProposta(id, clientUpdates),
  getPublicContratoById: (id: string) => apiClient.getPublicContrato(id),
  getPublicContratoWithCliente: (id: string) => apiClient.getPublicContratoById(id),
  getPublicClienteForContrato: (id: string) => apiClient.getPublicClienteForContrato(id),
  signPublicContrato: (id: string) => apiClient.signPublicContrato(id),

  getEscopoItens: (): Promise<EscopoItemCatalog[]> => apiClient.getEscopoItens(),
  addEscopoItem: (item: { nome: string; descricao: string }): Promise<EscopoItemCatalog> =>
    apiClient.addEscopoItem(item),
  extractCartaoSocial: (file: string) => apiClient.extractCartaoSocial(file),
};
