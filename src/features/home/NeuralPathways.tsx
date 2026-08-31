import { useTranslation } from "react-i18next";
import { ExternalLink, Brain, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { evidenceData, neuralNodes, NEURAL_BACKGROUND_URL } from "@/lib/constants";
import type { EvidenceItem } from "@/types";

/** Interactive neural pathway visualization with clickable evidence nodes. */
export const NeuralPathways = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setMousePos({ x: -1000, y: -1000 });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-foreground/10 bg-brand"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        @keyframes organic-float {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(4px, -15px); }
        }
        .animate-float {
          animation: organic-float 4s ease-in-out infinite;
        }
      `}</style>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url(${NEURAL_BACKGROUND_URL})` }}
      />
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--foreground) / 0.4)" />
            <stop offset="100%" stopColor="hsl(var(--foreground) / 0)" />
          </radialGradient>
        </defs>

        {neuralNodes.map((node) => {
          const nodeX = (node.cx / 100) * dimensions.width;
          const nodeY = (node.cy / 100) * dimensions.height;
          const dist = Math.hypot(nodeX - mousePos.x, nodeY - mousePos.y);
          const isHovered = dist < 100;
          const glowIntensity = Math.max(0, 1 - dist / 200);

          return (
            <g
              key={node.id}
              className="cursor-pointer transition-all duration-300 animate-float"
              style={{ animationDelay: `${node.id * -0.7}s` }}
              onClick={() => setSelectedEvidence(evidenceData[node.id - 1])}
            >
              <circle
                cx={`${node.cx}%`}
                cy={`${node.cy}%`}
                r={isHovered ? 24 : 16}
                fill="hsl(var(--brand-primary) / 0.9)"
                stroke="hsl(var(--brand-accent))"
                strokeWidth="1"
                className="transition-all duration-300"
              />
              <circle
                cx={`${node.cx}%`}
                cy={`${node.cy}%`}
                r={40 + glowIntensity * 40}
                fill="url(#glow)"
                opacity={glowIntensity}
                className="pointer-events-none transition-all duration-300"
              />
              <circle
                cx={`${node.cx}%`}
                cy={`${node.cy}%`}
                r={6}
                fill="hsl(var(--foreground))"
                className="pointer-events-none"
              />
            </g>
          );
        })}
      </svg>

      {neuralNodes.map((node) => {
        const nodeX = (node.cx / 100) * dimensions.width;
        const nodeY = (node.cy / 100) * dimensions.height;
        const dist = Math.hypot(nodeX - mousePos.x, nodeY - mousePos.y);
        const isHovered = dist < 100;

        return (
          <div
            key={`overlay-${node.id}`}
            className="absolute animate-float pointer-events-none z-10"
            style={{
              left: `${node.cx}%`,
              top: `calc(${node.cy}% - 40px)`,
              animationDelay: `${node.id * -0.7}s`,
            }}
          >
            <div
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isHovered
                  ? "opacity-100 transform scale-100"
                  : "opacity-0 transform scale-95"
              }`}
            >
              <div className="bg-brand text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap border border-foreground/20">
                <Brain className="w-3 h-3" />
                {t("evidence.viewEvidence")}
              </div>
            </div>
          </div>
        );
      })}

      {selectedEvidence && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setSelectedEvidence(null)}
        />
      )}

      {selectedEvidence && (() => {
        const node = neuralNodes.find((n) => n.id === selectedEvidence.id);
        if (!node) return null;

        const isLeft = node.cx > 50;
        const isTop = node.cy > 50;
        const sourceName = t(`evidence.sources.${selectedEvidence.id}`);
        const quote = t(`evidence.items.${selectedEvidence.id}`);

        return (
          <div
            className="absolute z-20 animate-float"
            style={{
              left: !isLeft ? `calc(${node.cx}% + 24px)` : "auto",
              right: isLeft ? `calc(${100 - node.cx}% + 24px)` : "auto",
              top: !isTop ? `calc(${node.cy}% + 24px)` : "auto",
              bottom: isTop ? `calc(${100 - node.cy}% + 24px)` : "auto",
              animationDelay: `${node.id * -0.7}s`,
            }}
          >
            <div className="w-64 md:w-72 bg-brand text-foreground rounded-xl shadow-2xl border border-foreground/20 p-4 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="absolute top-3 right-3 text-foreground/70 hover:text-foreground transition-colors"
                aria-label={t("evidence.close")}
              >
                <X className="w-4 h-4" />
              </button>
              <div className="mb-4 pr-4">
                <blockquote className="text-sm font-medium leading-relaxed border-l-2 border-foreground/30 pl-3 italic">
                  &ldquo;{quote}&rdquo;
                </blockquote>
              </div>
              <a
                href={selectedEvidence.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-semibold text-foreground hover:text-foreground/80 transition-colors"
              >
                {t("evidence.readOn", { source: sourceName })}
                <ExternalLink className="ml-1 w-3 h-3" />
              </a>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
