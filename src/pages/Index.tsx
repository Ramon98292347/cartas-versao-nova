import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChurchSearch, Church } from "@/components/ChurchSearch";
import { LetterPreview } from "@/components/LetterPreview";
import { igrejasMock } from "@/data/mockChurches";
import { FileText, RotateCcw, Send, Church as ChurchIcon } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [pregadorNome, setPregadorNome] = useState("");
  const [igrejaOrigem, setIgrejaOrigem] = useState<Church | undefined>();
  const [igrejaDestino, setIgrejaDestino] = useState<Church | undefined>();
  const [dataPregacao, setDataPregacao] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Integration with backend (Supabase + n8n) will be added here
    toast.success(
      "Solicitação registrada (modo demonstração). Integração com backend será adicionada depois.",
      {
        duration: 5000,
      }
    );
  };

  const handleClear = () => {
    setPregadorNome("");
    setIgrejaOrigem(undefined);
    setIgrejaDestino(undefined);
    setDataPregacao("");
    setDataEmissao("");
    toast.info("Formulário limpo");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <ChurchIcon className="h-8 w-8" />
              <span className="text-2xl font-bold">LOGO IPDA</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Sistema de Cartas – IPDA Estadual de Vitória
            </h1>
            <p className="text-lg md:text-xl font-semibold tracking-wide bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full">
              MAIS QUE IGREJA, UMA FAMÍLIA
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Card */}
          <Card className="card-shadow hover:card-shadow-hover transition-shadow duration-300 border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                <FileText className="h-6 w-6 text-primary" />
                Registro de Carta de Recomendação
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Preencha os dados para emissão da carta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome do Pregador */}
                <div className="space-y-2">
                  <Label htmlFor="pregador" className="text-sm font-medium text-foreground">
                    Nome do pregador
                  </Label>
                  <Input
                    id="pregador"
                    type="text"
                    placeholder="Digite o nome completo"
                    value={pregadorNome}
                    onChange={(e) => setPregadorNome(e.target.value)}
                    className="bg-card border-input focus:border-primary focus:ring-primary transition-colors"
                    required
                  />
                </div>

                {/* Igreja Origem */}
                <ChurchSearch
                  label="Igreja que faz a carta (origem)"
                  placeholder="Buscar por nome ou código TOTVS"
                  churches={igrejasMock}
                  onSelect={setIgrejaOrigem}
                  value={igrejaOrigem ? `${igrejaOrigem.codigoTotvs} - ${igrejaOrigem.nome}` : ""}
                />

                {/* Igreja Destino */}
                <ChurchSearch
                  label="Igreja que vai pregar (destino)"
                  placeholder="Buscar por nome ou código TOTVS"
                  churches={igrejasMock}
                  onSelect={setIgrejaDestino}
                  value={igrejaDestino ? `${igrejaDestino.codigoTotvs} - ${igrejaDestino.nome}` : ""}
                />

                {/* Datas */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataPregacao" className="text-sm font-medium text-foreground">
                      Data da pregação
                    </Label>
                    <Input
                      id="dataPregacao"
                      type="date"
                      value={dataPregacao}
                      onChange={(e) => setDataPregacao(e.target.value)}
                      className="bg-card border-input focus:border-primary focus:ring-primary transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataEmissao" className="text-sm font-medium text-foreground">
                      Data de emissão da carta
                    </Label>
                    <Input
                      id="dataEmissao"
                      type="date"
                      value={dataEmissao}
                      onChange={(e) => setDataEmissao(e.target.value)}
                      className="bg-card border-input focus:border-primary focus:ring-primary transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Registrar solicitação
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="border-border hover:bg-secondary/50 text-foreground transition-colors"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Limpar formulário
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <div className="lg:sticky lg:top-8 h-fit">
            <LetterPreview
              pregadorNome={pregadorNome}
              igrejaOrigem={igrejaOrigem}
              igrejaDestino={igrejaDestino}
              dataPregacao={dataPregacao}
              dataEmissao={dataEmissao}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
