import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid2X2, IdCard, List, Save, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { ManagementShell } from "@/components/layout/ManagementShell";
import { ObreirosTab } from "@/components/admin/ObreirosTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listMembers, type UserListItem, generateMemberDocs } from "@/services/saasService";
import { useUser } from "@/context/UserContext";

type MemberTab = "lista" | "ficha_membro" | "carteirinha" | "ficha_obreiro";
type MemberView = "lista" | "grid";

type MemberDocForm = {
  nome_completo: string;
  matricula: string;
  funcao_ministerial: string;
  data_nascimento: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  estado_civil: string;
  data_batismo: string;
  cpf: string;
  rg: string;
  telefone: string;
  foto_3x4_url: string;
  assinatura_pastor_url: string;
  igreja_nome: string;
  compromisso_funcao: string;
  congregacao_endereco: string;
  congregacao_numero: string;
  congregacao_bairro: string;
  congregacao_cidade: string;
  antiga_sede_central: string;
  data_termo_cidade: string;
  data_termo_dia: string;
  data_termo_mes: string;
  data_termo_ano: string;
  testemunha1_nome: string;
  testemunha1_documento: string;
  testemunha2_nome: string;
  testemunha2_documento: string;
  observacoes_termo: string;
  nacionalidade: string;
  cidade_nascimento: string;
  uf_nascimento: string;
  data_casamento: string;
  passaporte: string;
  profissao: string;
  ocupacao_atual: string;
  nome_pai: string;
  nome_mae: string;
  tem_filhos: string;
  dependentes_qtd: string;
  filho1_nome: string;
  filho1_nascimento: string;
  filho2_nome: string;
  filho2_nascimento: string;
  filho3_nome: string;
  filho3_nascimento: string;
  doenca_familia: string;
  doenca_familia_qual: string;
  nome_conjuge: string;
  conjuge_nascimento: string;
  conjuge_rg: string;
  conjuge_cpf: string;
  conjuge_e_crente: string;
  conjuge_outro_ministerio: string;
  denominacao_aceitou_jesus: string;
  data_conversao: string;
  data_batismo_aguas: string;
  funcao_ministerial_secundaria: string;
  ordenacao_cooperador: string;
  ordenacao_diacono: string;
  ordenacao_presbitero: string;
  ordenacao_evangelista: string;
  ordenacao_voluntario: string;
  possui_credencial: string;
  recebe_prebenda: string;
  prebenda_tempo: string;
  prebenda_desde: string;
  dirige_alguma_ipda: string;
  dirige_ipda_qual: string;
  endereco_atual_congregacao: string;
  bairro_congregacao: string;
  cidade_congregacao: string;
  uf_congregacao: string;
  cep_congregacao: string;
  dirigente_congregacao: string;
  tel_congregacao: string;
  sede_setorial: string;
  sucursal: string;
  ja_dirigiu_exterior: string;
  cidades_exterior: string;
  paises_exterior: string;
  doenca_exterior: string;
  doenca_exterior_quem: string;
  doenca_exterior_quais: string;
  motivo_volta_brasil: string;
  idioma_fluente: string;
  idioma_quais: string;
  escolaridade: string;
  desempenho_ministerio: string;
  desempenho_ano: string;
  foi_disciplinado: string;
  disciplinado_quantas_vezes: string;
  disciplinado_motivo: string;
  curso_ministerial: string;
  curso_ministerial_qual: string;
  historico_gestao_1_ano: string;
  historico_gestao_1_ipda: string;
  historico_gestao_1_uf: string;
  historico_gestao_1_tempo: string;
  historico_gestao_2_ano: string;
  historico_gestao_2_ipda: string;
  historico_gestao_2_uf: string;
  historico_gestao_2_tempo: string;
  historico_gestao_3_ano: string;
  historico_gestao_3_ipda: string;
  historico_gestao_3_uf: string;
  historico_gestao_3_tempo: string;
};

const emptyForm: MemberDocForm = {
  nome_completo: "",
  matricula: "",
  funcao_ministerial: "",
  data_nascimento: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  estado_civil: "",
  data_batismo: "",
  cpf: "",
  rg: "",
  telefone: "",
  foto_3x4_url: "",
  assinatura_pastor_url: "",
  igreja_nome: "",
  compromisso_funcao: "",
  congregacao_endereco: "",
  congregacao_numero: "",
  congregacao_bairro: "",
  congregacao_cidade: "",
  antiga_sede_central: "",
  data_termo_cidade: "",
  data_termo_dia: "",
  data_termo_mes: "",
  data_termo_ano: "",
  testemunha1_nome: "",
  testemunha1_documento: "",
  testemunha2_nome: "",
  testemunha2_documento: "",
  observacoes_termo: "",
  nacionalidade: "",
  cidade_nascimento: "",
  uf_nascimento: "",
  data_casamento: "",
  passaporte: "",
  profissao: "",
  ocupacao_atual: "",
  nome_pai: "",
  nome_mae: "",
  tem_filhos: "",
  dependentes_qtd: "",
  filho1_nome: "",
  filho1_nascimento: "",
  filho2_nome: "",
  filho2_nascimento: "",
  filho3_nome: "",
  filho3_nascimento: "",
  doenca_familia: "",
  doenca_familia_qual: "",
  nome_conjuge: "",
  conjuge_nascimento: "",
  conjuge_rg: "",
  conjuge_cpf: "",
  conjuge_e_crente: "",
  conjuge_outro_ministerio: "",
  denominacao_aceitou_jesus: "",
  data_conversao: "",
  data_batismo_aguas: "",
  funcao_ministerial_secundaria: "",
  ordenacao_cooperador: "",
  ordenacao_diacono: "",
  ordenacao_presbitero: "",
  ordenacao_evangelista: "",
  ordenacao_voluntario: "",
  possui_credencial: "",
  recebe_prebenda: "",
  prebenda_tempo: "",
  prebenda_desde: "",
  dirige_alguma_ipda: "",
  dirige_ipda_qual: "",
  endereco_atual_congregacao: "",
  bairro_congregacao: "",
  cidade_congregacao: "",
  uf_congregacao: "",
  cep_congregacao: "",
  dirigente_congregacao: "",
  tel_congregacao: "",
  sede_setorial: "",
  sucursal: "",
  ja_dirigiu_exterior: "",
  cidades_exterior: "",
  paises_exterior: "",
  doenca_exterior: "",
  doenca_exterior_quem: "",
  doenca_exterior_quais: "",
  motivo_volta_brasil: "",
  idioma_fluente: "",
  idioma_quais: "",
  escolaridade: "",
  desempenho_ministerio: "",
  desempenho_ano: "",
  foi_disciplinado: "",
  disciplinado_quantas_vezes: "",
  disciplinado_motivo: "",
  curso_ministerial: "",
  curso_ministerial_qual: "",
  historico_gestao_1_ano: "",
  historico_gestao_1_ipda: "",
  historico_gestao_1_uf: "",
  historico_gestao_1_tempo: "",
  historico_gestao_2_ano: "",
  historico_gestao_2_ipda: "",
  historico_gestao_2_uf: "",
  historico_gestao_2_tempo: "",
  historico_gestao_3_ano: "",
  historico_gestao_3_ipda: "",
  historico_gestao_3_uf: "",
  historico_gestao_3_tempo: "",
};

function MiniCard({
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

function statusBadge(isActive: boolean) {
  return isActive
    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
    : "border-rose-200 bg-rose-100 text-rose-700";
}

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function memberToForm(member: UserListItem, churchName: string, pastorSignature: string) {
  return {
    nome_completo: member.full_name || "",
    matricula: member.matricula || "",
    funcao_ministerial: member.minister_role || "",
    data_nascimento: toInputDate(member.birth_date),
    endereco: member.address_street || "",
    numero: member.address_number || "",
    bairro: member.address_neighborhood || "",
    cidade: member.address_city || "",
    estado: member.address_state || "",
    estado_civil: member.marital_status || "",
    data_batismo: toInputDate(member.baptism_date),
    cpf: member.cpf || "",
    rg: member.rg || "",
    telefone: member.phone || "",
    foto_3x4_url: member.avatar_url || "",
    assinatura_pastor_url: pastorSignature || "",
    igreja_nome: churchName,
    compromisso_funcao: member.minister_role || "",
    congregacao_endereco: member.address_street || "",
    congregacao_numero: member.address_number || "",
    congregacao_bairro: member.address_neighborhood || "",
    congregacao_cidade: member.address_city || "",
    antiga_sede_central: "",
    data_termo_cidade: member.address_city || "",
    data_termo_dia: "",
    data_termo_mes: "",
    data_termo_ano: "",
    testemunha1_nome: "",
    testemunha1_documento: "",
    testemunha2_nome: "",
    testemunha2_documento: "",
    observacoes_termo: "",
    nacionalidade: "",
    cidade_nascimento: member.address_city || "",
    uf_nascimento: member.address_state || "",
    data_casamento: "",
    passaporte: "",
    profissao: "",
    ocupacao_atual: "",
    nome_pai: "",
    nome_mae: "",
    tem_filhos: "",
    dependentes_qtd: "",
    filho1_nome: "",
    filho1_nascimento: "",
    filho2_nome: "",
    filho2_nascimento: "",
    filho3_nome: "",
    filho3_nascimento: "",
    doenca_familia: "",
    doenca_familia_qual: "",
    nome_conjuge: "",
    conjuge_nascimento: "",
    conjuge_rg: "",
    conjuge_cpf: "",
    conjuge_e_crente: "",
    conjuge_outro_ministerio: "",
    denominacao_aceitou_jesus: "",
    data_conversao: "",
    data_batismo_aguas: "",
    funcao_ministerial_secundaria: member.minister_role || "",
    ordenacao_cooperador: "",
    ordenacao_diacono: "",
    ordenacao_presbitero: "",
    ordenacao_evangelista: "",
    ordenacao_voluntario: "",
    possui_credencial: "",
    recebe_prebenda: "",
    prebenda_tempo: "",
    prebenda_desde: "",
    dirige_alguma_ipda: "",
    dirige_ipda_qual: "",
    endereco_atual_congregacao: "",
    bairro_congregacao: "",
    cidade_congregacao: "",
    uf_congregacao: "",
    cep_congregacao: "",
    dirigente_congregacao: "",
    tel_congregacao: "",
    sede_setorial: "",
    sucursal: "",
    ja_dirigiu_exterior: "",
    cidades_exterior: "",
    paises_exterior: "",
    doenca_exterior: "",
    doenca_exterior_quem: "",
    doenca_exterior_quais: "",
    motivo_volta_brasil: "",
    idioma_fluente: "",
    idioma_quais: "",
    escolaridade: "",
    desempenho_ministerio: "",
    desempenho_ano: "",
    foi_disciplinado: "",
    disciplinado_quantas_vezes: "",
    disciplinado_motivo: "",
    curso_ministerial: "",
    curso_ministerial_qual: "",
    historico_gestao_1_ano: "",
    historico_gestao_1_ipda: "",
    historico_gestao_1_uf: "",
    historico_gestao_1_tempo: "",
    historico_gestao_2_ano: "",
    historico_gestao_2_ipda: "",
    historico_gestao_2_uf: "",
    historico_gestao_2_tempo: "",
    historico_gestao_3_ano: "",
    historico_gestao_3_ipda: "",
    historico_gestao_3_uf: "",
    historico_gestao_3_tempo: "",
  };
}

function tabLabel(tab: MemberTab) {
  if (tab === "ficha_membro") return "Ficha do membro";
  if (tab === "carteirinha") return "Carteirinha";
  return "Ficha de obreiro";
}

export default function PastorMembrosPage() {
  const { session, usuario } = useUser();
  const activeTotvsId = String(session?.totvs_id || usuario?.default_totvs_id || usuario?.totvs || "");
  const [tab, setTab] = useState<MemberTab>("lista");
  const [view, setView] = useState<MemberView>("lista");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [form, setForm] = useState<MemberDocForm>(emptyForm);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);

  const { data } = useQuery({
    queryKey: ["pastor-members-page"],
    queryFn: () => listMembers({ page: 1, page_size: 400, roles: ["pastor", "obreiro"] }),
  });

  const workers = data?.workers || [];
  const selectedMember = useMemo(
    () => workers.find((member) => String(member.id) === selectedMemberId) || null,
    [workers, selectedMemberId],
  );
  const pastorDaIgreja = useMemo(
    () => workers.find((member) => member.role === "pastor" && String(member.default_totvs_id || "") === activeTotvsId) || null,
    [workers, activeTotvsId],
  );
  const churchName = String(session?.church_name || usuario?.church_name || "");

  useEffect(() => {
    if (!selectedMemberId && workers.length > 0) {
      setSelectedMemberId(String(workers[0].id));
      return;
    }
    if (!selectedMember) return;
    const pastorSignature = String((pastorDaIgreja as UserListItem | null)?.signature_url || "");
    setForm(memberToForm(selectedMember, churchName, pastorSignature));
  }, [selectedMemberId, selectedMember, workers, churchName, pastorDaIgreja]);

  const counters = useMemo(() => {
    return {
      total: workers.length,
      pastor: workers.filter((w) => w.role === "pastor").length,
      presbitero: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "presbitero").length,
      diacono: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "diacono").length,
      obreiro: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "obreiro").length,
      batizados: workers.filter((w) => String(w.minister_role || "").toLowerCase() === "membro").length,
    };
  }, [workers]);

  async function saveDraft() {
    if (!selectedMemberId) {
      toast.error("Selecione um membro.");
      return;
    }
    setSavingDraft(true);
    try {
      localStorage.setItem(`ipda_member_doc_draft_${selectedMemberId}`, JSON.stringify(form));
      toast.success("Rascunho salvo localmente.");
    } catch {
      toast.error("Não foi possível salvar o rascunho.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function sendToGenerateDocs() {
    if (!selectedMemberId) {
      toast.error("Selecione um membro.");
      return;
    }
    if (!form.nome_completo || !form.funcao_ministerial || !form.cpf) {
      toast.error("Preencha nome, cargo e CPF.");
      return;
    }

    setSending(true);
    try {
      await generateMemberDocs({
        document_type: tab === "lista" ? "ficha_membro" : tab,
        member_id: selectedMemberId,
        church_totvs_id: activeTotvsId,
        dados: {
          ...form,
          pastor_responsavel_nome: pastorDaIgreja?.full_name || "",
          pastor_responsavel_telefone: pastorDaIgreja?.phone || "",
        },
      });
      toast.success("Documento enviado para geração no n8n.");
    } catch {
      toast.error("Falha ao enviar para geração.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ManagementShell roleMode="pastor">
      <div className="mb-4">
        <h2 className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">Gestao de Membros</h2>
        <p className="mt-1 text-3xl font-medium text-slate-600">Gerencie os membros da sua igreja</p>
      </div>

      <section className="mb-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MiniCard title="Total de Membros" value={counters.total} subtitle="membros encontrados" gradient="bg-gradient-to-r from-emerald-500 to-cyan-500" />
        <MiniCard title="Pastor" value={counters.pastor} subtitle="pastores" gradient="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <MiniCard title="Presbitero" value={counters.presbitero} subtitle="presbiteros" gradient="bg-gradient-to-r from-blue-500 to-indigo-500" />
        <MiniCard title="Diacono" value={counters.diacono} subtitle="diaconos" gradient="bg-gradient-to-r from-emerald-500 to-green-500" />
        <MiniCard title="Obreiro" value={counters.obreiro} subtitle="obreiros" gradient="bg-gradient-to-r from-orange-500 to-amber-500" />
        <MiniCard title="Batizados" value={counters.batizados} subtitle="batizados" gradient="bg-gradient-to-r from-sky-500 to-cyan-500" />
      </section>

      <Card className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant={tab === "lista" ? "default" : "outline"} onClick={() => setTab("lista")}>Lista de membros</Button>
            <Button variant={tab === "ficha_membro" ? "default" : "outline"} onClick={() => setTab("ficha_membro")}>Ficha do membro</Button>
            <Button variant={tab === "carteirinha" ? "default" : "outline"} onClick={() => setTab("carteirinha")}>Carteirinha</Button>
            <Button variant={tab === "ficha_obreiro" ? "default" : "outline"} onClick={() => setTab("ficha_obreiro")}>Ficha de obreiro</Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant={view === "lista" ? "default" : "outline"} size="sm" onClick={() => setView("lista")}>
              <List className="mr-2 h-4 w-4" /> Lista
            </Button>
            <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid")}>
              <Grid2X2 className="mr-2 h-4 w-4" /> Grid
            </Button>
          </div>
        </CardContent>
      </Card>

      {tab === "lista" && view === "lista" ? <ObreirosTab activeTotvsId={activeTotvsId} /> : null}

      {tab === "lista" && view === "grid" ? (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Membros em grade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workers.map((member) => (
              <Card key={member.id} className="border border-slate-200">
                <CardContent className="space-y-3 p-4">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={`Foto de ${member.full_name}`} className="h-40 w-full object-contain" />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center">
                        <Users className="h-7 w-7 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-base font-semibold text-slate-900">{member.full_name || "Sem nome"}</p>
                    <p className="text-sm text-slate-500">CPF: {member.cpf || "-"}</p>
                    <p className="text-sm text-slate-600">Cargo: {member.minister_role || "-"}</p>
                    <p className="text-sm text-slate-600">Tipo: {member.role || "-"}</p>
                    <p className="text-sm text-slate-600">Telefone: {member.phone || "-"}</p>
                  </div>
                  <Badge variant="outline" className={statusBadge(member.is_active !== false)}>
                    {member.is_active === false ? "Inativo" : "Ativo"}
                  </Badge>
                </CardContent>
              </Card>
            ))}

            {workers.length === 0 ? <p className="text-sm text-slate-500">Nenhum membro encontrado.</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab !== "lista" ? (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-slate-500" />
              {tabLabel(tab)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2">
                <Label>Membro</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o membro" /></SelectTrigger>
                  <SelectContent>
                    {workers.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.full_name} - {member.cpf || "sem cpf"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Igreja</Label>
                <Input value={form.igreja_nome} onChange={(e) => setForm((prev) => ({ ...prev, igreja_nome: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Matrícula</Label>
                <Input value={form.matricula} onChange={(e) => setForm((prev) => ({ ...prev, matricula: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Nome completo</Label><Input value={form.nome_completo} onChange={(e) => setForm((prev) => ({ ...prev, nome_completo: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Função ministerial</Label><Input value={form.funcao_ministerial} onChange={(e) => setForm((prev) => ({ ...prev, funcao_ministerial: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Data de nascimento</Label><Input type="date" value={form.data_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, data_nascimento: e.target.value }))} /></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm((prev) => ({ ...prev, endereco: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm((prev) => ({ ...prev, numero: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm((prev) => ({ ...prev, bairro: e.target.value }))} /></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm((prev) => ({ ...prev, cidade: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Estado</Label><Input value={form.estado} onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Estado civil</Label><Input value={form.estado_civil} onChange={(e) => setForm((prev) => ({ ...prev, estado_civil: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Data de batismo</Label><Input type="date" value={form.data_batismo} onChange={(e) => setForm((prev) => ({ ...prev, data_batismo: e.target.value }))} /></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm((prev) => ({ ...prev, cpf: e.target.value }))} /></div>
              <div className="space-y-1"><Label>RG</Label><Input value={form.rg} onChange={(e) => setForm((prev) => ({ ...prev, rg: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Foto 3x4 (URL)</Label><Input value={form.foto_3x4_url} onChange={(e) => setForm((prev) => ({ ...prev, foto_3x4_url: e.target.value }))} /></div>
            </div>

            <div className="space-y-1">
              <Label>Assinatura do pastor (URL)</Label>
              <Input value={form.assinatura_pastor_url} onChange={(e) => setForm((prev) => ({ ...prev, assinatura_pastor_url: e.target.value }))} />
            </div>

            {tab === "ficha_obreiro" ? (
              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-800">Ficha de cadastro de obreiro(a) - dados pessoais</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Função no termo</Label>
                    <Select
                      value={form.compromisso_funcao}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, compromisso_funcao: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Voluntario Financeiro">Voluntário Financeiro</SelectItem>
                        <SelectItem value="Cooperador">Cooperador</SelectItem>
                        <SelectItem value="Diacono">Diácono</SelectItem>
                        <SelectItem value="Presbitero">Presbítero</SelectItem>
                        <SelectItem value="Dirigente">Dirigente</SelectItem>
                        <SelectItem value="Conselheiro Espiritual">Conselheiro Espiritual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 xl:col-span-2">
                    <Label>Endereço da congregação</Label>
                    <Input value={form.congregacao_endereco} onChange={(e) => setForm((prev) => ({ ...prev, congregacao_endereco: e.target.value }))} />
                  </div>
                  <div className="space-y-1"><Label>Número</Label><Input value={form.congregacao_numero} onChange={(e) => setForm((prev) => ({ ...prev, congregacao_numero: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Bairro</Label><Input value={form.congregacao_bairro} onChange={(e) => setForm((prev) => ({ ...prev, congregacao_bairro: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cidade</Label><Input value={form.congregacao_cidade} onChange={(e) => setForm((prev) => ({ ...prev, congregacao_cidade: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Antiga sede central</Label><Input value={form.antiga_sede_central} onChange={(e) => setForm((prev) => ({ ...prev, antiga_sede_central: e.target.value }))} /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1"><Label>Nacionalidade</Label><Input value={form.nacionalidade} onChange={(e) => setForm((prev) => ({ ...prev, nacionalidade: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cidade de nascimento</Label><Input value={form.cidade_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, cidade_nascimento: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>UF de nascimento</Label><Input value={form.uf_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, uf_nascimento: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Data de casamento</Label><Input type="date" value={form.data_casamento} onChange={(e) => setForm((prev) => ({ ...prev, data_casamento: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Passaporte</Label><Input value={form.passaporte} onChange={(e) => setForm((prev) => ({ ...prev, passaporte: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Profissão</Label><Input value={form.profissao} onChange={(e) => setForm((prev) => ({ ...prev, profissao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ocupação atual</Label><Input value={form.ocupacao_atual} onChange={(e) => setForm((prev) => ({ ...prev, ocupacao_atual: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Nome do pai</Label><Input value={form.nome_pai} onChange={(e) => setForm((prev) => ({ ...prev, nome_pai: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Nome da mãe</Label><Input value={form.nome_mae} onChange={(e) => setForm((prev) => ({ ...prev, nome_mae: e.target.value }))} /></div>
                </div>

                <h4 className="text-sm font-semibold text-slate-800">Dados familiares</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1"><Label>Tem filhos (sim/não)</Label><Input value={form.tem_filhos} onChange={(e) => setForm((prev) => ({ ...prev, tem_filhos: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Nº dependentes</Label><Input value={form.dependentes_qtd} onChange={(e) => setForm((prev) => ({ ...prev, dependentes_qtd: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Filho(a) 1 - nome</Label><Input value={form.filho1_nome} onChange={(e) => setForm((prev) => ({ ...prev, filho1_nome: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Filho(a) 1 - nascimento</Label><Input type="date" value={form.filho1_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, filho1_nascimento: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Filho(a) 2 - nome</Label><Input value={form.filho2_nome} onChange={(e) => setForm((prev) => ({ ...prev, filho2_nome: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Filho(a) 2 - nascimento</Label><Input type="date" value={form.filho2_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, filho2_nascimento: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Filho(a) 3 - nome</Label><Input value={form.filho3_nome} onChange={(e) => setForm((prev) => ({ ...prev, filho3_nome: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Filho(a) 3 - nascimento</Label><Input type="date" value={form.filho3_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, filho3_nascimento: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Doença na família (sim/não)</Label><Input value={form.doenca_familia} onChange={(e) => setForm((prev) => ({ ...prev, doenca_familia: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-3"><Label>Qual doença</Label><Input value={form.doenca_familia_qual} onChange={(e) => setForm((prev) => ({ ...prev, doenca_familia_qual: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Nome do(a) cônjuge</Label><Input value={form.nome_conjuge} onChange={(e) => setForm((prev) => ({ ...prev, nome_conjuge: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cônjuge - nascimento</Label><Input type="date" value={form.conjuge_nascimento} onChange={(e) => setForm((prev) => ({ ...prev, conjuge_nascimento: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cônjuge - RG</Label><Input value={form.conjuge_rg} onChange={(e) => setForm((prev) => ({ ...prev, conjuge_rg: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cônjuge - CPF</Label><Input value={form.conjuge_cpf} onChange={(e) => setForm((prev) => ({ ...prev, conjuge_cpf: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cônjuge é crente</Label><Input value={form.conjuge_e_crente} onChange={(e) => setForm((prev) => ({ ...prev, conjuge_e_crente: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Outro ministério (qual)</Label><Input value={form.conjuge_outro_ministerio} onChange={(e) => setForm((prev) => ({ ...prev, conjuge_outro_ministerio: e.target.value }))} /></div>
                </div>

                <h4 className="text-sm font-semibold text-slate-800">Dados ministeriais do(a) obreiro(a)</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1 xl:col-span-2"><Label>Denominação em que aceitou a Jesus</Label><Input value={form.denominacao_aceitou_jesus} onChange={(e) => setForm((prev) => ({ ...prev, denominacao_aceitou_jesus: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Data da conversão</Label><Input type="date" value={form.data_conversao} onChange={(e) => setForm((prev) => ({ ...prev, data_conversao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Batismo nas águas</Label><Input type="date" value={form.data_batismo_aguas} onChange={(e) => setForm((prev) => ({ ...prev, data_batismo_aguas: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Função ministerial (texto)</Label><Input value={form.funcao_ministerial_secundaria} onChange={(e) => setForm((prev) => ({ ...prev, funcao_ministerial_secundaria: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ordenação cooperador</Label><Input value={form.ordenacao_cooperador} onChange={(e) => setForm((prev) => ({ ...prev, ordenacao_cooperador: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ordenação diácono</Label><Input value={form.ordenacao_diacono} onChange={(e) => setForm((prev) => ({ ...prev, ordenacao_diacono: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ordenação presbítero</Label><Input value={form.ordenacao_presbitero} onChange={(e) => setForm((prev) => ({ ...prev, ordenacao_presbitero: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ordenação evangelista</Label><Input value={form.ordenacao_evangelista} onChange={(e) => setForm((prev) => ({ ...prev, ordenacao_evangelista: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ordenação voluntário</Label><Input value={form.ordenacao_voluntario} onChange={(e) => setForm((prev) => ({ ...prev, ordenacao_voluntario: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Possui credencial</Label><Input value={form.possui_credencial} onChange={(e) => setForm((prev) => ({ ...prev, possui_credencial: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Recebe prebenda</Label><Input value={form.recebe_prebenda} onChange={(e) => setForm((prev) => ({ ...prev, recebe_prebenda: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Há quanto tempo</Label><Input value={form.prebenda_tempo} onChange={(e) => setForm((prev) => ({ ...prev, prebenda_tempo: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Desde</Label><Input value={form.prebenda_desde} onChange={(e) => setForm((prev) => ({ ...prev, prebenda_desde: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Dirige alguma IPDA</Label><Input value={form.dirige_alguma_ipda} onChange={(e) => setForm((prev) => ({ ...prev, dirige_alguma_ipda: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Qual IPDA</Label><Input value={form.dirige_ipda_qual} onChange={(e) => setForm((prev) => ({ ...prev, dirige_ipda_qual: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Endereço da atual congregação</Label><Input value={form.endereco_atual_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, endereco_atual_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Bairro</Label><Input value={form.bairro_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, bairro_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cidade</Label><Input value={form.cidade_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, cidade_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>UF</Label><Input value={form.uf_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, uf_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>CEP</Label><Input value={form.cep_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, cep_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Dirigente</Label><Input value={form.dirigente_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, dirigente_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Telefone congregação</Label><Input value={form.tel_congregacao} onChange={(e) => setForm((prev) => ({ ...prev, tel_congregacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Sede setorial</Label><Input value={form.sede_setorial} onChange={(e) => setForm((prev) => ({ ...prev, sede_setorial: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Sucursal</Label><Input value={form.sucursal} onChange={(e) => setForm((prev) => ({ ...prev, sucursal: e.target.value }))} /></div>
                </div>

                <h4 className="text-sm font-semibold text-slate-800">Continuação - dados ministeriais</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1"><Label>Já dirigiu no exterior</Label><Input value={form.ja_dirigiu_exterior} onChange={(e) => setForm((prev) => ({ ...prev, ja_dirigiu_exterior: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Em quais cidades</Label><Input value={form.cidades_exterior} onChange={(e) => setForm((prev) => ({ ...prev, cidades_exterior: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Quais países</Label><Input value={form.paises_exterior} onChange={(e) => setForm((prev) => ({ ...prev, paises_exterior: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Doença no exterior (sim/não)</Label><Input value={form.doenca_exterior} onChange={(e) => setForm((prev) => ({ ...prev, doenca_exterior: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Quem</Label><Input value={form.doenca_exterior_quem} onChange={(e) => setForm((prev) => ({ ...prev, doenca_exterior_quem: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Quais</Label><Input value={form.doenca_exterior_quais} onChange={(e) => setForm((prev) => ({ ...prev, doenca_exterior_quais: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-4"><Label>Motivo da volta ao Brasil</Label><Textarea value={form.motivo_volta_brasil} onChange={(e) => setForm((prev) => ({ ...prev, motivo_volta_brasil: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Fala idioma fluente</Label><Input value={form.idioma_fluente} onChange={(e) => setForm((prev) => ({ ...prev, idioma_fluente: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Quais idiomas</Label><Input value={form.idioma_quais} onChange={(e) => setForm((prev) => ({ ...prev, idioma_quais: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Escolaridade</Label><Input value={form.escolaridade} onChange={(e) => setForm((prev) => ({ ...prev, escolaridade: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ano de destaque</Label><Input value={form.desempenho_ano} onChange={(e) => setForm((prev) => ({ ...prev, desempenho_ano: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-4"><Label>Opinião sobre maior desempenho ministerial</Label><Textarea value={form.desempenho_ministerio} onChange={(e) => setForm((prev) => ({ ...prev, desempenho_ministerio: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Já foi disciplinado</Label><Input value={form.foi_disciplinado} onChange={(e) => setForm((prev) => ({ ...prev, foi_disciplinado: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Quantas vezes</Label><Input value={form.disciplinado_quantas_vezes} onChange={(e) => setForm((prev) => ({ ...prev, disciplinado_quantas_vezes: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Motivo da disciplina</Label><Input value={form.disciplinado_motivo} onChange={(e) => setForm((prev) => ({ ...prev, disciplinado_motivo: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Fez curso ministerial</Label><Input value={form.curso_ministerial} onChange={(e) => setForm((prev) => ({ ...prev, curso_ministerial: e.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-3"><Label>Qual curso</Label><Input value={form.curso_ministerial_qual} onChange={(e) => setForm((prev) => ({ ...prev, curso_ministerial_qual: e.target.value }))} /></div>
                </div>

                <h4 className="text-sm font-semibold text-slate-800">Histórico de gestão em IPDAs</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1"><Label>Histórico 1 - ano</Label><Input value={form.historico_gestao_1_ano} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_1_ano: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 1 - IPDA</Label><Input value={form.historico_gestao_1_ipda} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_1_ipda: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 1 - UF</Label><Input value={form.historico_gestao_1_uf} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_1_uf: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 1 - tempo</Label><Input value={form.historico_gestao_1_tempo} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_1_tempo: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 2 - ano</Label><Input value={form.historico_gestao_2_ano} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_2_ano: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 2 - IPDA</Label><Input value={form.historico_gestao_2_ipda} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_2_ipda: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 2 - UF</Label><Input value={form.historico_gestao_2_uf} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_2_uf: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 2 - tempo</Label><Input value={form.historico_gestao_2_tempo} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_2_tempo: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 3 - ano</Label><Input value={form.historico_gestao_3_ano} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_3_ano: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 3 - IPDA</Label><Input value={form.historico_gestao_3_ipda} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_3_ipda: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 3 - UF</Label><Input value={form.historico_gestao_3_uf} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_3_uf: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Histórico 3 - tempo</Label><Input value={form.historico_gestao_3_tempo} onChange={(e) => setForm((prev) => ({ ...prev, historico_gestao_3_tempo: e.target.value }))} /></div>
                </div>

                <h4 className="text-sm font-semibold text-slate-800">Termo de compromisso do obreiro</h4>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1"><Label>Cidade do termo</Label><Input value={form.data_termo_cidade} onChange={(e) => setForm((prev) => ({ ...prev, data_termo_cidade: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Dia</Label><Input value={form.data_termo_dia} onChange={(e) => setForm((prev) => ({ ...prev, data_termo_dia: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Mês</Label><Input value={form.data_termo_mes} onChange={(e) => setForm((prev) => ({ ...prev, data_termo_mes: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ano</Label><Input value={form.data_termo_ano} onChange={(e) => setForm((prev) => ({ ...prev, data_termo_ano: e.target.value }))} /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1"><Label>Testemunha 1 - Nome</Label><Input value={form.testemunha1_nome} onChange={(e) => setForm((prev) => ({ ...prev, testemunha1_nome: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Testemunha 1 - Documento</Label><Input value={form.testemunha1_documento} onChange={(e) => setForm((prev) => ({ ...prev, testemunha1_documento: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Testemunha 2 - Nome</Label><Input value={form.testemunha2_nome} onChange={(e) => setForm((prev) => ({ ...prev, testemunha2_nome: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Testemunha 2 - Documento</Label><Input value={form.testemunha2_documento} onChange={(e) => setForm((prev) => ({ ...prev, testemunha2_documento: e.target.value }))} /></div>
                </div>
                <div className="space-y-1">
                  <Label>Observações do termo</Label>
                  <Textarea value={form.observacoes_termo} onChange={(e) => setForm((prev) => ({ ...prev, observacoes_termo: e.target.value }))} />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={savingDraft}>
                <Save className="mr-2 h-4 w-4" /> {savingDraft ? "Salvando..." : "Salvar rascunho"}
              </Button>
              <Button onClick={sendToGenerateDocs} disabled={sending}>
                <Send className="mr-2 h-4 w-4" /> {sending ? "Enviando..." : "Gerar documento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </ManagementShell>
  );
}
