import { useState, useCallback } from "react";
import { Camera, Brain, Eye, Mic, Languages, Zap, Maximize2, Images } from "lucide-react";
import FullscreenImageViewer from "../../../shared/components/FullscreenImageViewer";

interface EvidenceFrame {
  frame_image: string;
  fer_emotion: string | null;
  fer_confidence: number;
}

interface EvidenceSnapshotProps {
  frameImage: string | null;
  evidenceFrames?: EvidenceFrame[] | null;
  questionNumber: number;
  ferEmotion: string | null;
  ferConfidence: number;
  serEmotion: string | null;
  serConfidence: number;
  lerEmotion: string | null;
  lerConfidence: number;
  fusionEmotion: string;
  fusionConfidence: number;
  explanation: string;
}

export default function EvidenceSnapshot({
  frameImage,
  evidenceFrames,
  questionNumber,
  ferEmotion,
  ferConfidence,
  serEmotion,
  serConfidence,
  lerEmotion,
  lerConfidence,
  fusionEmotion,
  fusionConfidence,
  explanation,
}: EvidenceSnapshotProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

  // Build images array for the viewer
  const allFrames = evidenceFrames && evidenceFrames.length > 0
    ? evidenceFrames.map((f) => f.frame_image)
    : frameImage
      ? [frameImage]
      : [];

  const frameLabels = evidenceFrames && evidenceFrames.length > 0
    ? evidenceFrames.map((f, i) => `Frame ${i + 1} — ${f.fer_emotion || "?"} ${f.fer_confidence > 0 ? `(${fmtPct(f.fer_confidence)})` : ""}`)
    : undefined;

  const handleOpenViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const toSrc = (img: string) => img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;

  const frameCount = evidenceFrames?.length || (frameImage ? 1 : 0);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Camera size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Evidence Snapshot</span>
          {frameCount > 1 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              <Images size={10} />
              {frameCount} frames
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[auto_1fr]">
          {/* Captured frame(s) */}
          <div className="flex flex-col items-center gap-2">
            {frameImage ? (
              <button
                type="button"
                onClick={() => handleOpenViewer(0)}
                className="group relative cursor-pointer"
                aria-label="View captured frame fullscreen"
              >
                <img
                  src={toSrc(frameImage)}
                  alt={`Captured frame at Q${questionNumber}`}
                  className="h-[105px] w-[140px] rounded-lg border border-slate-200 object-cover transition group-hover:brightness-90"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition group-hover:bg-black/20">
                  <Maximize2 size={16} className="text-white opacity-0 transition group-hover:opacity-100" />
                </div>
              </button>
            ) : (
              <div className="flex h-[105px] w-[140px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                <span className="text-[11px] text-slate-400">No frame captured</span>
              </div>
            )}
            <span className="text-[10px] text-slate-400">
              {frameCount > 1 ? `Best of ${frameCount} frames — click to browse` : "Captured at response time"}
            </span>

            {/* Filmstrip — thumbnails of all evidence frames */}
            {evidenceFrames && evidenceFrames.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[280px]">
                {evidenceFrames.map((frame, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleOpenViewer(i)}
                    className="group relative shrink-0 cursor-pointer"
                    aria-label={`View frame ${i + 1}`}
                  >
                    <img
                      src={toSrc(frame.frame_image)}
                      alt={`Frame ${i + 1}`}
                      className="h-[52px] w-[70px] rounded border border-slate-200 object-cover transition group-hover:brightness-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded bg-black/0 transition group-hover:bg-black/20">
                      <Maximize2 size={10} className="text-white opacity-0 transition group-hover:opacity-100" />
                    </div>
                    {frame.fer_emotion && (
                      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-0.5 text-[8px] text-white text-center">
                        {frame.fer_emotion}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Evidence details */}
          <div className="space-y-2.5">
            {/* Model results row */}
            <div className="grid grid-cols-3 gap-2">
              {/* FER */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Eye size={12} className="text-blue-500" />
                <div>
                  <p className="text-[10px] text-slate-400">FER</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {ferEmotion || "—"} {ferConfidence > 0 ? `(${fmtPct(ferConfidence)})` : ""}
                  </p>
                </div>
              </div>

              {/* SER */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Mic size={12} className="text-teal-500" />
                <div>
                  <p className="text-[10px] text-slate-400">SER</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {serEmotion || "—"} {serConfidence > 0 ? `(${fmtPct(serConfidence)})` : ""}
                  </p>
                </div>
              </div>

              {/* LER */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Languages size={12} className="text-purple-500" />
                <div>
                  <p className="text-[10px] text-slate-400">LER</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {lerEmotion || "—"} {lerConfidence > 0 ? `(${fmtPct(lerConfidence)})` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Fusion result */}
            <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
              <Zap size={14} className="mt-0.5 text-indigo-500" />
              <div>
                <p className="text-[10px] font-medium text-indigo-600">Fusion</p>
                <p className="text-sm font-bold text-indigo-800">
                  {fusionEmotion} ({fmtPct(fusionConfidence)})
                </p>
              </div>
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Brain size={12} className="mt-0.5 text-slate-400" />
                <p className="text-[11px] leading-relaxed text-slate-600 italic">{explanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen viewer */}
      {viewerOpen && allFrames.length > 0 && (
        <FullscreenImageViewer
          images={allFrames}
          currentIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onNavigate={setViewerIndex}
          labels={frameLabels}
        />
      )}
    </>
  );
}
