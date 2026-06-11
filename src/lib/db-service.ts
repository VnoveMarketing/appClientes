import { apiClient } from "./api-client";
import { Cliente, Proposta, Contrato, EscopoItemCatalog, TipoServico, ContratoModelo } from "./types";

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
  enviarPropostaEmail: (id: string) => apiClient.enviarPropostaEmail(id),

  getContratos: () => apiClient.getContratos(),
  getContratoById: (id: string) => apiClient.getContratoById(id),
  getContratoByPropostaId: (propostaId: string) =>
    apiClient.getContratoByPropostaId(propostaId),
  addContrato: (contrato: Omit<Contrato, "id" | "created_at">) =>
    apiClient.addContrato(contrato),
  updateContrato: (id: string, updates: Partial<Contrato>) =>
    apiClient.updateContrato(id, updates),
  getContratoEvidencias: (id: string) => apiClient.getContratoEvidencias(id),

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
  signPublicContrato: (
    id: string,
    evidencias: Parameters<typeof apiClient.signPublicContrato>[1]
  ) => apiClient.signPublicContrato(id, evidencias),

  getEscopoItens: (): Promise<EscopoItemCatalog[]> => apiClient.getEscopoItens(),
  addEscopoItem: (item: { nome: string; descricao: string }): Promise<EscopoItemCatalog> =>
    apiClient.addEscopoItem(item),
  extractCartaoSocial: (file: string) => apiClient.extractCartaoSocial(file),

  getTiposServico: (): Promise<TipoServico[]> => apiClient.getTiposServico(),
  addTipoServico: (payload: Parameters<typeof apiClient.addTipoServico>[0]) =>
    apiClient.addTipoServico(payload),
  updateTipoServico: (
    id: string,
    payload: Parameters<typeof apiClient.updateTipoServico>[1]
  ) => apiClient.updateTipoServico(id, payload),
  deleteTipoServico: (id: string) => apiClient.deleteTipoServico(id),
  addEntregavelTipo: (
    tipoId: string,
    item: Parameters<typeof apiClient.addEntregavelTipo>[1]
  ) => apiClient.addEntregavelTipo(tipoId, item),
  deleteEntregavelTipo: (tipoId: string, entregavelId: string) =>
    apiClient.deleteEntregavelTipo(tipoId, entregavelId),

  getContratoModelos: (): Promise<ContratoModelo[]> => apiClient.getContratoModelos(),
  addContratoModelo: (payload: Parameters<typeof apiClient.addContratoModelo>[0]) =>
    apiClient.addContratoModelo(payload),
  updateContratoModelo: (id: string, updates: Partial<ContratoModelo>) =>
    apiClient.updateContratoModelo(id, updates),
  deleteContratoModelo: (id: string) => apiClient.deleteContratoModelo(id),
  uploadContratoModelo: (file: File) => apiClient.uploadContratoModelo(file),
};
