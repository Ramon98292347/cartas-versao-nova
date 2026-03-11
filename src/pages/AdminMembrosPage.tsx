import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { ObreirosTab } from "@/components/admin/ObreirosTab";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listChurchesInScope, listMembers } from "@/services/saasService";
import { PageLoading } from "@/components/shared/PageLoading";

function MiniCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  tone: { bg: string; border: string; accent: string };
}) {
  return (
    <Card className="rounded-xl border shadow-sm" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
      <CardContent className="border-l-4 p-5" style={{ borderLeftColor: tone.accent }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <Users className="h-4 w-4" style={{ color: tone.accent }} />
        </div>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Comentario: pagina de membros para admin com igreja pre-selecionada para listar e cadastrar pastor/membros.
export default function AdminMembrosPage() {
  const [selectedChurchTotvs, setSelectedChurchTotvs] = useState("");

  const { data: churches = [], isLoading: loadingChurches, isFetching: fetchingChurches } = useQuery({
    queryKey: ["admin-membros-churches"],
    queryFn: () => listChurchesInScope(1, 400),
  });

  useEffect(() => {
    if (!selectedChurchTotvs && churches.length > 0) {
      setSelectedChurchTotvs(String(churches[0].totvs_id || ""));
    }
  }, [selectedChurchTotvs, churches]);

  const selectedChurch = useMemo(
    () => churches.find((church) => String(church.totvs_id || "") === selectedChurchTotvs) || null,
    [churches, selectedChurchTotvs],
  );

  const { data: membersRes, isLoading: loadingMembers, isFetching: fetchingMembers } = useQuery({
    queryKey: ["admin-membros-kpi", selectedChurchTotvs],
    queryFn: () =>
      listMembers({
        roles: ["pastor", "obreiro"],
        church_totvs_id: selectedChurchTotvs || undefined,
        page: 1,
        // Comentario: para KPI usamos metrics do backend; nao precisa trazer lista grande.
        page_size: 1,
      }),
    enabled: Boolean(selectedChurchTotvs),
  });

  const showPageLoading =
    loadingChurches ||
    (fetchingChurches && churches.length === 0) ||
    (selectedChurchTotvs && loadingMembers && !membersRes) ||
    (fetchingMembers && !membersRes && Boolean(selectedChurchTotvs));

  const counters = useMemo(() => {
    const metrics = membersRes?.metrics;
    if (metrics) {
      return {
        total: Number(membersRes?.total || metrics.total || 0),
        pastor: Number(metrics.pastor || 0),
        presbitero: Number(metrics.presbitero || 0),
        diacono: Number(metrics.diacono || 0),
        obreiro: Number(metrics.obreiro || 0),
        membrosAtivos: Number(metrics.membro || 0),
      };
    }

    const workers = membersRes?.workers || [];
    return {
      total: workers.length,
      pastor: workers.filter((w) => w.role === "pastor").length,
      presbitero: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "presbitero").length,
      diacono: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "diacono").length,
      obreiro: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "obreiro").length,
      membrosAtivos: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "membro" && w.is_active !== false).length,
    };
  }, [membersRes]);

  const memberTone = {
    total: { bg: "#FFFFFF", border: "#E5E7EB", accent: "#2563EB" },
    pastor: { bg: "#F8FAFC", border: "#E5E7EB", accent: "#2563EB" },
    presbitero: { bg: "#F8FAFC", border: "#E5E7EB", accent: "#7C3AED" },
    diacono: { bg: "#F8FAFC", border: "#E5E7EB", accent: "#16A34A" },
    obreiro: { bg: "#F8FAFC", border: "#E5E7EB", accent: "#CA8A04" },
    ativo: { bg: "#F8FAFC", border: "#E5E7EB", accent: "#334155" },
  };

  return (
    <ManagementShell roleMode="admin">
      {showPageLoading ? (
        <PageLoading title="Carregando membros" description="Buscando membros e indicadores da igreja..." />
      ) : (
        <div className="space-y-5 bg-[#F6F8FC] p-1">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Membros</h2>
          <p className="mt-1 text-base text-slate-600">Visualize os membros por igreja e cadastre pastores/obreiros.</p>
          <div className="mt-4 max-w-md">
            <Select value={selectedChurchTotvs} onValueChange={setSelectedChurchTotvs}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a igreja" />
              </SelectTrigger>
              <SelectContent>
                {churches.map((church) => (
                  <SelectItem key={church.totvs_id} value={String(church.totvs_id)}>
                    {church.totvs_id} - {church.church_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChurch ? (
              <p className="mt-1 text-xs text-slate-500">Igreja selecionada: {selectedChurch.church_name}</p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MiniCard title="Total de membros" value={counters.total} subtitle="cadastros na igreja" tone={memberTone.total} />
          <MiniCard title="Pastor" value={counters.pastor} subtitle="cargo pastor" tone={memberTone.pastor} />
          <MiniCard title="Presbitero" value={counters.presbitero} subtitle="cargo presbitero" tone={memberTone.presbitero} />
          <MiniCard title="Diacono" value={counters.diacono} subtitle="cargo diacono" tone={memberTone.diacono} />
          <MiniCard title="Obreiro" value={counters.obreiro} subtitle="cargo obreiro" tone={memberTone.obreiro} />
          <MiniCard title="Membros ativos" value={counters.membrosAtivos} subtitle="ministerio membro" tone={memberTone.ativo} />
        </section>

        <ObreirosTab activeTotvsId={selectedChurchTotvs} forceSingleChurchFilter />
        </div>
      )}
    </ManagementShell>
  );
}
