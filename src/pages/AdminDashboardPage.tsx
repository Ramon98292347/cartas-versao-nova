import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Church } from "lucide-react";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listChurchesInScopePaged } from "@/services/saasService";

function StatCard({
  title,
  value,
  subtitle,
  gradient,
}: {
  title: string;
  value: number;
  subtitle: string;
  gradient?: string;
}) {
  return (
    <Card className={`rounded-2xl border-0 shadow-sm ${gradient || "bg-white"}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-xl font-semibold ${gradient ? "text-white" : "text-slate-900"}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-5xl font-extrabold ${gradient ? "text-white" : "text-slate-900"}`}>{value}</p>
        <p className={`text-lg ${gradient ? "text-white/90" : "text-slate-500"}`}>{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Comentario: dashboard administrativo focado em indicadores de igrejas.
export default function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard-churches"],
    queryFn: () => listChurchesInScopePaged(1, 1000),
  });
  const churches = data?.churches || [];

  const counters = useMemo(() => {
    return {
      total: churches.length,
      estadual: churches.filter((c) => String(c.church_class || "").toLowerCase() === "estadual").length,
      setorial: churches.filter((c) => String(c.church_class || "").toLowerCase() === "setorial").length,
      central: churches.filter((c) => String(c.church_class || "").toLowerCase() === "central").length,
      regional: churches.filter((c) => String(c.church_class || "").toLowerCase() === "regional").length,
      local: churches.filter((c) => String(c.church_class || "").toLowerCase() === "local").length,
    };
  }, [churches]);

  return (
    <ManagementShell roleMode="admin">
      <div className="mb-4">
        <h2 className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">Dashboard Administrativo</h2>
        <p className="mt-1 text-3xl font-medium text-slate-600">Visão geral das igrejas da organização</p>
      </div>

      <section className="mb-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total de Igrejas" value={counters.total} subtitle="igrejas cadastradas" gradient="bg-gradient-to-r from-indigo-500 to-blue-500" />
        <StatCard title="Estadual" value={counters.estadual} subtitle="classificação estadual" gradient="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <StatCard title="Setorial" value={counters.setorial} subtitle="classificação setorial" gradient="bg-gradient-to-r from-emerald-500 to-green-500" />
        <StatCard title="Central" value={counters.central} subtitle="classificação central" gradient="bg-gradient-to-r from-pink-500 to-rose-500" />
        <StatCard title="Regional" value={counters.regional} subtitle="classificação regional" gradient="bg-gradient-to-r from-orange-500 to-amber-500" />
        <StatCard title="Local" value={counters.local} subtitle="classificação local" gradient="bg-gradient-to-r from-cyan-500 to-sky-500" />
      </section>

      <Card className="border border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center gap-2">
          <Building2 className="h-5 w-5 text-slate-600" />
          <CardTitle>Acesso rápido</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Use o menu <b>Igrejas</b> para cadastrar, ativar/desativar e trocar pastor responsável.
          <div className="mt-3 flex items-center gap-2 text-slate-800">
            <Church className="h-4 w-4" />
            Total no escopo atual: <b>{counters.total}</b>
          </div>
        </CardContent>
      </Card>
    </ManagementShell>
  );
}
