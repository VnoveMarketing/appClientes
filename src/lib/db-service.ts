import { supabase } from "./supabase-client";
import { dbMock, Cliente, Proposta, Contrato } from "./db-mock";

// Database Service that dynamically switches between Supabase and LocalStorage Mock based on env availability
export const dbService = {
  // CLIENTES
  async getClientes(): Promise<Cliente[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return dbMock.getClientes();
  },

  async addCliente(cliente: Omit<Cliente, "id" | "cliente_desde" | "created_at">): Promise<Cliente> {
    if (supabase) {
      const { data, error } = await supabase
        .from("clientes")
        .insert([cliente])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return dbMock.addCliente(cliente);
  },

  async updateCliente(id: string, updates: Partial<Cliente>): Promise<Cliente> {
    if (supabase) {
      const { data, error } = await supabase
        .from("clientes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return dbMock.updateCliente(id, updates);
  },

  async deleteCliente(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    return dbMock.deleteCliente(id);
  },

  // PROPOSTAS
  async getPropostas(): Promise<Proposta[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return dbMock.getPropostas();
  },

  async getPropostaById(id: string): Promise<Proposta | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    const propostas = dbMock.getPropostas();
    return propostas.find((p) => p.id === id) || null;
  },

  async addProposta(proposta: Omit<Proposta, "id" | "created_at">): Promise<Proposta> {
    if (supabase) {
      const { data, error } = await supabase
        .from("propostas")
        .insert([proposta])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return dbMock.addProposta(proposta);
  },

  async updateProposta(id: string, updates: Partial<Proposta>): Promise<Proposta> {
    if (supabase) {
      const { data, error } = await supabase
        .from("propostas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return dbMock.updateProposta(id, updates);
  },

  async deleteProposta(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("propostas").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    return dbMock.deleteProposta(id);
  },

  // CONTRATOS
  async getContratos(): Promise<Contrato[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return dbMock.getContratos();
  },

  async getContratoById(id: string): Promise<Contrato | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    const contratos = dbMock.getContratos();
    return contratos.find((c) => c.id === id) || null;
  },

  async getContratoByPropostaId(propostaId: string): Promise<Contrato | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("proposta_id", propostaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    const contratos = dbMock.getContratos();
    return contratos.find((c) => c.proposta_id === propostaId) || null;
  },

  async addContrato(contrato: Omit<Contrato, "id" | "created_at">): Promise<Contrato> {
    if (supabase) {
      const { data, error } = await supabase
        .from("contratos")
        .insert([contrato])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return dbMock.addContrato(contrato);
  },

  async updateContrato(id: string, updates: Partial<Contrato>): Promise<Contrato> {
    if (supabase) {
      const { data, error } = await supabase
        .from("contratos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return dbMock.updateContrato(id, updates);
  }
};
