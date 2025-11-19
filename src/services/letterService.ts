import { supabase } from "@/lib/supabase";

export async function createLetter(params: {
  pregador_nome: string;
  origem_church_id: number;
  destino_church_id: number;
  data_pregacao: string;
  data_emissao: string;
}) {
  if (!supabase) throw new Error("supabase-not-configured");
  const { error } = await supabase.from("letters").insert([
    {
      pregador_nome: params.pregador_nome,
      origem_church_id: params.origem_church_id,
      destino_church_id: params.destino_church_id,
      data_pregacao: params.data_pregacao,
      data_emissao: params.data_emissao,
    },
  ]);
  if (error) throw error;
}

export async function createCarta(params: {
  nome: string;
  igreja_origem: string;
  igreja_destino: string;
  dia_pregacao: string;
  data_emissao: string;
  email?: string | null;
  data_separacao?: string | null;
  ministerial?: string | null;
}) {
  if (!supabase) throw new Error("supabase-not-configured");
  const { error } = await supabase.from("carta").insert([
    {
      nome: params.nome,
      igreja_origem: params.igreja_origem,
      igreja_destino: params.igreja_destino,
      "dia_pregação": params.dia_pregacao,
      data_emissao: params.data_emissao,
      email: params.email ?? null,
      data_separacao: params.data_separacao ?? null,
      ministerial: params.ministerial ?? null,
    },
  ]);
  if (error) throw error;
}