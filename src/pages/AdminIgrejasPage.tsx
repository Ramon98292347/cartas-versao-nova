import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { AdminChurchesTab } from "@/components/admin/AdminChurchesTab";
import { listChurchesInScopePaged } from "@/services/saasService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function IgrejaStat({
  title,
  value,
  subtitle,
  gradient,
}: {
  title: string;
  value: number;
  subtitle: string;
  gradient: string;
}) {
  return (
    <Card className={`rounded-2xl border-0 shadow-sm ${gradient}`}>
      <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-white">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-5xl font-extrabold text-white">{value}</p>
        <p className="text-lg text-white/90">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Comentario: pagina de igrejas para o admin (cadastro e gestao de estrutura).
export default function AdminIgrejasPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data } = useQuery({
    queryKey: ["admin-igrejas-page", page, pageSize],
    queryFn: () => listChurchesInScopePaged(page, pageSize),
  });

  const rows = data?.churches || [];
  const total = data?.total || rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalEstadual = rows.filter((c) => String(c.church_class || "").toLowerCase() === "estadual").length;
  const totalSetorial = rows.filter((c) => String(c.church_class || "").toLowerCase() === "setorial").length;
  const totalCentral = rows.filter((c) => String(c.church_class || "").toLowerCase() === "central").length;
  const totalRegional = rows.filter((c) => String(c.church_class || "").toLowerCase() === "regional").length;
  const totalLocal = rows.filter((c) => String(c.church_class || "").toLowerCase() === "local").length;

  return (
    <ManagementShell roleMode="admin">
      <div className="mb-4">
        <h2 className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">Gestão de Igrejas</h2>
        <p className="mt-1 text-3xl font-medium text-slate-600">Administre as igrejas do sistema</p>
      </div>
      <section className="mb-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <IgrejaStat title="Total" value={rows.length} subtitle="igrejas no escopo" gradient="bg-gradient-to-r from-indigo-500 to-blue-500" />
        <IgrejaStat title="Estadual" value={totalEstadual} subtitle="classificação estadual" gradient="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <IgrejaStat title="Setorial" value={totalSetorial} subtitle="classificação setorial" gradient="bg-gradient-to-r from-emerald-500 to-green-500" />
        <IgrejaStat title="Central" value={totalCentral} subtitle="classificação central" gradient="bg-gradient-to-r from-pink-500 to-rose-500" />
        <IgrejaStat title="Regional" value={totalRegional} subtitle="classificação regional" gradient="bg-gradient-to-r from-orange-500 to-amber-500" />
        <IgrejaStat title="Local" value={totalLocal} subtitle="classificação local" gradient="bg-gradient-to-r from-cyan-500 to-sky-500" />
      </section>
      <AdminChurchesTab
        rows={rows}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </ManagementShell>
  );
}
