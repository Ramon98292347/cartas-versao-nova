import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Calendar, Building2, ArrowRight } from "lucide-react";
import { Church } from "./ChurchSearch";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LetterPreviewProps {
  pregadorNome: string;
  igrejaOrigem?: Church;
  igrejaDestino?: Church;
  dataPregacao: string;
  dataEmissao: string;
}

export function LetterPreview({
  pregadorNome,
  igrejaOrigem,
  igrejaDestino,
  dataPregacao,
  dataEmissao,
}: LetterPreviewProps) {
  const hasData = pregadorNome || igrejaOrigem || igrejaDestino || dataPregacao || dataEmissao;

  if (!hasData) {
    return (
      <Card className="card-shadow border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            Pré-visualização da Carta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Preencha o formulário para visualizar a carta
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Pré-visualização da Carta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pregadorNome && (
          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
            <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Pregador</p>
              <p className="text-sm font-semibold text-foreground">{pregadorNome}</p>
            </div>
          </div>
        )}

        {(igrejaOrigem || igrejaDestino) && (
          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
            <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Rota</p>
              <div className="flex items-center gap-2 flex-wrap">
                {igrejaOrigem && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">{igrejaOrigem.nome}</p>
                    {(igrejaOrigem.cidade || igrejaOrigem.uf) && (
                      <p className="text-xs text-muted-foreground">
                        {igrejaOrigem.cidade} {igrejaOrigem.cidade && igrejaOrigem.uf ? "-" : ""} {igrejaOrigem.uf}
                      </p>
                    )}
                  </div>
                )}
                {igrejaOrigem && igrejaDestino && (
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                )}
                {igrejaDestino && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">{igrejaDestino.nome}</p>
                    {(igrejaDestino.cidade || igrejaDestino.uf) && (
                      <p className="text-xs text-muted-foreground">
                        {igrejaDestino.cidade} {igrejaDestino.cidade && igrejaDestino.uf ? "-" : ""} {igrejaDestino.uf}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dataPregacao && (
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Data da Pregação</p>
                <p className="text-sm font-semibold text-foreground">
                  {(() => {
                    try {
                      return format(parse(dataPregacao, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR });
                    } catch {
                      return dataPregacao;
                    }
                  })()}
                </p>
              </div>
            </div>
          )}

          {dataEmissao && (
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Data de Emissão</p>
                <p className="text-sm font-semibold text-foreground">
                  {(() => {
                    try {
                      return format(parse(dataEmissao, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR });
                    } catch {
                      return dataEmissao;
                    }
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>

        {igrejaOrigem && (
          <div className="pt-3 border-t border-border space-y-1">
            <p className="text-xs text-muted-foreground">Carimbo da Igreja: {igrejaOrigem.carimboIgreja}</p>
            <p className="text-xs text-muted-foreground">Carimbo do Pastor: {igrejaOrigem.carimboPastor}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
