import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ModalTrocarPastor } from "@/components/admin/ModalTrocarPastor";
import { createChurch, deactivateChurch, type ChurchInScopeItem } from "@/services/saasService";
import { getFriendlyError } from "@/lib/error-map";
import { addAuditLog } from "@/lib/audit";

type NewChurchForm = {
  totvs_id: string;
  church_name: string;
  class: "estadual" | "setorial" | "central" | "regional" | "local";
  parent_totvs_id: string;
};

const initialForm: NewChurchForm = {
  totvs_id: "",
  church_name: "",
  class: "local",
  parent_totvs_id: "",
};

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

  function openPastorModal(church: ChurchInScopeItem) {
    setSelectedChurch(church);
    setModalOpen(true);
  }

  async function refetchChurches() {
    await queryClient.invalidateQueries({ queryKey: ["churches-in-scope"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-church-summary"] });
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
    } catch (err: any) {
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
    } catch (err: any) {
      toast.error(getFriendlyError(err, "churches"));
    } finally {
      setBusyChurchId(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Igrejas Cadastradas</CardTitle>
          <Button onClick={() => setNewOpen(true)}>Nova Igreja</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1240px]">
              <div className="grid grid-cols-[120px_1fr_140px_220px_120px_140px_1fr] border-y border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                <span>TOTVS</span>
                <span>Nome</span>
                <span>Classe</span>
                <span>Pastor atual</span>
                <span>Obreiros</span>
                <span>Status</span>
                <span>Acoes</span>
              </div>

              {rows.map((church) => (
                <div key={church.totvs_id} className="grid grid-cols-[120px_1fr_140px_220px_120px_140px_1fr] items-center border-b border-slate-200 px-5 py-3 text-sm">
                  <span className="whitespace-nowrap">{church.totvs_id}</span>
                  <span className="truncate">{church.church_name}</span>
                  <span className="capitalize">{church.church_class || "-"}</span>
                  <span className="truncate">{church.pastor?.full_name || "Nao definido"}</span>
                  <span>{church.workers_count ?? 0}</span>
                  <span>
                    <Badge variant="outline" className={church.is_active === false ? "border-rose-200 bg-rose-100 text-rose-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}>
                      {church.is_active === false ? "Inativa" : "Ativa"}
                    </Badge>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPastorModal(church)}>
                      Trocar Pastor
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteChurch(church)}
                      disabled={busyChurchId === church.totvs_id}
                    >
                      {busyChurchId === church.totvs_id ? "Excluindo..." : "Excluir"}
                    </Button>
                  </div>
                </div>
              ))}

              {rows.length === 0 ? <div className="px-5 py-4 text-sm text-slate-500">Nenhuma igreja encontrada no escopo.</div> : null}
            </div>
          </div>
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

      <ModalTrocarPastor
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        church={selectedChurch}
        onSaved={refetchChurches}
      />
    </>
  );
}
