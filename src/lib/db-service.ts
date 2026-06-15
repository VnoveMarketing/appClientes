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
  uploadClienteLogo: (id: string, file: File) => apiClient.uploadClienteLogo(id, file),
  uploadClienteHeroImage: (id: string, file: File) => apiClient.uploadClienteHeroImage(id, file),

  getCaseCategorias: () => apiClient.getCaseCategorias(),
  addCaseCategoria: (payload: { nome: string }) => apiClient.addCaseCategoria(payload),
  updateCaseCategoria: (id: string, payload: { nome: string }) =>
    apiClient.updateCaseCategoria(id, payload),
  deleteCaseCategoria: (id: string) => apiClient.deleteCaseCategoria(id),

  getCases: (categoriaId?: string) => apiClient.getCases(categoriaId),
  addCase: (payload: Parameters<typeof apiClient.addCase>[0]) => apiClient.addCase(payload),
  updateCase: (id: string, payload: Parameters<typeof apiClient.updateCase>[1]) =>
    apiClient.updateCase(id, payload),
  deleteCase: (id: string) => apiClient.deleteCase(id),
  uploadCaseImagem: (file: File) => apiClient.uploadCaseImagem(file),

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
  getAdminContratoWithCliente: (id: string) => apiClient.getAdminContratoWithCliente(id),
  liberarContratoAssinatura: (id: string) => apiClient.liberarContratoAssinatura(id),
  revisarContrato: (
    id: string,
    updates: Parameters<typeof apiClient.revisarContrato>[1]
  ) => apiClient.revisarContrato(id, updates),
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
  trackPropostaVisualizada: (id: string) => apiClient.trackPropostaVisualizada(id),
  getPublicClienteForProposta: (id: string) => apiClient.getPublicClienteForProposta(id),
  acceptPublicProposta: (
    id: string,
    clientUpdates: Parameters<typeof apiClient.acceptPublicProposta>[1]
  ) => apiClient.acceptPublicProposta(id, clientUpdates),
  savePublicPropostaClienteDados: (
    id: string,
    dados: Parameters<typeof apiClient.savePublicPropostaClienteDados>[1]
  ) => apiClient.savePublicPropostaClienteDados(id, dados),
  getPublicContratoById: (id: string) => apiClient.getPublicContrato(id),
  getPublicContratoWithCliente: (id: string) => apiClient.getPublicContratoById(id),
  trackContratoAssinaturaIniciada: (id: string) => apiClient.trackContratoAssinaturaIniciada(id),
  getPublicClienteForContrato: (id: string) => apiClient.getPublicClienteForContrato(id),
  signPublicContrato: (
    id: string,
    evidencias: Parameters<typeof apiClient.signPublicContrato>[1]
  ) => apiClient.signPublicContrato(id, evidencias),

  getEscopoItens: (): Promise<EscopoItemCatalog[]> => apiClient.getEscopoItens(),
  addEscopoItem: (item: { nome: string; descricao: string }): Promise<EscopoItemCatalog> =>
    apiClient.addEscopoItem(item),
  lookupCnpj: (cnpj: string) => apiClient.lookupCnpj(cnpj),

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

  getUsuarios: () => apiClient.getUsuarios(),
  convidarUsuario: (payload: Parameters<typeof apiClient.convidarUsuario>[0]) =>
    apiClient.convidarUsuario(payload),
  updateUsuario: (id: string, updates: Parameters<typeof apiClient.updateUsuario>[1]) =>
    apiClient.updateUsuario(id, updates),
  reenviarConviteUsuario: (id: string) => apiClient.reenviarConviteUsuario(id),
  getTiposUsuario: () => apiClient.getTiposUsuario(),
  addTipoUsuario: (payload: Parameters<typeof apiClient.addTipoUsuario>[0]) =>
    apiClient.addTipoUsuario(payload),
  updateTipoUsuario: (id: string, payload: Parameters<typeof apiClient.updateTipoUsuario>[1]) =>
    apiClient.updateTipoUsuario(id, payload),
  deleteTipoUsuario: (id: string) => apiClient.deleteTipoUsuario(id),
  getPermissoes: () => apiClient.getPermissoes(),
  addPermissao: (payload: Parameters<typeof apiClient.addPermissao>[0]) =>
    apiClient.addPermissao(payload),
  updatePermissao: (id: string, payload: Parameters<typeof apiClient.updatePermissao>[1]) =>
    apiClient.updatePermissao(id, payload),
  deletePermissao: (id: string) => apiClient.deletePermissao(id),
};
