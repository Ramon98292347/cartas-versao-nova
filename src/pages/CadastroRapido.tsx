import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChurchSearch, Church } from "@/components/ChurchSearch";
import { useUser } from "@/context/UserContext";
import { insertUsuario } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import { fetchChurches } from "@/services/churchService";
import { toast } from "sonner";

export default function CadastroRapido() {
  const nav = useNavigate();
  const { telefone, setUsuario } = useUser();
  const [nome, setNome] = useState("");
  const [igreja, setIgreja] = useState<Church | undefined>(undefined);
  const [igrejaOutros, setIgrejaOutros] = useState("");
  const { data: churches = [] } = useQuery({ queryKey: ["churches"], queryFn: fetchChurches, staleTime: 60_000 });
  const logo = "/Polish_20220810_001501268%20(2).png";

  async function handleSave() {
    if (!nome || !telefone) { toast.error("Preencha nome e telefone"); return; }
    try {
      const novo = await insertUsuario({ nome, telefone, totvs: igreja?.codigoTotvs ?? null, igreja_nome: (igreja?.nome ?? igrejaOutros) || null });
      setUsuario({ id: novo.id, nome: novo.nome, telefone: novo.telefone, totvs: novo.totvs ?? null, igreja_nome: novo.igreja_nome ?? null });
      nav("/carta");
    } catch {
      toast.error("Falha ao salvar usuário");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <img src={logo} alt="Logo" className="mx-auto h-16 object-contain" />
        <h1 className="text-2xl font-bold text-center">Cadastro rápido do pregador</h1>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite o nome" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" value={telefone || ""} readOnly placeholder="(99) 99999-9999" />
        </div>
        <ChurchSearch label="Igreja (congregação)" placeholder="Buscar por nome ou código TOTVS" churches={churches} onSelect={setIgreja} value={igreja ? `${igreja.codigoTotvs} - ${igreja.nome}` : igrejaOutros} inputId="igreja-cadastro" />
        <div className="space-y-2">
          <Label htmlFor="igrejaOutros">Outros (se não encontrar)</Label>
          <Input id="igrejaOutros" value={igrejaOutros} onChange={(e) => setIgrejaOutros(e.target.value)} placeholder="Descreva a igreja" />
        </div>
        <Button onClick={handleSave} className="w-full">Salvar e continuar</Button>
      </div>
    </div>
  );
}