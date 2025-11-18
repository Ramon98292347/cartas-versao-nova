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
