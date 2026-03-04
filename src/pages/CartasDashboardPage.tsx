import { useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, LineChart, Users } from "lucide-react";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { CartasTab } from "@/components/admin/CartasTab";
import { StatCards } from "@/components/shared/StatCards";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { getPastorMetrics, listMembers, listPastorLetters } from "@/services/saasService";

// Comentario: dashboard exclusivo de cartas para pastor/admin.
export default function CartasDashboardPage() {
  const nav = useNavigate();
  const { usuario, session } = useUser();

  const role = String(usuario?.role || "").toLowerCase();
  if (role === "obreiro") {
    return <Navigate to="/usuario" replace />;
  }

  const roleMode = role === "admin" ? "admin" : "pastor";
  const activeTotvsId = String(session?.totvs_id || usuario?.default_totvs_id || usuario?.totvs || "");
  const scopeTotvsIds = useMemo(() => {
    const ids = (session?.scope_totvs_ids || usuario?.totvs_access || []).filter(Boolean);
    if (ids.length) return ids;
    if (activeTotvsId) return [activeTotvsId];
    return [];
  }, [session?.scope_totvs_ids, usuario?.totvs_access, activeTotvsId]);

  const { data: metrics } = useQuery({
    queryKey: ["cartas-dashboard-metrics"],
    queryFn: () => getPastorMetrics(),
    enabled: scopeTotvsIds.length > 0,
  });

  const { data: letters = [] } = useQuery({
    queryKey: ["cartas-dashboard-letters", scopeTotvsIds.join("|")],
    queryFn: async () => {
      const data = await Promise.all(
        scopeTotvsIds.map((totvs) =>
          listPastorLetters(totvs, {
            period: "custom",
          }),
        ),
      );
      const map = new Map<string, (typeof data)[number][number]>();
      data.flat().forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    },
    enabled: scopeTotvsIds.length > 0,
  });

  const { data: membrosRes } = useQuery({
    queryKey: ["cartas-dashboard-members", scopeTotvsIds.join("|")],
    queryFn: () => listMembers({ page: 1, page_size: 300, roles: ["pastor", "obreiro"] }),
    enabled: scopeTotvsIds.length > 0,
  });

  const obreiros = membrosRes?.workers || [];
  const phonesByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    obreiros.forEach((u) => {
      const id = String(u?.id || "");
      const phone = String(u?.phone || "");
      if (id && phone) map[id] = phone;
    });
    return map;
  }, [obreiros]);

  const phonesByName = useMemo(() => {
    const map: Record<string, string> = {};
    obreiros.forEach((u) => {
      const nome = String(u?.full_name || "").trim().toLowerCase();
      const phone = String(u?.phone || "");
      if (nome && phone) map[nome] = phone;
    });
    return map;
  }, [obreiros]);

  return (
    <ManagementShell roleMode={roleMode as "admin" | "pastor"}>
      <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">Gestão de Cartas</h2>
          <p className="mt-1 text-2xl font-medium text-slate-600">Painel de cartas e histórico</p>
        </div>
        <Button className="h-11 px-5" onClick={() => nav("/carta/formulario")}>Fazer carta</Button>
      </section>

      <StatCards
        items={[
          { label: "Total de Cartas", value: Number(metrics?.totalCartas || 0), icon: FileText, gradient: "bg-gradient-to-r from-[#2f63d4] to-[#4b77d5]" },
          { label: "Cartas Hoje", value: Number(metrics?.cartasHoje || 0), icon: CalendarDays, gradient: "bg-gradient-to-r from-[#2fa86f] to-[#49c280]" },
          { label: "Últimos 7 dias", value: Number(metrics?.ultimos7Dias || 0), icon: LineChart, gradient: "bg-gradient-to-r from-[#f39b1c] to-[#f3b12c]" },
          { label: "Total de Membros", value: Number(metrics?.totalObreiros || 0), icon: Users, gradient: "bg-gradient-to-r from-[#8f3fd4] to-[#a957e4]" },
        ]}
      />

      <div className="mt-5">
        <CartasTab letters={letters} scopeTotvsIds={scopeTotvsIds} phonesByUserId={phonesByUserId} phonesByName={phonesByName} />
      </div>
    </ManagementShell>
  );
}
