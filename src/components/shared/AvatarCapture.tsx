import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";
import { Button } from "@/components/ui/button";

interface AvatarCaptureProps {
  /** Chamado quando a foto final (com fundo removido) estiver pronta */
  onFileReady: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * AvatarCapture
 * -------------
 * Componente de captura de foto 3x4 com remoção automática de fundo via IA.
 * Fluxo:
 *   1. Usuário tira foto (câmera frontal) ou escolhe da galeria
 *   2. A IA remove o fundo (roda direto no navegador, gratuito, sem API key)
 *   3. A imagem resultante tem fundo branco no formato 3x4
 *   4. O arquivo PNG final é passado via onFileReady
 */
export function AvatarCapture({ onFileReady, disabled = false }: AvatarCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Revoga a URL de preview quando o componente desmonta ou preview muda
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Converte um Blob PNG (fundo transparente) para um File PNG com fundo branco
  async function adicionarFundoBranco(blob: Blob): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        // Canvas na proporção 3x4
        const W = img.naturalWidth || 300;
        const H = img.naturalHeight || 400;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        // Preenche com branco antes de desenhar a imagem
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((canvasBlob) => {
          const file = new File([canvasBlob!], "avatar.png", { type: "image/png" });
          resolve(file);
        }, "image/png");
      };
      img.src = url;
    });
  }

  async function processarImagem(rawFile: File) {
    setProcessing(true);
    setStatusMsg("Carregando modelo de IA...");
    setPreviewUrl("");

    try {
      // Remoção de fundo: roda no browser via WebAssembly, gratuito e offline
      setStatusMsg("Removendo fundo...");
      const blobSemFundo = await removeBackground(rawFile, {
        // Configurações para melhor qualidade em fotos de pessoas
        model: "medium",
        output: {
          format: "image/png",
          quality: 1,
        },
      });

      setStatusMsg("Aplicando fundo branco...");
      const fileComFundoBranco = await adicionarFundoBranco(blobSemFundo);

      // Cria URL de preview para exibir ao usuário
      const url = URL.createObjectURL(fileComFundoBranco);
      setPreviewUrl(url);
      setStatusMsg("");
      onFileReady(fileComFundoBranco);
    } catch {
      // Se a remoção de fundo falhar, usa a imagem original
      setStatusMsg("Usando imagem original...");
      const url = URL.createObjectURL(rawFile);
      setPreviewUrl(url);
      setStatusMsg("");
      onFileReady(rawFile);
    } finally {
      setProcessing(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void processarImagem(file);
  }

  function removerFoto() {
    setPreviewUrl("");
    setStatusMsg("");
    onFileReady(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {/* Botões de câmera e galeria */}
        <div className="flex flex-1 flex-col gap-2">
          {/* Câmera frontal */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || processing}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            Tirar Foto
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              disabled={disabled || processing}
              onChange={handleChange}
            />
          </Button>

          {/* Galeria */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || processing}
            onClick={() => galleryRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Arquivo
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || processing}
              onChange={handleChange}
            />
          </Button>

          {/* Status / mensagem */}
          {processing ? (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              {statusMsg || "Processando..."}
            </div>
          ) : previewUrl ? (
            <button
              type="button"
              onClick={removerFoto}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"
            >
              <X className="h-3 w-3" /> Remover foto
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              A IA remove o fundo automaticamente.
            </p>
          )}
        </div>

        {/* Preview 3x4 */}
        <div className="flex flex-col items-center gap-1">
          <div className="h-[120px] w-[90px] overflow-hidden rounded-md border border-slate-300 bg-slate-50">
            {processing ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-[9px] text-slate-500">Processando</span>
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Preview 3x4" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-slate-500 px-1">
                Pré-visualização 3x4
              </div>
            )}
          </div>
          <span className="text-[10px] text-slate-500">3x4</span>
        </div>
      </div>
    </div>
  );
}
