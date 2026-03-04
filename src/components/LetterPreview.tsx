import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Calendar, Building2, ArrowRight, Mail, BadgeCheck, Phone } from "lucide-react";
import { Church } from "./ChurchSearch";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LetterPreviewProps {
  pregadorNome: string;
  igrejaOrigem?: Church;
  igrejaDestino?: Church;
  dataPregacao: string;
  dataEmissao: string;
  email?: string;
  ministerial?: string;
  dataSeparacao?: string;
  pastorResponsavel?: string;
  telefonePastorResponsavel?: string;
}

function formatIsoDate(value: string) {
  try {
    return format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

export function LetterPreview({
  pregadorNome,
  igrejaOrigem,
  igrejaDestino,
  dataPregacao,
  dataEmissao,
  email,
  ministerial,
  dataSeparacao,
  pastorResponsavel,
  telefonePastorResponsavel,
}: LetterPreviewProps) {
  const hasData = pregadorNome || igrejaOrigem || igrejaDestino || dataPregacao || dataEmissao;

  if (!hasData) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-emerald-500" />
            Pré-visualização da Carta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-slate-500">Preencha o formulário para visualizar a carta.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-cyan-50">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <FileText className="h-5 w-5 text-emerald-500" />
          Pré-visualização da Carta
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {pregadorNome ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pregador</p>
            <div className="space-y-1 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold text-slate-900"><User className="h-4 w-4 text-emerald-500" /> {pregadorNome}</p>
              {email ? <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /> {email}</p> : null}
              {ministerial ? <p className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-slate-500" /> {ministerial}</p> : null}
            </div>
          </div>
        ) : null}

        {(igrejaOrigem || igrejaDestino) ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Igreja de origem e destino</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              {igrejaOrigem ? <span className="font-semibold text-slate-900">{igrejaOrigem.nome}</span> : null}
              {igrejaOrigem && igrejaDestino ? <ArrowRight className="h-4 w-4 text-slate-500" /> : null}
              {igrejaDestino ? <span className="font-semibold text-slate-900">{igrejaDestino.nome}</span> : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="h-4 w-4" />
              <span>{igrejaOrigem?.codigoTotvs || "-"}</span>
              {igrejaDestino?.codigoTotvs ? <span>• {igrejaDestino.codigoTotvs}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {dataPregacao ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Data da pregação</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Calendar className="h-4 w-4 text-emerald-500" />
                {formatIsoDate(dataPregacao)}
              </p>
            </div>
          ) : null}

          {dataEmissao ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Data de emissão</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Calendar className="h-4 w-4 text-emerald-500" />
                {formatIsoDate(dataEmissao)}
              </p>
            </div>
          ) : null}

          {dataSeparacao ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Data de separação</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Calendar className="h-4 w-4 text-emerald-500" />
                {formatIsoDate(dataSeparacao)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pastor responsável da igreja</p>
          <div className="space-y-1 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{pastorResponsavel || "Não informado"}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /> {telefonePastorResponsavel || "-"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
