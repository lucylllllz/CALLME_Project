import { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Trash2, Palette, Upload } from "lucide-react";
import { toast } from "sonner";

interface SketchCanvasProps {
  open: boolean;
  onClose: () => void;
  onSave: (imageData: string) => void;
}

export function SketchCanvas({ open, onClose, onSave }: SketchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);

  // Initialize canvas when dialog opens
  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Fill with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set initial drawing settings
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [open]);

  // Update brush settings when they change
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
      }
    }
  }, [brushColor, brushSize]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    
    // Draw a small dot at the start point
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL("image/png");
      onSave(imageData);
      clearCanvas();
      onClose();
    }
  };

  const handleCancel = () => {
    clearCanvas();
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        // Clear canvas first
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scaling to fit image in canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        // Draw the image
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        toast.success("Image loaded! You can now draw on it.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const colors = [
    "#000000", // Black
    "#FF0000", // Red
    "#0000FF", // Blue
    "#00FF00", // Green
    "#FFA500", // Orange
    "#800080", // Purple
    "#FF69B4", // Pink
    "#8B4513", // Brown
  ];

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl border-2 border-emerald-300/60 shadow-2xl bg-gradient-to-br from-white to-emerald-50/30 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-md">
              <Palette className="size-5 text-white" />
            </div>
            Draw Your Sketch
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          {/* Canvas */}
          <div className="relative group">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="border-3 border-emerald-300/60 rounded-3xl cursor-crosshair bg-white shadow-2xl w-full hover:border-emerald-400 hover:shadow-emerald-200/50 transition-all duration-300"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ touchAction: 'none' }}
            />
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-emerald-200 text-xs text-slate-600">
              Draw with your mouse or touch
            </div>
          </div>

          {/* Drawing Tools */}
          <div className="flex flex-col gap-4 bg-gradient-to-br from-white to-emerald-50/50 p-6 rounded-3xl border-2 border-emerald-200/60 shadow-xl">
            {/* Color Picker */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-fit">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Palette className="size-5 text-emerald-700" />
                </div>
                <span className="text-sm text-slate-700">Color:</span>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`size-10 rounded-2xl border-3 transition-all hover:scale-110 shadow-lg hover:shadow-xl active:scale-95 ${
                      brushColor === color 
                        ? 'border-emerald-500 scale-110 ring-4 ring-emerald-200/60 shadow-xl' 
                        : 'border-white/80 hover:border-emerald-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-700 min-w-fit">Brush Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-1 h-3 bg-emerald-200 rounded-full appearance-none cursor-pointer accent-emerald-500 shadow-inner"
              />
              <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm min-w-[60px] text-center shadow-sm">
                {brushSize}px
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => uploadInputRef.current?.click()}
                className="flex-1 border-2 border-emerald-300/60 bg-white hover:bg-emerald-50 text-emerald-600 hover:border-emerald-400 rounded-2xl shadow-md hover:shadow-lg transition-all h-11 group"
              >
                <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors mr-2">
                  <Upload className="size-4 text-emerald-700" />
                </div>
                Upload Image to Edit
              </Button>
              <Button
                variant="outline"
                onClick={clearCanvas}
                className="flex-1 border-2 border-red-300/60 bg-white hover:bg-red-50 text-red-600 hover:border-red-400 rounded-2xl shadow-md hover:shadow-lg transition-all h-11 group"
              >
                <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors mr-2">
                  <Trash2 className="size-4 text-red-700" />
                </div>
                Clear Canvas
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-2 border-slate-300/60 hover:bg-slate-50 hover:border-slate-400 rounded-2xl shadow-md hover:shadow-lg transition-all h-11 px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 rounded-2xl h-11 px-6"
          >
            Save Sketch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
