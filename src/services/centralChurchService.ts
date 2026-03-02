import { supabase } from "@/lib/supabase";

type IgrejaRow = { totvs_id: string; church_name: string; class: string | null };

export async function fetchCentralChurches() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("churches")
    .select("totvs_id,church_name,class");

  if (error || !Array.isArray(data)) return [];

  const rows = data as IgrejaRow[];
  const isTarget = (c: string | null) => {
    const s = (c || "").toLowerCase();
    return s.includes("central") || s.includes("setorial") || s.includes("estadual");
  };

  return rows
    .filter((d) => isTarget(d.class))
    .map((d, idx) => ({
      id: Number(d.totvs_id) || idx + 1,
      codigoTotvs: d.totvs_id,
      nome: d.church_name,
      cidade: "",
      uf: "",
      carimboIgreja: "",
      carimboPastor: "",
    }));
}
