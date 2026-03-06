import { useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, LineChart, Users } from "lucide-react";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { CartasTab } from "@/components/admin/CartasTab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { getPastorMetrics, listMembers, listPastorLetters } from "@/services/saasService";

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  tone: { bg: string; border: string; accent: string };
}) {
  return (
    <Card className="rounded-xl shadow-sm" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
      <CardContent className="border-l-4 p-5" style={{ borderLeftColor: tone.accent }}>
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Icon className="h-4 w-4" style={{ color: tone.accent }} />
          {label}
        </p>
        <p className="mt-3 text-4xl font-extrabold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

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

  const tone = {
    total: { bg: "#F5F3FF", border: "#DDD6FE", accent: "#7C3AED" },
    hoje: { bg: "#EFF6FF", border: "#BFDBFE", accent: "#2563EB" },
    seteDias: { bg: "#FFFBEB", border: "#FDE68A", accent: "#CA8A04" },
    membros: { bg: "#F9FAFB", border: "#E5E7EB", accent: "#6B7280" },
  };

  return (
    <ManagementShell roleMode={roleMode as "admin" | "pastor"}>
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Cartas</h2>
            <p className="mt-1 text-base text-slate-600">Painel de cartas e historico por periodo.</p>
          </div>
          <Button
            className="h-11 px-6 font-semibold text-white shadow-sm bg-blue-600 hover:bg-blue-700 border border-blue-700"
            onClick={() => nav("/carta/formulario")}
          >
            Fazer carta
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total de cartas" value={Number(metrics?.totalCartas || 0)} icon={FileText} tone={tone.total} />
        <KpiCard label="Cartas hoje" value={Number(metrics?.cartasHoje || 0)} icon={CalendarDays} tone={tone.hoje} />
        <KpiCard label="Ultimos 7 dias" value={Number(metrics?.ultimos7Dias || 0)} icon={LineChart} tone={tone.seteDias} />
        <KpiCard label="Total de membros" value={Number(metrics?.totalObreiros || 0)} icon={Users} tone={tone.membros} />
      </section>

      <div className="mt-5">
        <CartasTab letters={letters} scopeTotvsIds={scopeTotvsIds} phonesByUserId={phonesByUserId} phonesByName={phonesByName} />
      </div>
    </ManagementShell>
  );
}
