"use client";

import { useState } from "react";
import type { CardId, ReferenceImage } from "@/lib/types";
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
  model,
  onModelChange,
  referenceImages,
  onReferenceImagesChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
}: {
  apiKey: string | null;
  brandData: BrandData | null;
  onBrandData: (data: BrandData | null) => void;
  moodModel: string;
  onMoodModelChange: (model: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  referenceImages: ReferenceImage[];
  onReferenceImagesChange: (images: ReferenceImage[]) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  resolution: string;
  onResolutionChange: (res: string) => void;
}) {
  const [expandedCard, setExpandedCard] = useState<CardId | null>(null);

  function toggle(card: CardId) {
    setExpandedCard((prev) => (prev === card ? null : card));
  }

  const cards: { id: CardId; header: React.ReactNode }[] = [
    { id: "mood", header: <MoodCardHeader brandData={brandData} /> },
    { id: "inputImages", header: <ReferencesCardHeader images={referenceImages} /> },
    { id: "output", header: <OutputCardHeader aspectRatio={aspectRatio} resolution={resolution} /> },
  ];

  return (
    <div className="space-y-2">
      {/* Model card — full width, always visible */}
      <div className="px-4 py-4 bg-surface/50 border border-border rounded-lg">
        <ModelCardBody model={model} onModelChange={onModelChange} />
      </div>

      {/* Remaining card headers row */}
      <div className="grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => toggle(card.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(card.id); }}
            className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              expandedCard === card.id
                ? "bg-surface border-accent/50"
                : "bg-surface/50 border-border hover:border-accent/30"
            }`}
          >
            {card.header}
          </div>
        ))}
      </div>

      {/* Expanded body for non-model cards */}
      {expandedCard && expandedCard !== "model" && (
        <div className="pt-4 px-4 pb-2 bg-surface/50 border border-border rounded-lg">
          {expandedCard === "mood" && (
            <MoodCardBody>
              <Moodboard
                apiKey={apiKey}
                brandData={brandData}
                onBrandData={onBrandData}
                moodModel={moodModel}
                onMoodModelChange={onMoodModelChange}
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
            />
          )}
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={() => setExpandedCard(null)}
              className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Collapse card"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 10L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
