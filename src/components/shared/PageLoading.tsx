import { Loader2 } from "lucide-react";

export function PageLoading({
  title = "Carregando pagina",
  description = "Aguarde um instante...",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
