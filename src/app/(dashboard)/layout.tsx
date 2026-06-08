import React from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-[#0B0B0B] text-white overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#0B0B0B]">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-800/50 px-6 bg-[#0B0B0B]/80 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger className="text-zinc-400 hover:text-white" />
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-300">V9nove</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">CRM</span>
            </div>
          </header>
          <div className="flex-1 p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
