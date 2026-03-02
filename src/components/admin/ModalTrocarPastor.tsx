import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/endpoints";
import { getFriendlyError } from "@/lib/error-map";
import { addAuditLog } from "@/lib/audit";

type Pastor = {
  id: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  is_active?: boolean;
};

type ChurchRow = {
  totvs_id: string;
  church_name: string;
  pastor_user_id?: string | null;
  pastor?: {
    id?: string | null;
    full_name?: string | null;
  } | null;
};

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <button className="rounded-lg border px-3 py-1 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalTrocarPastor({
  open,
  onClose,
  church,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  church: ChurchRow | null;
  onSaved?: () => void;
}) {
  const [loadingPastors, setLoadingPastors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [selectedPastorId, setSelectedPastorId] = useState("");

  const currentPastorName = church?.pastor?.full_name || "Nao definido";
  const churchLabel = church ? `${church.church_name} (TOTVS ${church.totvs_id})` : "";

  useEffect(() => {
    if (!open || !church) return;
    setSelectedPastorId(church.pastor_user_id || church.pastor?.id || "");
    loadPastors("");
  }, [open, church?.totvs_id]);

  async function loadPastors(q: string) {
    setLoadingPastors(true);
    try {
      const res: any = await api.listPastors({ search: q, page: 1, page_size: 50 });
      setPastors(Array.isArray(res?.pastors) ? res.pastors : []);
    } catch {
      toast.error("Falha ao carregar pastores.");
    } finally {
      setLoadingPastors(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pastors;
    return pastors.filter((p) => {
      const name = String(p.full_name || "").toLowerCase();
      const cpf = String(p.cpf || "").toLowerCase();
      const phone = String(p.phone || "").toLowerCase();
      return name.includes(q) || cpf.includes(q) || phone.includes(q);
    });
  }, [pastors, search]);

  async function handleSave() {
    if (!church) return;
    if (!selectedPastorId) {
      toast.error("Selecione um pastor.");
      return;
    }

    const currentPastorId = church.pastor_user_id || church.pastor?.id || "";
    if (selectedPastorId === currentPastorId) {
      toast.message("Nenhuma alteracao realizada.");
      onClose();
      return;
    }

    setSaving(true);
    try {
      await api.setChurchPastor({
        church_totvs_id: church.totvs_id,
        pastor_user_id: selectedPastorId,
      });
      toast.success("Pastor atualizado com sucesso.");
      addAuditLog("church_pastor_changed", { church_totvs_id: church.totvs_id, pastor_user_id: selectedPastorId });
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(getFriendlyError(err, "churches"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Trocar Pastor da Igreja">
      {!church ? (
        <div className="text-sm text-slate-600">Nenhuma igreja selecionada.</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">{churchLabel}</div>
            <div className="mt-1 text-xs text-slate-600">
              Pastor atual: <span className="font-medium">{currentPastorName}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Buscar pastor</Label>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite nome, CPF ou telefone..."
                className="h-11 rounded-xl"
              />
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => loadPastors(search)} disabled={loadingPastors}>
                {loadingPastors ? "Carregando..." : "Pesquisar"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Selecione o pastor</Label>
            <div className="max-h-64 overflow-auto rounded-xl border">
              {loadingPastors ? <div className="p-4 text-sm text-slate-600">Carregando lista...</div> : null}
              {!loadingPastors && filtered.length === 0 ? <div className="p-4 text-sm text-slate-600">Nenhum pastor encontrado.</div> : null}
              {!loadingPastors && filtered.length > 0 ? (
                <ul className="divide-y">
                  {filtered.map((p) => {
                    const active = selectedPastorId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`w-full px-4 py-3 text-left transition ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                          onClick={() => setSelectedPastorId(p.id)}
                        >
                          <div className="text-sm font-semibold text-slate-900">{p.full_name}</div>
                          <div className="mt-0.5 text-xs text-slate-600">CPF: {p.cpf || "-"} | Tel: {p.phone || "-"}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" className="rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
