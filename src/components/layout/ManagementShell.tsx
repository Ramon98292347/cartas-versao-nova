import type { ComponentType, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Building2, FileText, Megaphone, Settings, Users } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

type RoleMode = "admin" | "pastor";

type MenuItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const pastorMenu: MenuItem[] = [
  { to: "/pastor/dashboard", label: "Dashboard", icon: FileText },
  { to: "/pastor/membros", label: "Membros", icon: Users },
  { to: "/pastor/igrejas", label: "Igrejas", icon: Building2 },
  { to: "/carta", label: "Cartas", icon: FileText },
  { to: "/divulgacao", label: "Divulgação", icon: Megaphone },
  { to: "/config", label: "Configurações", icon: Settings },
];

const adminMenu: MenuItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FileText },
  { to: "/admin/igrejas", label: "Igrejas", icon: Building2 },
  { to: "/divulgacao", label: "Divulgação", icon: Megaphone },
  { to: "/config", label: "Configurações", icon: Settings },
];

// Comentario: layout principal para pastor/admin com menu horizontal no mesmo padrao visual.
export function ManagementShell({
  roleMode,
  children,
}: {
  roleMode: RoleMode;
  children: ReactNode;
}) {
  const nav = useNavigate();
  const { usuario, clearAuth } = useUser();
  const menu = roleMode === "admin" ? adminMenu : pastorMenu;

  function onLogout() {
    clearAuth();
    nav("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f3f5f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-4">
          <h1 className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-4xl font-bold text-transparent">
            Sistema de Gestão Eclesiástica
          </h1>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-slate-600 md:block">{usuario?.email || usuario?.nome || "Usuário"}</p>
            <Button variant="outline" onClick={onLogout}>Sair</Button>
          </div>
        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-1 overflow-x-auto px-4 py-2">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-base ${
                      isActive ? "border-b-2 border-emerald-500 text-emerald-600" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-5">{children}</main>
    </div>
  );
}
