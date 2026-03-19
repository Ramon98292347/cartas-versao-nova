import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, FileText, Loader2, Phone, Search, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLetterByPastor, fetchAncestorChain, listChurchesInScope } from "@/services/saasService";
import type { AncestorChainItem } from "@/services/saasService";
import type { Church } from "@/components/ChurchSearch";

// Tipo do pregador alvo da carta
export type LetterTarget = {
  userId: string;
  nome: string;
  telefone: string;
  ministerRole: string;
  // TOTVS da propria igreja do obreiro/pastor
  churchTotvsId: string;
  // TOTVS do pai da igreja do obreiro (para buscar escopo mais amplo)
  parentTotvsId?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterTarget: LetterTarget | null;
  onSuccess?: () => void;
}

// Normaliza e formata texto de destino manual (ex: "9901 piuma niteroi" → "9901 - PIUMA NITEROI")
function normalizeManual(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{1,10})\s*[-)\s]?\s*(.+)$/);
  if (!match) return raw.toUpperCase();
  const totvs = match[1].trim();
  const nome = match[2].trim().replace(/\s+/g, " ").toUpperCase();
  return nome ? `${totvs} - ${nome}` : totvs;
}

// Converte lista da API para o tipo Church do formulario
function apiToChurch(c: { totvs_id?: string | null; church_name?: string | null; address_city?: string | null; address_state?: string | null; stamp_church_url?: string | null; church_class?: string | null; parent_totvs_id?: string | null }, idx: number): Church {
  return {
    id: Number(c.totvs_id) || idx + 1,
    codigoTotvs: String(c.totvs_id || ""),
    nome: String(c.church_name || ""),
    cidade: String(c.address_city || ""),
    uf: String(c.address_state || ""),
    carimboIgreja: String(c.stamp_church_url || ""),
    carimboPastor: "",
    classificacao: String(c.church_class || ""),
    parentTotvsId: String(c.parent_totvs_id || "") || undefined,
  };
}

export function PastorLetterDialog({ open, onOpenChange, letterTarget, onSuccess }: Props) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateIso = maxDate.toISOString().slice(0, 10);

  const [originTotvs, setOriginTotvs] = useState("");
  const [destino, setDestino] = useState<Church | null>(null);
  const [destinoSearch, setDestinoSearch] = useState("");
  // Campo "Outros": texto livre digitado pelo usuario
  const [destinoOutros, setDestinoOutros] = useState("");
  const [preachDate, setPreachDate] = useState("");
  const [preachPeriod, setPreachPeriod] = useState<"MANHA" | "TARDE" | "NOITE" | "">("");
  const [saving, setSaving] = useState(false);

  // ─── Escopo proprio: igreja do obreiro/pastor ───────────────────────────────
  // Carrega as igrejas do escopo proprio da igreja do alvo
  const { data: ownScopeChurches = [] } = useQuery({
    queryKey: ["churches-dialog-own", letterTarget?.churchTotvsId],
    queryFn: async () => {
      const rows = await listChurchesInScope(1, 1000, letterTarget?.churchTotvsId || undefined);
      return rows.map(apiToChurch);
    },
    enabled: open && Boolean(letterTarget?.churchTotvsId),
    staleTime: 60_000,
    refetchInterval: 10000,
  });

  // ─── Escopo da mae: todas as igrejas do pai (escopo mais amplo) ─────────────
  // Busca o parent totvs da propria igreja do alvo
  const targetParentTotvs = useMemo(() => {
    if (letterTarget?.parentTotvsId) return letterTarget.parentTotvsId;
    const own = ownScopeChurches.find((c) => c.codigoTotvs === letterTarget?.churchTotvsId);
    return own?.parentTotvsId || "";
  }, [letterTarget, ownScopeChurches]);

  const { data: parentScopeChurches = [] } = useQuery({
    queryKey: ["churches-dialog-parent", targetParentTotvs],
    queryFn: async () => {
      const rows = await listChurchesInScope(1, 1000, targetParentTotvs || undefined);
      return rows.map(apiToChurch);
    },
    enabled: open && Boolean(targetParentTotvs),
    staleTime: 60_000,
    refetchInterval: 10000,
  });

  // ─── Ancestrais acima da igreja do alvo (para mae mais alta no campo Outros) ─
  // ancestor_chain retorna [pai, avo, bisavo, ...] — o ULTIMO com pastor e o mais alto.
  // Regra: campo "Outros" sempre usa estadual > setorial > central como origem.
  const { data: ancestorChain = [] } = useQuery<AncestorChainItem[]>({
    queryKey: ["churches-ancestor-chain", letterTarget?.churchTotvsId],
    queryFn: () => fetchAncestorChain(letterTarget?.churchTotvsId || ""),
    enabled: open && Boolean(letterTarget?.churchTotvsId),
    staleTime: 60_000,
  });

  // Mae mais alta com pastor: percorre o ancestorChain do final (mais alto) para o inicio
  const highestSignerForOthers = useMemo<AncestorChainItem | null>(() => {
    for (let i = ancestorChain.length - 1; i >= 0; i--) {
      if (ancestorChain[i].pastor?.full_name) return ancestorChain[i];
    }
    return null;
  }, [ancestorChain]);

  // ─── Todas as igrejas do banco (para o campo Outros) ────────────────────────
  const { data: allChurches = [] } = useQuery({
    queryKey: ["churches-dialog-all"],
    queryFn: async () => {
      const rows = await listChurchesInScope(1, 5000);
      return rows.map(apiToChurch);
    },
    enabled: open,
    staleTime: 5 * 60_000,
    refetchInterval: 10000,
  });

  // ─── Resets ao abrir o dialog ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setOriginTotvs(letterTarget?.churchTotvsId || "");
    setDestino(null);
    setDestinoSearch("");
    setDestinoOutros("");
    setPreachDate("");
    setPreachPeriod("");
  }, [open, letterTarget]);

  // ─── Igrejas de destino disponíveis (escopo da mae ou proprio) ───────────────
  // Se o alvo tem mae, usa escopo da mae (mais amplo). Senao usa proprio.
  const destinationSourceChurches = useMemo(
    () => (parentScopeChurches.length ? parentScopeChurches : ownScopeChurches),
    [parentScopeChurches, ownScopeChurches],
  );

  // Set de TOTVS do escopo proprio (para detectar se destino e fora do escopo)
  const ownScopeSet = useMemo(
    () => new Set(ownScopeChurches.map((c) => c.codigoTotvs).filter(Boolean)),
    [ownScopeChurches],
  );
  // Set de TOTVS do escopo da mae
  const parentScopeSet = useMemo(
    () => new Set(destinationSourceChurches.map((c) => c.codigoTotvs).filter(Boolean)),
    [destinationSourceChurches],
  );

  // Igreja propria do alvo
  const targetChurch = useMemo(
    () => destinationSourceChurches.find((c) => c.codigoTotvs === letterTarget?.churchTotvsId) || null,
    [destinationSourceChurches, letterTarget?.churchTotvsId],
  );

  // Igreja mae do alvo
  const parentChurch = useMemo(
    () => (targetParentTotvs ? destinationSourceChurches.find((c) => c.codigoTotvs === targetParentTotvs) || null : null),
    [destinationSourceChurches, targetParentTotvs],
  );

  // Origens permitidas: [propria, mae]
  const allowedOrigins = useMemo(() => {
    const list: Church[] = [];
    if (targetChurch) list.push(targetChurch);
    if (parentChurch && parentChurch.codigoTotvs !== targetChurch?.codigoTotvs) list.push(parentChurch);
    return list.length ? list : ownScopeChurches.slice(0, 3);
  }, [targetChurch, parentChurch, ownScopeChurches]);

  // ─── Ajuste automatico de origem ────────────────────────────────────────────
  // Se o destino escolhido esta no escopo da mae mas NAO no escopo proprio
  // → a origem deve mudar automaticamente para a mae
  const shouldUseParentOrigin = useMemo(() => {
    if (!destino || !parentChurch || !targetChurch) return false;
    const d = destino.codigoTotvs;
    return parentScopeSet.has(d) && !ownScopeSet.has(d);
  }, [destino, parentChurch, targetChurch, parentScopeSet, ownScopeSet]);

  // Para campo Outros: usa a mae MAIS ALTA disponivel como origem (estadual > setorial > central).
  // highestSignerForOthers e o ancestral mais alto com pastor retornado pelo backend.
  const shouldUseParentOriginForOthers = Boolean(destinoOutros.trim() && (highestSignerForOthers || parentChurch));

  useEffect(() => {
    if (shouldUseParentOrigin || shouldUseParentOriginForOthers) {
      // Para "Outros": usa a mae mais alta (estadual > setorial > central)
      // Para destino fora do escopo proprio: usa a mae direta
      const parentTotvs = shouldUseParentOriginForOthers && highestSignerForOthers
        ? highestSignerForOthers.totvs_id
        : parentChurch?.codigoTotvs || targetParentTotvs;
      if (parentTotvs) setOriginTotvs(parentTotvs);
    } else if (!shouldUseParentOrigin && !shouldUseParentOriginForOthers) {
      // Volta para a propria quando o destino esta dentro do escopo proprio
      const ownTotvs = targetChurch?.codigoTotvs || letterTarget?.churchTotvsId || "";
      if (ownTotvs && originTotvs !== ownTotvs && !allowedOrigins.some((c) => c.codigoTotvs === originTotvs)) {
        setOriginTotvs(ownTotvs);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldUseParentOrigin, shouldUseParentOriginForOthers, parentChurch, targetChurch, highestSignerForOthers]);

  // ─── Igreja de origem selecionada ───────────────────────────────────────────
  // Estadual pode estar apenas no ancestor_chain (acima do escopo). Verifica la tambem.
  const originChurch = useMemo(() => {
    const found = allChurches.find((c) => c.codigoTotvs === originTotvs)
      || destinationSourceChurches.find((c) => c.codigoTotvs === originTotvs)
      || null;
    if (found) return found;
    const anc = ancestorChain.find((a) => a.totvs_id === originTotvs);
    if (anc) return { id: 0, codigoTotvs: anc.totvs_id, nome: anc.church_name, cidade: "", uf: "", carimboIgreja: "", carimboPastor: "", classificacao: "", parentTotvsId: anc.parent_totvs_id || undefined } as Church;
    return null;
  }, [allChurches, destinationSourceChurches, originTotvs, ancestorChain]);

  // ─── Opcoes de destino filtradas pelo texto digitado ────────────────────────
  const filteredDestinoOptions = useMemo(() => {
    const q = destinoSearch.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (q.length < 2) return [];
    return destinationSourceChurches
      .filter((c) => {
        const hay = `${c.codigoTotvs} ${c.nome} ${c.classificacao || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return hay.includes(q);
      })
      .slice(0, 15);
  }, [destinationSourceChurches, destinoSearch]);

  // ─── Campo Outros: busca em TODAS as igrejas do banco ───────────────────────
  const filteredOutrosOptions = useMemo(() => {
    const q = destinoOutros.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (q.length < 2) return [];
    return allChurches
      .filter((c) => {
        const hay = `${c.codigoTotvs} ${c.nome}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return hay.includes(q);
      })
      .slice(0, 15);
  }, [allChurches, destinoOutros]);

  // ─── Preview ─────────────────────────────────────────────────────────────────
  const formatDateBr = (iso: string) => {
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const previewOriginName = originChurch
    ? `${originChurch.codigoTotvs} - ${originChurch.nome}`
    : originTotvs || "-";
  const previewDestination = destino
    ? `${destino.codigoTotvs} - ${destino.nome}`
    : destinoOutros.trim() || "-";

  // Aviso quando a origem foi ajustada automaticamente para a mae
  const originAdjustedMessage = (shouldUseParentOrigin || shouldUseParentOriginForOthers)
    ? shouldUseParentOriginForOthers && highestSignerForOthers
      ? `Destino fora do escopo. A carta sera emitida pela: ${highestSignerForOthers.totvs_id} - ${highestSignerForOthers.church_name}.`
      : parentChurch
        ? `Destino fora do seu escopo. A origem foi ajustada para a mae: ${parentChurch.codigoTotvs} - ${parentChurch.nome}.`
        : null
    : null;

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!letterTarget) return;
    if (!preachPeriod) { toast.error("Selecione o periodo da pregacao."); return; }
    if (!preachDate) { toast.error("Selecione a data da pregacao."); return; }
    if (preachDate < todayIso) { toast.error("A data de pregacao deve ser hoje ou no futuro."); return; }
    if (!destino && !destinoOutros.trim()) { toast.error("Selecione a igreja de destino ou informe em Outros."); return; }

    const origemText = originChurch
      ? `${originChurch.codigoTotvs} - ${originChurch.nome}`
      : originTotvs;
    const destinoText = destino
      ? `${destino.codigoTotvs} - ${destino.nome}`
      : normalizeManual(destinoOutros);

    try {
      setSaving(true);
      await createLetterByPastor({
        church_totvs_id: originChurch?.codigoTotvs || originTotvs,
        preacher_name: letterTarget.nome,
        preacher_user_id: letterTarget.userId || undefined,
        minister_role: letterTarget.ministerRole || "Obreiro",
        preach_date: preachDate,
        preach_period: preachPeriod,
        church_origin: origemText,
        church_destination: destinoText,
        phone: (letterTarget.telefone || "").replace(/\D/g, ""),
        email: null,
      });
      toast.success("Carta criada e enviada para geracao do PDF.");
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao criar carta. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>Registro de Carta de Pregacao</DialogTitle>
          <DialogDescription>
            O pastor pode tirar carta para o usuario da linha ou para si mesmo. A origem segue a regra da igreja dele e da igreja mae.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.35fr_1fr]">
          {/* ── Coluna esquerda: formulario ──────────────────────────────── */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-start gap-2 text-xl font-display text-slate-900 sm:items-center sm:text-2xl">
                <FileText className="h-6 w-6 text-primary" /> Registro de Carta de Pregacao
              </CardTitle>
              <CardDescription>Preencha os dados para emissao da carta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Nome do pregador */}
              <div className="space-y-2">
                <Label>Nome do pregador</Label>
                <Input value={letterTarget?.nome || ""} disabled />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={letterTarget?.telefone || ""} disabled placeholder="Telefone do pregador" />
              </div>

              {/* Igreja de origem — muda automaticamente conforme o destino */}
              <div className="space-y-2">
                <Label>Igreja que faz a carta (origem)</Label>
                <Select value={originTotvs} onValueChange={setOriginTotvs}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOrigins.map((c) => (
                      <SelectItem key={c.codigoTotvs} value={c.codigoTotvs}>
                        {c.codigoTotvs} - {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Aviso quando a origem foi ajustada automaticamente */}
                {originAdjustedMessage && (
                  <p className="text-xs text-amber-700">{originAdjustedMessage}</p>
                )}
              </div>

              {/* Funcao ministerial */}
              <div className="space-y-2">
                <Label>Funcao ministerial</Label>
                <Input value={letterTarget?.ministerRole || ""} disabled />
              </div>

              {/* Igreja de destino — escopo da mae */}
              <div className="space-y-2">
                <Label>Igreja que vai pregar (destino)</Label>

                {/* Seletor rapido (todas do escopo da mae) */}
                <Select
                  value=""
                  onValueChange={(value) => {
                    const found = destinationSourceChurches.find(
                      (c) => `${c.codigoTotvs} - ${c.nome}` === value,
                    );
                    if (found) {
                      setDestino(found);
                      setDestinoSearch(`${found.codigoTotvs} - ${found.nome}`);
                      setDestinoOutros("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma igreja do seu escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationSourceChurches.map((c) => {
                      const val = `${c.codigoTotvs} - ${c.nome}`;
                      return (
                        <SelectItem key={c.codigoTotvs} value={val}>
                          {val} {c.classificacao ? `(${c.classificacao})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Busca por texto */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={destinoSearch}
                    onChange={(e) => {
                      setDestinoSearch(e.target.value);
                      // Se apagou a busca, limpa o destino selecionado
                      if (!e.target.value.trim()) setDestino(null);
                    }}
                    placeholder="Digite o TOTVS ou nome da igreja"
                    disabled={!!destinoOutros.trim()}
                    className="pl-10"
                  />
                </div>

                {/* Lista de sugestoes da busca */}
                {filteredDestinoOptions.length > 0 && !destinoOutros.trim() && (
                  <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                    {filteredDestinoOptions.map((c) => (
                      <button
                        key={c.codigoTotvs}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                        onClick={() => {
                          setDestino(c);
                          setDestinoSearch(`${c.codigoTotvs} - ${c.nome}`);
                          setDestinoOutros("");
                        }}
                      >
                        <span className="font-medium text-slate-900">{c.codigoTotvs} - {c.nome}</span>
                        <span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{c.classificacao}</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Se escolher uma igreja do escopo no seletor, a origem volta para a igreja do seu papel logado. Se digitar um destino fora do escopo, a origem sobe para a igreja mae.
                </p>
              </div>

              {/* Outros: busca em TODAS as igrejas do banco */}
              <div className="space-y-2">
                <Label>Outros (se nao encontrar na lista)</Label>

                {/* Campo unico: digitar busca automaticamente, ao sair formata o valor */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={destinoOutros}
                    onChange={(e) => {
                      setDestinoOutros(e.target.value);
                      if (e.target.value.trim()) {
                        setDestino(null);
                        setDestinoSearch("");
                      }
                    }}
                    onBlur={(e) => {
                      // Formata "9530 campo grande" -> "9530 - CAMPO GRANDE"
                      const raw = e.target.value.trim();
                      if (!raw) return;
                      const match = raw.match(/^(\d{1,10})\s*[-)\s]?\s*(.+)$/);
                      const formatted = match
                        ? `${match[1].trim()} - ${match[2].trim().replace(/\s+/g, " ").toUpperCase()}`
                        : raw.toUpperCase();
                      setDestinoOutros(formatted);
                    }}
                    placeholder="Ex.: 9530 campo grande → 9530 - CAMPO GRANDE"
                    disabled={!!destino || !!destinoSearch.trim()}
                    className="pl-10"
                  />
                </div>

                {/* Lista de sugestoes do campo Outros (todas do banco) */}
                {filteredOutrosOptions.length > 0 && !destino && !destinoSearch.trim() && (
                  <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                    {filteredOutrosOptions.map((c) => (
                      <button
                        key={c.codigoTotvs}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                        onClick={() => {
                          const label = `${c.codigoTotvs} - ${c.nome}`;
                          setDestinoOutros(label);
                          setDestino(null);
                          setDestinoSearch("");
                        }}
                      >
                        <span className="font-medium text-slate-900">{c.codigoTotvs} - {c.nome}</span>
                        <span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{c.classificacao}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Modelo: <span className="font-medium">9901 - PIUMA-NITEROI</span>. Se digitar diferente, o sistema formata automaticamente ao sair do campo.
                </p>
              </div>

              {/* Data da pregacao e data de emissao */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data da pregacao</Label>
                  <Input
                    type="date"
                    min={todayIso}
                    max={maxDateIso}
                    value={preachDate}
                    onChange={(e) => setPreachDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de emissao da carta</Label>
                  <Input value={formatDateBr(todayIso)} disabled />
                </div>
              </div>

              {/* Periodo */}
              <div className="space-y-2">
                <Label>Periodo</Label>
                <Select
                  value={preachPeriod}
                  onValueChange={(v: "MANHA" | "TARDE" | "NOITE") => setPreachPeriod(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANHA">Manha</SelectItem>
                    <SelectItem value="TARDE">Tarde</SelectItem>
                    <SelectItem value="NOITE">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">A data da pregacao pode ser escolhida entre hoje e os proximos 30 dias.</p>
            </CardContent>
          </Card>

          {/* ── Coluna direita: pre-visualizacao ─────────────────────────── */}
          <Card className="overflow-hidden border-emerald-100 shadow-sm">
            <CardHeader className="bg-emerald-50/80">
              <CardTitle className="flex items-start gap-2 text-xl font-display text-slate-900 sm:items-center sm:text-2xl">
                <FileText className="h-6 w-6 text-emerald-600" /> Pre-visualizacao da Carta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">

              {/* Pregador */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pregador</p>
                <div className="flex items-start gap-3 text-slate-900 sm:items-center">
                  <UserCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-base font-semibold sm:text-lg">{letterTarget?.nome || "Nao informado"}</span>
                </div>
              </div>

              {/* Origem e destino */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Igreja de origem e destino</p>
                <div className="space-y-2 text-slate-900">
                  <div className="text-base font-semibold sm:text-lg">{previewOriginName}</div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{previewDestination}</span>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Data de emissao</p>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
                    <CalendarDays className="h-5 w-5 text-emerald-600" />
                    <span>{formatDateBr(todayIso)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Data da pregacao</p>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
                    <CalendarDays className="h-5 w-5 text-emerald-600" />
                    <span>{preachDate ? formatDateBr(preachDate) : "-"}</span>
                  </div>
                </div>
              </div>

              {/* Assinatura */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assinatura responsavel</p>
                <div className="space-y-2 text-slate-900">
                  <div className="text-base font-semibold sm:text-lg">{previewOriginName}</div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>Definido pela igreja de origem na geracao da carta</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botoes */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={saving}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar carta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
