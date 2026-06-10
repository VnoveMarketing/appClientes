// Mock Database saved in LocalStorage for offline/sandbox testing

import type { EscopoItemRef } from "./escopo";

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  ramo_atividade?: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  status: 'Ativa' | 'Bloqueada' | 'Pendente';
  assinatura: 'active' | 'canceled';
  cliente_desde: string;
  created_at: string;
}

export interface Proposta {
  id: string;
  cliente_id: string;
  setup: number;
  mensalidade: number;
  desconto_setup: number; // 0 to 100
  desconto_mensalidade: number; // 0 to 100
  duracao: number; // months
  condicao_descricao: string;
  escopo: EscopoItemRef[] | string[];
  escopo_descricao_adicional?: string;
  status: 'pendente' | 'aceita' | 'em_analise' | 'contrato_gerado';
  created_at: string;
}

export interface Contrato {
  id: string;
  proposta_id: string;
  cliente_id: string;
  status: 'pendente_financeiro' | 'pendente_assinatura' | 'assinado';
  valor_final_setup: number;
  valor_final_mensal: number;
  detalhes_financeiros: string;
  conteudo_contrato: string;
  assinado_em?: string;
  created_at: string;
}

const SEED_CLIENTES: Cliente[] = [
  {
    id: "c1",
    nome: "Luis Vicentini",
    email: "agencia+bume@vnove.com.br",
    telefone: "(19) 3713-8001",
    empresa: "VNOVE",
    status: "Ativa",
    assinatura: "active",
    cliente_desde: "2026-03-09T12:00:00Z",
    created_at: "2026-03-09T12:00:00Z"
  },
  {
    id: "c2",
    nome: "Mariana F Rodrigues",
    email: "contato@resolvaja.com.br",
    telefone: "(11) 98765-4321",
    empresa: "Resolva Já",
    status: "Ativa",
    assinatura: "active",
    cliente_desde: "2025-09-01T12:00:00Z",
    created_at: "2025-09-01T12:00:00Z"
  },
  {
    id: "c3",
    nome: "Carlos Eduardo",
    email: "diretoria@casadascamisas.com",
    telefone: "(21) 99999-8888",
    empresa: "Casa das Camisas",
    status: "Bloqueada",
    assinatura: "active",
    cliente_desde: "2025-10-07T12:00:00Z",
    created_at: "2025-10-07T12:00:00Z"
  },
  {
    id: "c4",
    nome: "LZ Academy",
    email: "suporte@lzacademy.com.br",
    telefone: "(19) 98888-7777",
    empresa: "LZ Academy",
    status: "Ativa",
    assinatura: "active",
    cliente_desde: "2025-10-08T12:00:00Z",
    created_at: "2025-10-08T12:00:00Z"
  },
  {
    id: "c5",
    nome: "Luis Henrique Vicentini",
    email: "teste@lhblue.com",
    telefone: "(19) 97777-6666",
    empresa: "LH Blue Sales Teste",
    status: "Bloqueada",
    assinatura: "canceled",
    cliente_desde: "2026-03-16T12:00:00Z",
    created_at: "2026-03-16T12:00:00Z"
  }
];

const SEED_PROPOSTAS: Proposta[] = [
  {
    id: "p1",
    cliente_id: "c1",
    setup: 5000,
    mensalidade: 3988,
    desconto_setup: 0,
    desconto_mensalidade: 0,
    duracao: 12,
    condicao_descricao: "Devido a parceria vigente com o Colégio Trilha",
    escopo: ["CRM", "Funis de vendas", "Chat ao vivo", "API oficial do Whatsapp", "Automação de fluxos", "Integrações"],
    status: "contrato_gerado",
    created_at: "2026-05-25T14:30:00Z"
  },
  {
    id: "p2",
    cliente_id: "c2",
    setup: 10000,
    mensalidade: 3988,
    desconto_setup: 0,
    desconto_mensalidade: 0,
    duracao: 12,
    condicao_descricao: "Devido a parceria, estamos ofertando desconto progressivo",
    escopo: ["CRM", "Funis de vendas", "API oficial do Whatsapp", "Automação de fluxos"],
    status: "aceita",
    created_at: "2026-04-30T10:15:00Z"
  },
  {
    id: "p3",
    cliente_id: "c3",
    setup: 5000,
    mensalidade: 1994,
    desconto_setup: 50,
    desconto_mensalidade: 0,
    duracao: 6,
    condicao_descricao: "Desconto de 50% no setup da implantação",
    escopo: ["CRM", "Chat ao vivo", "Integrações"],
    status: "pendente",
    created_at: "2026-04-26T16:00:00Z"
  }
];

const SEED_CONTRATOS: Contrato[] = [
  {
    id: "co1",
    proposta_id: "p1",
    cliente_id: "c1",
    status: "assinado",
    valor_final_setup: 5000,
    valor_final_mensal: 3988,
    detalhes_financeiros: "Pagamento do setup em 2x no boleto bancário.",
    conteudo_contrato: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL\n\nCONTRATANTE: VNOVE\nCONTRATADA: Agencia V9nove\n\nObjeto: Prestação de serviços de CRM, Funis de vendas, Chat ao vivo, e API de WhatsApp.\n\nValores:\nSetup: R$ 5.000,00\nMensalidade: R$ 3.988,00 mensais por 12 meses.",
    assinado_em: "2026-05-26T09:00:00Z",
    created_at: "2026-05-25T16:00:00Z"
  }
];

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(item);
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const dbMock = {
  getClientes: (): Cliente[] => getStorageItem("v9_clientes", SEED_CLIENTES),
  saveClientes: (data: Cliente[]) => setStorageItem("v9_clientes", data),
  
  getPropostas: (): Proposta[] => getStorageItem("v9_propostas", SEED_PROPOSTAS),
  savePropostas: (data: Proposta[]) => setStorageItem("v9_propostas", data),
  
  getContratos: (): Contrato[] => getStorageItem("v9_contratos", SEED_CONTRATOS),
  saveContratos: (data: Contrato[]) => setStorageItem("v9_contratos", data),

  // Operations
  addCliente: (cliente: Omit<Cliente, "id" | "cliente_desde" | "created_at">): Cliente => {
    const data = dbMock.getClientes();
    const newCliente: Cliente = {
      ...cliente,
      id: "c_" + Math.random().toString(36).substring(2, 9),
      cliente_desde: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    data.push(newCliente);
    dbMock.saveClientes(data);
    return newCliente;
  },

  updateCliente: (id: string, updates: Partial<Cliente>): Cliente => {
    const data = dbMock.getClientes();
    const index = data.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Cliente não encontrado");
    data[index] = { ...data[index], ...updates };
    dbMock.saveClientes(data);
    return data[index];
  },

  deleteCliente: (id: string): void => {
    const data = dbMock.getClientes().filter(c => c.id !== id);
    dbMock.saveClientes(data);
    // cascade delete proposals
    const props = dbMock.getPropostas().filter(p => p.cliente_id !== id);
    dbMock.savePropostas(props);
    // cascade delete contracts
    const contrs = dbMock.getContratos().filter(co => co.cliente_id !== id);
    dbMock.saveContratos(contrs);
  },

  addProposta: (proposta: Omit<Proposta, "id" | "created_at">): Proposta => {
    const data = dbMock.getPropostas();
    const newProposta: Proposta = {
      ...proposta,
      id: "p_" + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString()
    };
    data.push(newProposta);
    dbMock.savePropostas(data);
    return newProposta;
  },

  updateProposta: (id: string, updates: Partial<Proposta>): Proposta => {
    const data = dbMock.getPropostas();
    const index = data.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Proposta não encontrada");
    data[index] = { ...data[index], ...updates };
    dbMock.savePropostas(data);
    return data[index];
  },

  deleteProposta: (id: string): void => {
    const data = dbMock.getPropostas().filter(p => p.id !== id);
    dbMock.savePropostas(data);
    // cascade delete contracts
    const contrs = dbMock.getContratos().filter(co => co.proposta_id !== id);
    dbMock.saveContratos(contrs);
  },

  addContrato: (contrato: Omit<Contrato, "id" | "created_at">): Contrato => {
    const data = dbMock.getContratos();
    const newContrato: Contrato = {
      ...contrato,
      id: "co_" + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString()
    };
    data.push(newContrato);
    dbMock.saveContratos(data);
    return newContrato;
  },

  updateContrato: (id: string, updates: Partial<Contrato>): Contrato => {
    const data = dbMock.getContratos();
    const index = data.findIndex(co => co.id === id);
    if (index === -1) throw new Error("Contrato não encontrado");
    data[index] = { ...data[index], ...updates };
    dbMock.saveContratos(data);
    return data[index];
  }
};
