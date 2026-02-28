"use client";

import { useState } from "react";
import type { CardId, ReferenceImage } from "@/lib/types";
import type { BrandData } from "./moodboard";
import Moodboard from "./moodboard";
import { MoodCardHeader, MoodCardBody } from "./cards/mood-card";
import { ModelCardHeader, ModelCardBody } from "./cards/model-card";
import { ReferencesCardHeader, ReferencesCardBody } from "./cards/references-card";
import { OutputCardHeader, OutputCardBody } from "./cards/output-card";

export default function AccordionCards({
  apiKey,
  brandData,
  onBrandData,
  onAuthNeeded,
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
  onAuthNeeded: (key: string) => void;
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
    { id: "model", header: <ModelCardHeader model={model} /> },
    { id: "inputImages", header: <ReferencesCardHeader images={referenceImages} /> },
    { id: "output", header: <OutputCardHeader aspectRatio={aspectRatio} resolution={resolution} /> },
  ];

  return (
    <div className="space-y-0">
      {/* Card headers row */}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => toggle(card.id)}
            className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              expandedCard === card.id
                ? "bg-surface border-accent/50"
                : "bg-surface/50 border-border hover:border-accent/30"
            }`}
          >
            {card.header}
          </button>
        ))}
      </div>

      {/* Expanded body */}
      {expandedCard && (
        <div className="mt-2 p-4 bg-surface/50 border border-border rounded-lg">
          {expandedCard === "mood" && (
            <MoodCardBody brandData={brandData} onClear={() => onBrandData(null)}>
              <Moodboard
                apiKey={apiKey}
                brandData={brandData}
                onBrandData={onBrandData}
                onAuthNeeded={onAuthNeeded}
              />
            </MoodCardBody>
          )}
          {expandedCard === "model" && (
            <ModelCardBody model={model} onModelChange={onModelChange} />
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
            />
          )}
        </div>
      )}
    </div>
  );
}
