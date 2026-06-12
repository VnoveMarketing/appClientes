export type NivelPermissao = "visualizar" | "editar" | "total";

export type TipoUsuario = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  permissoes?: TipoUsuarioPermissao[];
};

export type Permissao = {
  id: string;
  chave: string;
  nome: string;
  descricao: string;
  modulo: string;
  created_at: string;
};

export type TipoUsuarioPermissao = {
  id: string;
  tipo_usuario_id: string;
  permissao_id: string;
  nivel: NivelPermissao;
  permissao?: Permissao;
};

export type UsuarioProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tipo_usuario_id: string | null;
  nivel_permissao: NivelPermissao | null;
  convite_status: "pendente" | "aceito" | "expirado";
  convite_enviado_em: string | null;
  convite_aceito_em: string | null;
  ativo: boolean;
  created_at: string;
  tipo_usuario?: TipoUsuario | null;
};

export const NIVEL_PERMISSAO_LABELS: Record<NivelPermissao, string> = {
  visualizar: "Visualizar",
  editar: "Editar",
  total: "Total",
};

export const CONVITE_STATUS_LABELS: Record<UsuarioProfile["convite_status"], string> = {
  pendente: "Convite pendente",
  aceito: "Ativo",
  expirado: "Convite expirado",
};

const NIVEL_RANK: Record<NivelPermissao, number> = {
  visualizar: 1,
  editar: 2,
  total: 3,
};

export function nivelAtende(minimo: NivelPermissao, atual: NivelPermissao | null | undefined) {
  if (!atual) return false;
  return NIVEL_RANK[atual] >= NIVEL_RANK[minimo];
}
