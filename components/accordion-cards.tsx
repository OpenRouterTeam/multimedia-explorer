"use client";

import { useState } from "react";
import type { CardId, ReferenceImage, VideoModelConfig } from "@/lib/types";
import type { ModelOption } from "@/hooks/use-models";
import type { BrandData } from "./moodboard";
import Moodboard from "./moodboard";
import { MoodCardHeader, MoodCardBody } from "./cards/mood-card";
import { ModelCardBody } from "./cards/model-card";
import { ReferencesCardHeader, ReferencesCardBody } from "./cards/references-card";
import { OutputCardHeader, OutputCardBody } from "./cards/output-card";

export default function AccordionCards({
  apiKey,
  brandData,
  onBrandData,
  moodModel,
  onMoodModelChange,
  textModels,
  model,
  onModelChange,
  imageModels,
  videoModels,
  modelsLoading,
  referenceImages,
  onReferenceImagesChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  isVideoModel,
  videoConfig,
  duration,
  onDurationChange,
  generateAudio,
  onGenerateAudioChange,
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  onBrandData: (data: BrandData | null) => void;
  moodModel: string;
  onMoodModelChange: (model: string) => void;
  textModels: ModelOption[];
  model: string;
  onModelChange: (model: string) => void;
  imageModels: ModelOption[];
  videoModels: ModelOption[];
  modelsLoading: boolean;
  referenceImages: ReferenceImage[];
  onReferenceImagesChange: (images: ReferenceImage[]) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
  isVideoModel: boolean;
  videoConfig: VideoModelConfig | null;
  duration: number;
  onDurationChange: (d: number) => void;
  generateAudio: boolean;
  onGenerateAudioChange: (v: boolean) => void;
}) {
  const [expandedCard, setExpandedCard] = useState<CardId | null>(null);

  function toggle(card: CardId) {
    setExpandedCard((prev) => (prev === card ? null : card));
  }

  const cards: { id: CardId; header: React.ReactNode }[] = [
    { id: "mood", header: <MoodCardHeader brandData={brandData} /> },
    { id: "inputImages", header: <ReferencesCardHeader images={referenceImages} /> },
    {
      id: "output",
      header: (
        <OutputCardHeader
          aspectRatio={aspectRatio}
          resolution={resolution}
          isVideoModel={isVideoModel}
          duration={duration}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Model card — full width, always visible */}
      <div className="px-5 py-4 bg-surface/80 backdrop-blur-sm border border-border rounded-xl hover:border-accent/20 transition-all">
        <ModelCardBody model={model} onModelChange={onModelChange} imageModels={imageModels} videoModels={videoModels} loading={modelsLoading} />
      </div>

      {/* Remaining card headers row */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => toggle(card.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(card.id); }}
            className={`px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
              expandedCard === card.id
                ? "bg-surface/90 border-accent/50 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                : "bg-surface/60 border-border hover:border-accent/30 hover:shadow-[0_0_8px_rgba(59,130,246,0.08)]"
            }`}
          >
            {card.header}
          </div>
        ))}
      </div>

      {/* Expanded body for non-model cards */}
      {expandedCard && expandedCard !== "model" && (
        <div className="bg-surface/80 backdrop-blur-sm border border-accent/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <div className="pt-5 px-5 pb-3">
            {expandedCard === "mood" && (
              <MoodCardBody>
                <Moodboard
                  apiKey={apiKey}
                  brandData={brandData}
                  onBrandData={onBrandData}
                  moodModel={moodModel}
                  onMoodModelChange={onMoodModelChange}
                  textModels={textModels}
                />
              </MoodCardBody>
            )}
            {expandedCard === "inputImages" && (
              <ReferencesCardBody
                images={referenceImages}
                onImagesChange={onReferenceImagesChange}
              />
            )}
            {expandedCard === "output" && (
              <OutputCardBody
                aspectRatio={aspectRatio}
                onAspectRatioChange={onAspectRatioChange}
                resolution={resolution}
                onResolutionChange={onResolutionChange}
                model={model}
                isVideoModel={isVideoModel}
                videoConfig={videoConfig}
                duration={duration}
                onDurationChange={onDurationChange}
                generateAudio={generateAudio}
                onGenerateAudioChange={onGenerateAudioChange}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpandedCard(null)}
            className="w-full mt-2 py-2 bg-surface-hover/60 hover:bg-accent/10 text-muted hover:text-accent transition-all flex items-center justify-center cursor-pointer"
            aria-label="Collapse card"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 10L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
