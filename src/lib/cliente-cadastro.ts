import { isCnpjComplete, stripCnpj } from "@/lib/cnpj-brasil-api";

export type ClienteCadastroPublico = {
  empresa?: string;
  email?: string;
  telefone?: string;
  cnpj?: string;
  ramo_atividade?: string;
  cidade?: string;
  estado?: string;
  nome?: string;
};

export function clienteTemCadastroCnpj(
  client: {
    cnpj?: string | null;
    empresa?: string | null;
    cidade?: string | null;
    estado?: string | null;
  },
  digits?: string
) {
  const cnpjDigits = stripCnpj(client.cnpj ?? "");
  if (!isCnpjComplete(cnpjDigits)) return false;
  if (digits && cnpjDigits !== digits) return false;

  return Boolean(
    client.empresa?.trim() && client.cidade?.trim() && client.estado?.trim()
  );
}

export function buildClienteDadosFromCnpjLookup(
  lookup: ClienteCadastroPublico
): ClienteCadastroPublico {
  const updates: ClienteCadastroPublico = {};

  if (lookup.empresa?.trim()) updates.empresa = lookup.empresa.trim();
  if (lookup.cnpj?.trim()) updates.cnpj = lookup.cnpj.trim();
  if (lookup.cidade?.trim()) updates.cidade = lookup.cidade.trim();
  if (lookup.estado?.trim()) updates.estado = lookup.estado.trim().slice(0, 2).toUpperCase();
  if (lookup.ramo_atividade?.trim()) updates.ramo_atividade = lookup.ramo_atividade.trim();
  if (lookup.email?.trim()) updates.email = lookup.email.trim();
  if (lookup.telefone?.trim()) updates.telefone = lookup.telefone.trim();
  if (lookup.nome?.trim()) updates.nome = lookup.nome.trim();

  return updates;
}
