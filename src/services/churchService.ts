import { igrejasMock } from "@/data/mockChurches";
import { supabase } from "@/lib/supabase";

type IgrejaRow = {
  totvs: string;
  nome: string;
  classificacao: string | null;
};

export async function fetchChurches() {
  if (!supabase) return igrejasMock;
  const { data, error } = await supabase
    .from("igreja")
    .select('totvs:"TOtvs", nome:"Nome da IPDA", classificacao:"Classificacao"');
  if (error || !Array.isArray(data)) return igrejasMock;
  return (data as IgrejaRow[]).map((d, idx) => ({
    id: Number(d.totvs) || idx + 1,
    codigoTotvs: d.totvs,
    nome: d.nome,
    cidade: "",
    uf: "",
    carimboIgreja: "",
    carimboPastor: "",
    classificacao: d.classificacao ?? undefined,
  }));
}

type PastorInfo = { totvs: string; pastor: string | null; telefone: string | null; email?: string | null; endereco?: string | null };

function pickField(row: Record<string, unknown>, hints: string[]): string | null {
  const keys = Object.keys(row || {});
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  for (const k of keys) {
    const nk = norm(k);
    for (const h of hints) {
      if (nk.includes(norm(h))) {
        const v = row[k];
        if (typeof v === "string") return v;
        if (v == null) return null;
        return String(v);
      }
    }
  }
  return null;
}

export async function getPastorByTotvs(totvs: string): Promise<PastorInfo | null> {
  if (!supabase) throw new Error("supabase-not-configured");
  const t = String(totvs || "").trim();
  if (!t) return null;
  const { data, error } = await supabase
    .from("igreja")
    .select("*")
    .eq('"TOtvs"', t)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const totvsVal = (row["TOtvs"] as string) || (row["totvs"] as string) || "";
  const pastorVal = pickField(row, ["Nome completo do Pastor", "Pastor"]);
  const telefoneVal = pickField(row, ["Telefone"]);
  const emailVal = pickField(row, ["E-mail", "Email"]);
  const enderecoVal = pickField(row, ["Endereço", "Endereco"]);
  return { totvs: totvsVal, pastor: pastorVal, telefone: telefoneVal, email: emailVal, endereco: enderecoVal };
}

export async function getPastorByNomeIgreja(nome: string): Promise<PastorInfo | null> {
  if (!supabase) throw new Error("supabase-not-configured");
  const n = String(nome || "").trim();
  if (!n) return null;
  const { data, error } = await supabase
    .from("igreja")
    .select("*")
    .eq('"Nome da IPDA"', n)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const totvsVal = (row["TOtvs"] as string) || (row["totvs"] as string) || "";
  const pastorVal = pickField(row, ["Nome completo do Pastor", "Pastor"]);
  const telefoneVal = pickField(row, ["Telefone"]);
  const emailVal = pickField(row, ["E-mail", "Email"]);
  const enderecoVal = pickField(row, ["Endereço", "Endereco"]);
  return { totvs: totvsVal, pastor: pastorVal, telefone: telefoneVal, email: emailVal, endereco: enderecoVal };
}

export async function getIgrejaAssetsByTotvs(totvs: string): Promise<{
  assinatura_url?: string | null;
  carimbo_igreja_url?: string | null;
  carimbo_pastor_url?: string | null;
  cidade?: string | null;
} | null> {
  if (!supabase) throw new Error("supabase-not-configured");
  const t = String(totvs || "").trim();
  if (!t) return null;
  const { data, error } = await supabase
    .from("igreja")
    .select("*")
    .eq('"TOtvs"', t)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const assinatura = pickField(row, ["assinatura", "assinatura url", "assinatura_url"]);
  const carimboIgreja = pickField(row, ["carimbo igreja", "carimbo da igreja", "carimbo_igreja"]);
  const carimboPastor = pickField(row, ["carimbo pastor", "carimbo do pastor", "carimbo_pastor"]);
  const cidade = pickField(row, ["Cidade"]);
  return {
    assinatura_url: assinatura,
    carimbo_igreja_url: carimboIgreja,
    carimbo_pastor_url: carimboPastor,
    cidade,
  };
}
