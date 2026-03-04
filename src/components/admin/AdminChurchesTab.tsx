import { FormEvent, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Church, LayoutGrid, List } from "lucide-react";
import { ModalTrocarPastor } from "@/components/admin/ModalTrocarPastor";
import { ChurchDocsDialog } from "@/components/admin/ChurchDocsDialog";
import { createChurch, deactivateChurch, type ChurchInScopeItem } from "@/services/saasService";
import { getFriendlyError } from "@/lib/error-map";
import { addAuditLog } from "@/lib/audit";

type NewChurchForm = {
  totvs_id: string;
  church_name: string;
  class: "estadual" | "setorial" | "central" | "regional" | "local";
  parent_totvs_id: string;
};

type ChurchTab = "lista" | "remanejamento" | "contrato";
type ChurchView = "lista" | "grid";

const initialForm: NewChurchForm = {
  totvs_id: "",
  church_name: "",
  class: "local",
  parent_totvs_id: "",
};

function getChurchImage(church: ChurchInScopeItem): string | null {
  const maybe = church as ChurchInScopeItem & {
    image_url?: string | null;
    photo_url?: string | null;
    cover_url?: string | null;
  };
  return String(maybe.image_url || maybe.photo_url || maybe.cover_url || "").trim() || null;
}

function ChurchAvatar({ church, compact = false }: { church: ChurchInScopeItem; compact?: boolean }) {
  const imageUrl = getChurchImage(church);
  const cls = compact ? "h-12 w-16" : "h-24 w-full";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`Imagem da igreja ${church.church_name}`}
        className={`${cls} rounded-lg border border-slate-200 object-cover`}
      />
    );
  }

  return (
    <div className={`flex ${cls} items-center justify-center rounded-lg border border-slate-200 bg-slate-50`}>
      <Church className="h-8 w-8 text-slate-400" />
    </div>
  );
}

export function AdminChurchesTab({
  rows,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  rows: ChurchInScopeItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<ChurchInScopeItem | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<NewChurchForm>(initialForm);
  const [savingNew, setSavingNew] = useState(false);
  const [busyChurchId, setBusyChurchId] = useState<string | null>(null);

  const [docsOpen, setDocsOpen] = useState(false);
  const [docsInitialTab, setDocsInitialTab] = useState<"remanejamento" | "contrato" | "laudo">("remanejamento");
  const [docsChurch, setDocsChurch] = useState<ChurchInScopeItem | null>(null);

  const [editingChurch, setEditingChurch] = useState<ChurchInScopeItem | null>(null);
  const [editForm, setEditForm] = useState<NewChurchForm>(initialForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const [tab, setTab] = useState<ChurchTab>("lista");
  const [view, setView] = useState<ChurchView>("lista");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aName = String(a.church_name || "").toLowerCase();
      const bName = String(b.church_name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [rows]);

  function openPastorModal(church: ChurchInScopeItem) {
    setSelectedChurch(church);
    setModalOpen(true);
  }

  async function refetchChurches() {
    await queryClient.invalidateQueries({ queryKey: ["churches-in-scope"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-church-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["pastor-igrejas-page"] });
  }

  async function onCreateChurch(e: FormEvent) {
    e.preventDefault();
    if (!newForm.totvs_id.trim()) {
      toast.error("TOTVS e obrigatorio.");
      return;
    }
    if (!newForm.church_name.trim()) {
      toast.error("Nome da igreja e obrigatorio.");
      return;
    }

    setSavingNew(true);
    try {
      await createChurch({
        totvs_id: newForm.totvs_id.trim(),
        church_name: newForm.church_name.trim(),
        class: newForm.class,
        parent_totvs_id: newForm.parent_totvs_id.trim() || undefined,
      });
      toast.success("Igreja criada com sucesso.");
      addAuditLog("church_created", { church_totvs_id: newForm.totvs_id.trim() });
      setNewOpen(false);
      setNewForm(initialForm);
      await refetchChurches();
    } catch (err: unknown) {
      toast.error(getFriendlyError(err, "churches"));
    } finally {
      setSavingNew(false);
    }
  }

  async function onDeleteChurch(church: ChurchInScopeItem) {
    if (!window.confirm(`Tem certeza que deseja desativar a igreja ${church.church_name}?`)) return;
    setBusyChurchId(church.totvs_id);
    try {
      await deactivateChurch(church.totvs_id);
      toast.success("Igreja desativada.");
      addAuditLog("church_deactivated", { church_totvs_id: church.totvs_id });
      await refetchChurches();
    } catch (err: unknown) {
      toast.error(getFriendlyError(err, "churches"));
    } finally {
      setBusyChurchId(null);
    }
  }

  function openEditModal(church: ChurchInScopeItem) {
    setEditingChurch(church);
    setEditForm({
      totvs_id: church.totvs_id,
      church_name: church.church_name,
      class: (church.church_class || "local") as NewChurchForm["class"],
      parent_totvs_id: String(church.parent_totvs_id || ""),
    });
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingChurch) return;

    setSavingEdit(true);
    try {
      // Comentario: usa a mesma function para manter um unico fluxo de gravacao.
      await createChurch({
        totvs_id: editForm.totvs_id.trim(),
        church_name: editForm.church_name.trim(),
        class: editForm.class,
        parent_totvs_id: editForm.parent_totvs_id.trim() || undefined,
      });
      toast.success("Igreja atualizada com sucesso.");
      setEditingChurch(null);
      await refetchChurches();
    } catch (err: unknown) {
      toast.error(getFriendlyError(err, "churches"));
    } finally {
      setSavingEdit(false);
    }
  }

  function openChurchDocs(church: ChurchInScopeItem, initial: "remanejamento" | "contrato") {
    setDocsChurch(church);
    setDocsInitialTab(initial);
    setDocsOpen(true);
  }

  function renderCommonInfo(church: ChurchInScopeItem) {
    return (
      <>
        <p className="truncate text-base font-semibold text-slate-900">{church.church_name}</p>
        <p className="text-sm text-slate-500">TOTVS {church.totvs_id}</p>
        <p className="text-sm text-slate-600 capitalize">Classe: {church.church_class || "-"}</p>
        <p className="text-sm text-slate-600">Pastor: {church.pastor?.full_name || "Nao definido"}</p>
        <p className="text-sm text-slate-600">Obreiros: {church.workers_count ?? 0}</p>
      </>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Igrejas cadastradas</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant={view === "lista" ? "default" : "outline"} size="sm" onClick={() => setView("lista")}>
                <List className="mr-2 h-4 w-4" /> Lista
              </Button>
              <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid")}>
                <LayoutGrid className="mr-2 h-4 w-4" /> Grid
              </Button>
              <Button onClick={() => setNewOpen(true)}>Nova Igreja</Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant={tab === "lista" ? "default" : "outline"} onClick={() => setTab("lista")}>Lista</Button>
            <Button variant={tab === "remanejamento" ? "default" : "outline"} onClick={() => setTab("remanejamento")}>Remanejamento</Button>
            <Button variant={tab === "contrato" ? "default" : "outline"} onClick={() => setTab("contrato")}>Contratos</Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {tab === "lista" && view === "lista" ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[1080px]">
                  <div className="grid grid-cols-[100px_92px_1fr_130px_200px_110px_1fr] border-y border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                    <span>TOTVS</span>
                    <span>Imagem</span>
                    <span>Nome</span>
                    <span>Classe</span>
                    <span>Pastor</span>
                    <span>Status</span>
                    <span>Acoes</span>
                  </div>

                  {sortedRows.map((church) => (
                    <div key={church.totvs_id} className="grid grid-cols-[100px_92px_1fr_130px_200px_110px_1fr] items-center border-b border-slate-200 px-5 py-3 text-sm">
                      <span>{church.totvs_id}</span>
                      <div className="pr-2">
                        <ChurchAvatar church={church} compact />
                      </div>
                      <span className="truncate">{church.church_name}</span>
                      <span className="capitalize">{church.church_class || "-"}</span>
                      <span className="truncate">{church.pastor?.full_name || "Nao definido"}</span>
                      <span>
                        <Badge
                          variant="outline"
                          className={church.is_active === false ? "border-rose-200 bg-rose-100 text-rose-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}
                        >
                          {church.is_active === false ? "Inativa" : "Ativa"}
                        </Badge>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openPastorModal(church)}>
                          Troca rapida
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(church)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDeleteChurch(church)} disabled={busyChurchId === church.totvs_id}>
                          {busyChurchId === church.totvs_id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {sortedRows.length === 0 ? <div className="px-5 py-4 text-sm text-slate-500">Nenhuma igreja encontrada no escopo.</div> : null}
                </div>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {sortedRows.map((church) => (
                  <Card key={`mobile-${church.totvs_id}`} className="border border-slate-200 shadow-sm">
                    <CardContent className="space-y-3 p-4">
                      <ChurchAvatar church={church} />
                      {renderCommonInfo(church)}
                      <Badge
                        variant="outline"
                        className={church.is_active === false ? "border-rose-200 bg-rose-100 text-rose-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}
                      >
                        {church.is_active === false ? "Inativa" : "Ativa"}
                      </Badge>
                      <div className="grid grid-cols-3 gap-2">
                        <Button size="sm" variant="outline" onClick={() => openPastorModal(church)}>
                          Troca
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(church)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDeleteChurch(church)} disabled={busyChurchId === church.totvs_id}>
                          {busyChurchId === church.totvs_id ? "..." : "Excluir"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {sortedRows.length === 0 ? <p className="text-sm text-slate-500">Nenhuma igreja encontrada no escopo.</p> : null}
              </div>
            </>
          ) : null}

          {tab === "lista" && view === "grid" ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedRows.map((church) => (
                <Card key={church.totvs_id} className="border border-slate-200 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <ChurchAvatar church={church} />
                    {renderCommonInfo(church)}
                    <div className="pt-2">
                      <Badge
                        variant="outline"
                        className={church.is_active === false ? "border-rose-200 bg-rose-100 text-rose-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}
                      >
                        {church.is_active === false ? "Inativa" : "Ativa"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPastorModal(church)}>
                        Troca rapida
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(church)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteChurch(church)} disabled={busyChurchId === church.totvs_id}>
                        {busyChurchId === church.totvs_id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {tab !== "lista" ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedRows.map((church) => (
                <Card key={`${tab}-${church.totvs_id}`} className="border border-slate-200 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <ChurchAvatar church={church} />
                    {renderCommonInfo(church)}
                    <Button
                      className="w-full"
                      onClick={() => openChurchDocs(church, tab === "remanejamento" ? "remanejamento" : "contrato")}
                    >
                      {tab === "remanejamento" ? "Abrir remanejamento" : "Abrir contrato"}
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {sortedRows.length === 0 ? <p className="text-sm text-slate-500">Nenhuma igreja encontrada no escopo.</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-slate-600">Pagina {page} / {totalPages}</span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Proxima
        </Button>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Igreja</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onCreateChurch}>
            <div className="space-y-1">
              <Label>TOTVS *</Label>
              <Input value={newForm.totvs_id} onChange={(e) => setNewForm((p) => ({ ...p, totvs_id: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Nome da igreja *</Label>
              <Input value={newForm.church_name} onChange={(e) => setNewForm((p) => ({ ...p, church_name: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Classe *</Label>
              <Select value={newForm.class} onValueChange={(v) => setNewForm((p) => ({ ...p, class: v as NewChurchForm["class"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estadual">estadual</SelectItem>
                  <SelectItem value="setorial">setorial</SelectItem>
                  <SelectItem value="central">central</SelectItem>
                  <SelectItem value="regional">regional</SelectItem>
                  <SelectItem value="local">local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Parent TOTVS (opcional)</Label>
              <Input value={newForm.parent_totvs_id} onChange={(e) => setNewForm((p) => ({ ...p, parent_totvs_id: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)} disabled={savingNew}>Cancelar</Button>
              <Button type="submit" disabled={savingNew}>{savingNew ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingChurch)} onOpenChange={(open) => !open && setEditingChurch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar igreja</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSaveEdit}>
            <div className="space-y-1">
              <Label>TOTVS *</Label>
              <Input value={editForm.totvs_id} disabled />
            </div>

            <div className="space-y-1">
              <Label>Nome da igreja *</Label>
              <Input value={editForm.church_name} onChange={(e) => setEditForm((p) => ({ ...p, church_name: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Classe *</Label>
              <Select value={editForm.class} onValueChange={(v) => setEditForm((p) => ({ ...p, class: v as NewChurchForm["class"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estadual">estadual</SelectItem>
                  <SelectItem value="setorial">setorial</SelectItem>
                  <SelectItem value="central">central</SelectItem>
                  <SelectItem value="regional">regional</SelectItem>
                  <SelectItem value="local">local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Parent TOTVS (opcional)</Label>
              <Input value={editForm.parent_totvs_id} onChange={(e) => setEditForm((p) => ({ ...p, parent_totvs_id: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingChurch(null)} disabled={savingEdit}>Cancelar</Button>
              <Button type="submit" disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ModalTrocarPastor
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        church={selectedChurch}
        onSaved={refetchChurches}
      />

      <ChurchDocsDialog
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        church={docsChurch}
        initialTab={docsInitialTab}
      />
    </>
  );
}
