import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const RATIOS = [
  { label: "3×4", value: 3 / 4 },
  { label: "1×1", value: 1 },
  { label: "4×3", value: 4 / 3 },
  { label: "Livre", value: 0 },
] as const;

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function rotateSize(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Aplica pré-processamento de flip na imagem (cria novo Blob URL).
 * Só é chamado quando flipH ou flipV muda para não sobrecarregar a UI.
 */
async function applyFlipToSrc(src: string, flipH: boolean, flipV: boolean): Promise<string> {
  if (!flipH && !flipV) return src;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(flipH ? img.width : 0, flipV ? img.height : 0);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob ? URL.createObjectURL(blob) : src);
      }, "image/png");
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/**
 * Recorta a imagem com rotação + fundo branco + remoção de fundo claro.
 * imageSrc já veio com flip pré-aplicado.
 */
async function cropImageToFile(
  imageSrc: string,
  crop: Area,
  rotation: number,
  whiteBg: boolean,
  removeBg: boolean,
  removeBgThreshold: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rad = (rotation * Math.PI) / 180;
      const { width: bw, height: bh } = rotateSize(img.width, img.height, rotation);

      // 1. Canvas com imagem rotacionada
      const rotCanvas = document.createElement("canvas");
      rotCanvas.width = bw;
      rotCanvas.height = bh;
      const rotCtx = rotCanvas.getContext("2d")!;
      rotCtx.translate(bw / 2, bh / 2);
      rotCtx.rotate(rad);
      rotCtx.translate(-img.width / 2, -img.height / 2);
      rotCtx.drawImage(img, 0, 0);

      // 2. Extrair área recortada
      const data = rotCtx.getImageData(crop.x, crop.y, crop.width, crop.height);

      // 3. Canvas final do tamanho do recorte
      const outCanvas = document.createElement("canvas");
      outCanvas.width = crop.width;
      outCanvas.height = crop.height;
      const outCtx = outCanvas.getContext("2d")!;

      if (whiteBg) {
        outCtx.fillStyle = "#ffffff";
        outCtx.fillRect(0, 0, crop.width, crop.height);
      }

      outCtx.putImageData(data, 0, 0);

      // 4. Remoção de fundo claro (threshold)
      if (removeBg) {
        const imgData = outCtx.getImageData(0, 0, crop.width, crop.height);
        const px = imgData.data;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] >= removeBgThreshold && px[i + 1] >= removeBgThreshold && px[i + 2] >= removeBgThreshold) {
            // quanto mais claro, mais transparente
            const excess = px[i] - removeBgThreshold;
            const maxExcess = 255 - removeBgThreshold;
            px[i + 3] = Math.max(0, px[i + 3] - Math.round((excess / maxExcess) * 255));
          }
        }
        outCtx.putImageData(imgData, 0, 0);
      }

      outCanvas.toBlob((blob) => {
        if (!blob) return reject(new Error("canvas_empty"));
        resolve(new File([blob], "foto-editada.png", { type: "image/png" }));
      }, "image/png");
    };
    img.onerror = reject;
    img.src = imageSrc;
    img.crossOrigin = "anonymous";
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  imageSrc: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  allowWhiteBg?: boolean;
  defaultRatio?: number;
  title?: string;
}

export function ImageEditorModal({
  open,
  imageSrc,
  onConfirm,
  onCancel,
  allowWhiteBg = false,
  defaultRatio = 3 / 4,
  title = "Editar foto",
}: Props) {
  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [ratio, setRatio] = useState(defaultRatio);

  // Rotation state
  const [stepRotation, setStepRotation] = useState(0);   // múltiplos de 90°
  const [fineRotation, setFineRotation] = useState(0);   // ±45° slider
  const totalRotation = stepRotation + fineRotation;

  // Flip state — aplicado via pre-processamento no src
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // processedSrc: imageSrc com flip pré-aplicado
  const [processedSrc, setProcessedSrc] = useState(imageSrc);
  const prevFlipRef = useRef({ h: false, v: false });
  const prevOrigSrc = useRef(imageSrc);

  // Background controls
  const [whiteBg, setWhiteBg] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);
  const [removeBgThreshold, setRemoveBgThreshold] = useState(200);

  const [saving, setSaving] = useState(false);

  // Resetar estado quando modal abre com nova imagem
  useEffect(() => {
    if (imageSrc !== prevOrigSrc.current) {
      prevOrigSrc.current = imageSrc;
      setProcessedSrc(imageSrc);
      setStepRotation(0);
      setFineRotation(0);
      setFlipH(false);
      setFlipV(false);
      setWhiteBg(false);
      setRemoveBg(false);
      setRemoveBgThreshold(200);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      prevFlipRef.current = { h: false, v: false };
    }
  }, [imageSrc]);

  // Reprocessar flip quando flipH ou flipV mudam
  useEffect(() => {
    const prev = prevFlipRef.current;
    if (prev.h === flipH && prev.v === flipV) return;
    prevFlipRef.current = { h: flipH, v: flipV };

    // Revogar src anterior se era blob criado por nós
    const oldSrc = processedSrc;
    const wasBlob = oldSrc !== imageSrc && oldSrc.startsWith("blob:");

    applyFlipToSrc(imageSrc, flipH, flipV).then((newSrc) => {
      if (wasBlob) URL.revokeObjectURL(oldSrc);
      setProcessedSrc(newSrc);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    });
  }, [flipH, flipV]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function rotateStep(delta: number) {
    setStepRotation((r) => (r + delta + 360) % 360);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await cropImageToFile(
        processedSrc,
        croppedAreaPixels,
        totalRotation,
        whiteBg,
        removeBg,
        removeBgThreshold,
      );
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Revogar blob intermediário se houver
    if (processedSrc !== imageSrc && processedSrc.startsWith("blob:")) {
      URL.revokeObjectURL(processedSrc);
    }
    onCancel();
  }

  const iconBtn =
    "flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-700 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 active:scale-95";
  const iconBtnActive = "border-sky-500 bg-sky-50 text-sky-700";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg flex-col gap-3 overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Área de recorte */}
        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-72">
          <Cropper
            image={processedSrc}
            crop={crop}
            zoom={zoom}
            rotation={totalRotation}
            aspect={ratio === 0 ? undefined : ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: "0.75rem" },
              cropAreaStyle: { border: "2px solid #0ea5e9" },
            }}
          />
        </div>

        <div className="space-y-3">
          {/* Zoom */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Zoom</Label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-sky-500"
            />
          </div>

          {/* Rotação em passos + flip */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Rotação e espelhamento</Label>
            <div className="flex gap-2">
              <button type="button" className={iconBtn} onClick={() => rotateStep(-90)} title="Girar 90° esquerda">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" className={iconBtn} onClick={() => rotateStep(90)} title="Girar 90° direita">
                <RotateCw className="h-4 w-4" />
              </button>
              <div className="mx-1 w-px bg-slate-200" />
              <button
                type="button"
                className={`${iconBtn} ${flipH ? iconBtnActive : ""}`}
                onClick={() => setFlipH((v) => !v)}
                title="Espelhar horizontal"
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`${iconBtn} ${flipV ? iconBtnActive : ""}`}
                onClick={() => setFlipV((v) => !v)}
                title="Espelhar vertical"
              >
                <FlipVertical className="h-4 w-4" />
              </button>
              <div className="ml-auto flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-mono text-slate-600">
                {totalRotation % 360}°
              </div>
            </div>
          </div>

          {/* Ajuste fino de rotação */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500">Endireitar</Label>
              <span className="text-xs font-mono text-slate-500">
                {fineRotation > 0 ? "+" : ""}
                {fineRotation.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              step={0.5}
              value={fineRotation}
              onChange={(e) => setFineRotation(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-sky-500"
            />
          </div>

          {/* Proporção */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Proporção</Label>
            <div className="flex gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRatio(r.value)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    ratio === r.value
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fundo */}
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <Label className="text-xs text-slate-500">Tratamento de fundo</Label>

            {/* Remover fundo claro */}
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  className="h-4 w-4 accent-sky-500"
                />
                Remover fundo claro
                <span className="text-xs text-slate-400">(assinatura, carimbo)</span>
              </label>
              {removeBg && (
                <div className="ml-6 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Sensibilidade</span>
                    <span>{removeBgThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={255}
                    step={5}
                    value={removeBgThreshold}
                    onChange={(e) => setRemoveBgThreshold(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-sky-500"
                  />
                  <p className="text-xs text-slate-400">
                    Menor = remove apenas brancos puros &nbsp;|&nbsp; Maior = remove tons mais escuros
                  </p>
                </div>
              )}
            </div>

            {/* Adicionar fundo branco */}
            {allowWhiteBg && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={whiteBg}
                  onChange={(e) => setWhiteBg(e.target.checked)}
                  className="h-4 w-4 accent-sky-500"
                />
                Adicionar fundo branco
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving || !croppedAreaPixels}>
            {saving ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
