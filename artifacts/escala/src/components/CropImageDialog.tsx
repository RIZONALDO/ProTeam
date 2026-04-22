import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crop as CropIcon, ZoomIn, ZoomOut } from "lucide-react";

interface CropImageDialogProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const outputSize = Math.min(512, Math.max(pixelCrop.width * scaleX, pixelCrop.height * scaleY));
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export function CropImageDialog({ open, imageSrc, onConfirm, onCancel }: CropImageDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  async function handleConfirm() {
    if (!completedCrop || !imgRef.current) return;
    const blob = await getCroppedBlob(imgRef.current, completedCrop);
    onConfirm(blob);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-4 w-4" />
            Recortar foto
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Arraste a área de seleção para escolher o rosto ou a parte desejada da foto.
        </p>

        <div className="flex justify-center max-h-[420px] overflow-auto rounded-lg bg-muted/40 p-2">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            minWidth={40}
            minHeight={40}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Recortar foto"
              onLoad={onImageLoad}
              style={{ maxHeight: "400px", maxWidth: "100%", objectFit: "contain" }}
            />
          </ReactCrop>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
          <ZoomIn className="h-3 w-3" />
          <span>O recorte será salvo em formato quadrado (1:1)</span>
          <ZoomOut className="h-3 w-3" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!completedCrop?.width || !completedCrop?.height}>
            <CropIcon className="h-4 w-4 mr-2" />
            Confirmar recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
