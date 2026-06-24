import { isCnpjComplete, isCnpjValid, stripCnpj } from "@/lib/cnpj-brasil-api";
import { isCpfComplete, isCpfValid, stripCpf } from "@/lib/cpf-brasil";

export type ClienteCadastroPublico = {
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
};

export function numeroEnderecoValido(numero?: string | null) {
  const value = numero?.trim().toUpperCase();
  if (!value) return false;
  if (value === "S/N" || value === "SN" || value === "S N") return false;
  return true;
}

export function clienteDadosCnpjCarregados(
  client: {
    cnpj?: string | null;
    empresa?: string | null;
    cidade?: string | null;
    estado?: string | null;
    endereco_rua?: string | null;
    cep?: string | null;
  },
  digits?: string
) {
  const cnpjDigits = stripCnpj(client.cnpj ?? "");
  if (!isCnpjComplete(cnpjDigits)) return false;
  if (digits && cnpjDigits !== digits) return false;

  return Boolean(
    client.empresa?.trim() &&
      client.cidade?.trim() &&
      client.estado?.trim() &&
      client.endereco_rua?.trim() &&
      client.cep?.trim()
  );
}

export function clienteTemCadastroCnpj(
  client: {
    cnpj?: string | null;
    empresa?: string | null;
    cidade?: string | null;
    estado?: string | null;
    endereco_rua?: string | null;
    endereco_numero?: string | null;
    cep?: string | null;
  },
  digits?: string
) {
  const cnpjDigits = stripCnpj(client.cnpj ?? "");
  if (!isCnpjComplete(cnpjDigits)) return false;
  if (digits && cnpjDigits !== digits) return false;

  return Boolean(
    client.empresa?.trim() &&
      client.cidade?.trim() &&
      client.estado?.trim() &&
      client.endereco_rua?.trim() &&
      numeroEnderecoValido(client.endereco_numero) &&
      client.cep?.trim()
  );
}

export function buildClienteDadosFromCnpjLookup(
  lookup: ClienteCadastroPublico
): ClienteCadastroPublico {
  const updates: ClienteCadastroPublico = {};

  const fields: (keyof ClienteCadastroPublico)[] = [
    "empresa",
    "cnpj",
    "cidade",
    "estado",
    "ramo_atividade",
    "email",
    "telefone",
    "nome",
    "endereco_rua",
    "endereco_numero",
    "endereco_complemento",
    "cep",
  ];

  for (const field of fields) {
    const value = lookup[field];
    if (typeof value === "string" && value.trim()) {
      if (field === "estado") {
        updates.estado = value.trim().slice(0, 2).toUpperCase();
      } else {
        updates[field] = value.trim();
      }
    }
  }

  return updates;
}

export type DadosAceiteProposta = {
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
  endereco_complemento?: string;
  cep: string;
};

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function telefoneValido(telefone: string) {
  const digits = telefone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

export function validarDadosAceiteProposta(
  dados: Partial<DadosAceiteProposta>
): string | null {
  if (!dados.cnpj?.trim()) return "Informe o CNPJ da empresa.";
  if (!isCnpjComplete(dados.cnpj)) return "Informe um CNPJ com 14 dígitos.";
  if (!isCnpjValid(dados.cnpj)) return "CNPJ inválido. Verifique os dígitos informados.";

  if (!dados.empresa?.trim()) return "Informe o nome da empresa.";
  if (!dados.email?.trim()) return "Informe o e-mail corporativo.";
  if (!emailValido(dados.email)) return "Informe um e-mail corporativo válido.";
  if (!dados.telefone?.trim()) return "Informe o telefone principal.";
  if (!telefoneValido(dados.telefone)) return "Informe um telefone válido com DDD.";

  if (!dados.endereco_rua?.trim()) return "Informe a rua ou logradouro.";
  if (!numeroEnderecoValido(dados.endereco_numero)) {
    return "Informe o número do endereço.";
  }

  if (!dados.cep?.trim()) return "Informe o CEP.";
  const cepDigits = dados.cep.replace(/\D/g, "");
  if (cepDigits.length !== 8) return "Informe um CEP válido com 8 dígitos.";

  if (!dados.cidade?.trim()) return "Informe a cidade.";
  if (!dados.estado?.trim()) return "Informe o estado.";
  if (dados.estado.trim().length !== 2) return "Informe a sigla do estado com 2 letras.";

  if (!dados.ramo_atividade?.trim()) return "Informe o ramo de atividade.";
  if (!dados.nome?.trim()) return "Informe o nome do representante legal.";

  if (!dados.representante_cpf?.trim()) return "Informe o CPF do representante.";
  if (!isCpfComplete(dados.representante_cpf)) {
    return "Informe um CPF do representante com 11 dígitos.";
  }
  if (!isCpfValid(dados.representante_cpf)) {
    return "CPF do representante inválido. Verifique os dígitos informados.";
  }

  if (!dados.representante_email?.trim()) return "Informe o e-mail do representante.";
  if (!emailValido(dados.representante_email)) {
    return "Informe um e-mail válido do representante.";
  }

  return null;
}
