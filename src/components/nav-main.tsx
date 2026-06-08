"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Administração</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname.startsWith(item.url)
          const Icon = item.icon

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={`transition-colors duration-200 ${
                  isActive
                    ? "bg-[#09A3E9]/20 text-[#09A3E9] hover:bg-[#09A3E9]/30 hover:text-[#09A3E9]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <Icon className={`size-5 ${isActive ? "text-[#09A3E9]" : "text-zinc-400 group-hover:text-white"}`} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
