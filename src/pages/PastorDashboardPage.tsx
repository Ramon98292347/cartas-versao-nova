import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Church, UserRound, Users } from "lucide-react";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listChurchesInScopePaged, listMembers } from "@/services/saasService";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Users;
  gradient?: string;
}) {
  return (
    <Card className={`rounded-2xl border-0 shadow-sm ${gradient || "bg-white"}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-xl font-semibold ${gradient ? "text-white" : "text-slate-900"}`}>{title}</CardTitle>
        <Icon className={`h-5 w-5 ${gradient ? "text-white/90" : "text-slate-500"}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-5xl font-extrabold ${gradient ? "text-white" : "text-slate-900"}`}>{value}</p>
        <p className={`mt-1 text-lg ${gradient ? "text-white/90" : "text-slate-500"}`}>{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Comentario: dashboard principal do pastor com foco em membros e igrejas do escopo.
export default function PastorDashboardPage() {
  const { data: membersRes } = useQuery({
    queryKey: ["pastor-dashboard-members"],
    queryFn: () => listMembers({ page: 1, page_size: 300, roles: ["pastor", "obreiro"] }),
  });
  const { data: churchesRes } = useQuery({
    queryKey: ["pastor-dashboard-churches"],
    queryFn: () => listChurchesInScopePaged(1, 500),
  });

  const members = membersRes?.workers || [];
  const churches = churchesRes?.churches || [];

  const counters = useMemo(() => {
    const totalMembers = members.length;
    const pastors = members.filter((m) => m.role === "pastor").length;
    const obreiros = members.filter((m) => m.role === "obreiro").length;
    const presbiteros = members.filter((m) => String(m.minister_role || "").toLowerCase() === "presbitero").length;
    const diaconos = members.filter((m) => String(m.minister_role || "").toLowerCase() === "diacono").length;
    const membros = members.filter((m) => String(m.minister_role || "").toLowerCase() === "membro").length;
    const byClass = {
      estadual: churches.filter((c) => String(c.church_class || "").toLowerCase() === "estadual").length,
      setorial: churches.filter((c) => String(c.church_class || "").toLowerCase() === "setorial").length,
      central: churches.filter((c) => String(c.church_class || "").toLowerCase() === "central").length,
      regional: churches.filter((c) => String(c.church_class || "").toLowerCase() === "regional").length,
      local: churches.filter((c) => String(c.church_class || "").toLowerCase() === "local").length,
    };
    return { totalMembers, pastors, obreiros, presbiteros, diaconos, membros, byClass };
  }, [members, churches]);

  return (
    <ManagementShell roleMode="pastor">
      <section className="mb-4">
        <h2 className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">Dashboard</h2>
        <p className="mt-1 text-3xl font-medium text-slate-600">Visão geral dos membros e das igrejas da sua região</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total de Membros" value={counters.totalMembers} subtitle="membros cadastrados" icon={Users} gradient="bg-gradient-to-r from-emerald-500 to-cyan-500" />
        <StatCard title="Pastores" value={counters.pastors} subtitle="pastores cadastrados" icon={UserRound} gradient="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <StatCard title="Obreiros" value={counters.obreiros} subtitle="obreiros cadastrados" icon={Users} gradient="bg-gradient-to-r from-amber-500 to-orange-500" />
        <StatCard title="Presbíteros" value={counters.presbiteros} subtitle="presbíteros cadastrados" icon={UserRound} gradient="bg-gradient-to-r from-blue-500 to-indigo-500" />
        <StatCard title="Diáconos" value={counters.diaconos} subtitle="diáconos cadastrados" icon={UserRound} gradient="bg-gradient-to-r from-emerald-500 to-lime-500" />
        <StatCard title="Membros" value={counters.membros} subtitle="membros ativos" icon={Users} gradient="bg-gradient-to-r from-sky-500 to-blue-500" />
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-slate-600" />
          <h3 className="text-4xl font-bold tracking-tight text-slate-900">Estatísticas das Igrejas</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total" value={churches.length} subtitle="igrejas no escopo" icon={Church} gradient="bg-gradient-to-r from-slate-600 to-slate-700" />
          <StatCard title="Estadual" value={counters.byClass.estadual} subtitle="classificação estadual" icon={Church} gradient="bg-gradient-to-r from-indigo-500 to-violet-500" />
          <StatCard title="Setorial" value={counters.byClass.setorial} subtitle="classificação setorial" icon={Church} gradient="bg-gradient-to-r from-emerald-500 to-green-500" />
          <StatCard title="Central" value={counters.byClass.central} subtitle="classificação central" icon={Church} gradient="bg-gradient-to-r from-fuchsia-500 to-pink-500" />
          <StatCard title="Regional" value={counters.byClass.regional} subtitle="classificação regional" icon={Church} gradient="bg-gradient-to-r from-orange-500 to-amber-500" />
          <StatCard title="Local" value={counters.byClass.local} subtitle="classificação local" icon={Church} gradient="bg-gradient-to-r from-cyan-500 to-sky-500" />
        </div>
      </section>
    </ManagementShell>
  );
}
