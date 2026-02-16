import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { listCartasByIntervalo } from "@/services/letterService";
import { getPastorByTotvs, getPastorByNomeIgreja } from "@/services/churchService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UsuarioDashboard() {
  const { usuario } = useUser();
  const nav = useNavigate();
  const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const now = new Date();
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    const now = new Date();
    return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });

  const nome = (usuario?.nome || "").trim();
  const ministerial = usuario?.ministerial || "";
  const dataSeparacao = usuario?.data_separacao || "";
  const telefone = usuario?.telefone || "";
  const email = usuario?.email || "";
  const origem = usuario?.totvs ? `${usuario.totvs}${usuario.igreja_nome ? ` - ${usuario.igreja_nome}` : ""}` : (usuario?.igreja_nome || "");
  const central = usuario?.central_totvs ? `${usuario.central_totvs}${usuario.central_nome ? ` - ${usuario.central_nome}` : ""}` : (usuario?.central_nome || "");
  const [pastorResponsavel, setPastorResponsavel] = useState<string>("");
  const [telefonePastorResponsavel, setTelefonePastorResponsavel] = useState<string>("");
  const [pastorEmail, setPastorEmail] = useState<string>("");
  const [pastorEndereco, setPastorEndereco] = useState<string>("");

  const { data: cartas = [], isLoading, isError } = useQuery({
    queryKey: ["cartas", nome, dataInicio, dataFim],
    queryFn: async () => {
      if (!nome) return [];
      return listCartasByIntervalo({ nome, dataInicio, dataFim });
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const totvsMembro = String(usuario?.totvs || "").trim();
    const totvsCentral = String(usuario?.central_totvs || "").trim();
    const nomeIgreja = String(usuario?.igreja_nome || "").trim();
    (async () => {
      try {
        let r: { pastor?: string | null; telefone?: string | null } | null = null;
        if (totvsMembro) r = await getPastorByTotvs(totvsMembro);
        if (!r && totvsCentral) r = await getPastorByTotvs(totvsCentral);
        if (!r && nomeIgreja) r = await getPastorByNomeIgreja(nomeIgreja);
        setPastorResponsavel(r?.pastor || "");
        setTelefonePastorResponsavel(r?.telefone || "");
        const rEmail = (r && "email" in r) ? (r as { email?: string | null }).email : null;
        const rEndereco = (r && "endereco" in r) ? (r as { endereco?: string | null }).endereco : null;
        setPastorEmail(rEmail || "");
        setPastorEndereco(rEndereco || "");
      } catch {
        setPastorResponsavel("");
        setTelefonePastorResponsavel("");
      }
    })();
  }, [usuario?.totvs, usuario?.central_totvs, usuario?.igreja_nome]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src="/Polish_20220810_001501268%20(2).png" alt="Logo" className="h-12 w-auto rounded-md" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Sistema de Cartas de Pregação</h1>
              <p className="text-sm text-white/90">Dashboard do Usuário</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-semibold">{nome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm font-semibold">{telefone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="text-sm font-semibold">{email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ministerial</p>
              <p className="text-sm font-semibold">{ministerial}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data de Separação</p>
              <p className="text-sm font-semibold">
                {(() => {
                  if (!dataSeparacao) return "";
                  try { return format(parse(dataSeparacao, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR }); } catch { return dataSeparacao; }
                })()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Igreja de Origem</p>
              <p className="text-sm font-semibold">{origem}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Igreja Central</p>
              <p className="text-sm font-semibold">{central}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="flex-1 h-8 px-3 text-xs md:h-10 md:px-4 md:text-sm" onClick={() => nav("/carta")}>Gerar carta</Button>
          <Button variant="outline" className="h-8 px-3 text-xs md:h-10 md:px-4 md:text-sm" onClick={() => nav("/")}>Sair</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do seu pastor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Nome do pastor responsável</Label>
                <Input value={pastorResponsavel} readOnly className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Telefone do pastor</Label>
                <Input value={telefonePastorResponsavel} readOnly className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pastorEmail" className="text-sm font-medium text-foreground">E-mail do pastor</Label>
                <Input id="pastorEmail" type="email" value={pastorEmail} readOnly placeholder="email@exemplo.com" className="bg-muted border-input" />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label className="text-sm font-medium text-foreground">Endereço da igreja</Label>
                <Input value={pastorEndereco} readOnly className="bg-muted border-input" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Cartas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="dataInicio">Dia começo</Label>
                <Input id="dataInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataFim">Dia final</Label>
                <Input id="dataFim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-4">Criada em</th>
                    <th className="py-2 pr-4">Data Pregação</th>
                    <th className="py-2 pr-4">Data Emissão</th>
                    <th className="py-2 pr-4">Origem</th>
                    <th className="py-2 pr-4">Destino</th>
                    <th className="py-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="py-3" colSpan={6}>Carregando...</td></tr>
                  ) : isError ? (
                    <tr><td className="py-3" colSpan={6}>Falha ao buscar histórico. Verifique permissões (RLS).</td></tr>
                  ) : cartas.length === 0 ? (
                    <tr><td className="py-3" colSpan={6}>Nenhuma carta no período selecionado</td></tr>
                  ) : (
                    cartas.map((c, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 pr-4">
                          {(() => {
                            try {
                              return format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
                            } catch {
                              return c.created_at;
                            }
                          })()}
                        </td>
                        <td className="py-2 pr-4">{c["dia_pregação"] || ""}</td>
                        <td className="py-2 pr-4">
                          {(() => {
                            if (!c.data_emissao) return "";
                            try {
                              return format(parse(c.data_emissao, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR });
                            } catch {
                              return c.data_emissao;
                            }
                          })()}
                        </td>
                        <td className="py-2 pr-4">{c.igreja_origem}</td>
                        <td className="py-2 pr-4">{c.igreja_destino}</td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() =>
                                nav("/carta", {
                                  state: {
                                    reemitir: {
                                      nome: c.nome,
                                      igreja_origem: c.igreja_origem,
                                      igreja_destino: c.igreja_destino,
                                      dia_pregação: c["dia_pregação"] || "",
                                      data_emissao: c.data_emissao || "",
                                    },
                                  },
                                })
                              }
                            className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
                              Reemitir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
