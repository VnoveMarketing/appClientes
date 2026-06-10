"use client"

import * as React from "react"
import { Users, FileText, FileCheck } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuthUser, canAccessContratos } from "@/hooks/use-auth"
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
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const authUser = useAuthUser();
  const user = authUser ?? defaultUser;

  const navMain = allNavItems.filter(
    (item) => !item.requiresContratos || canAccessContratos(authUser?.role)
  );

  const teams = [
    {
      name: "Agência V9nove",
      logo: (
        <div className="flex items-center justify-center rounded-lg bg-[#09A3E9] text-white size-8 font-extrabold text-sm select-none">
          9
        </div>
      ),
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
