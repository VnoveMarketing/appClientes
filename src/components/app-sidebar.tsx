"use client"

import * as React from "react"
import { Users, FileText, FileCheck, Layers, FileType, UserCog, Shield, KeyRound, Tags, Briefcase } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { AgencyIcon } from "@/components/agency-brand"
import { AGENCY_NAME } from "@/lib/brand"
import { useAuthUser, canAccessContratos, canAccessConfig, canAccessUsuarios } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const defaultUser = {
  name: "",
  email: "",
  avatar: "",
  roleLabel: "",
};

const allNavItems = [
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
  },
  {
    title: "Propostas",
    url: "/propostas",
    icon: FileText,
  },
  {
    title: "Contratos",
    url: "/contratos",
    icon: FileCheck,
    requiresContratos: true,
  },
  {
    title: "Tipos de Serviço",
    url: "/configuracoes/tipos-servico",
    icon: Layers,
    requiresConfig: true,
  },
  {
    title: "Modelo de Contrato",
    url: "/configuracoes/contrato-modelos",
    icon: FileType,
    requiresConfig: true,
  },
  {
    title: "Categorias de Cases",
    url: "/configuracoes/case-categorias",
    icon: Tags,
    requiresConfig: true,
  },
  {
    title: "Cases",
    url: "/configuracoes/cases",
    icon: Briefcase,
    requiresConfig: true,
  },
  {
    title: "Usuários",
    url: "/configuracoes/usuarios",
    icon: UserCog,
    requiresUsuarios: true,
  },
  {
    title: "Tipos de Usuário",
    url: "/configuracoes/tipos-usuario",
    icon: Shield,
    requiresUsuarios: true,
  },
  {
    title: "Permissões",
    url: "/configuracoes/permissoes",
    icon: KeyRound,
    requiresUsuarios: true,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const authUser = useAuthUser();
  const user = authUser ?? defaultUser;

  const navMain = allNavItems.filter((item) => {
    if ("requiresContratos" in item && item.requiresContratos) {
      return canAccessContratos(authUser?.role);
    }
    if ("requiresConfig" in item && item.requiresConfig) {
      return canAccessConfig(authUser?.role);
    }
    if ("requiresUsuarios" in item && item.requiresUsuarios) {
      return canAccessUsuarios(authUser?.role);
    }
    return true;
  });

  const teams = [
    {
      name: AGENCY_NAME,
      logo: <AgencyIcon height={28} width={28} />,
      plan: authUser?.roleLabel ?? "Portal Interno",
    }
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-800 bg-[#0B0B0B]" {...props}>
      <SidebarHeader className="border-b border-zinc-800/50 py-4">
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent className="py-4">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t border-zinc-800/50 py-4">
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
