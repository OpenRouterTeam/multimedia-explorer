"use client";

import { SignInButton } from "./auth-button";

export default function AuthPrompt({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  return (
    <div className="relative p-4 bg-accent/5 border border-accent/20 rounded-lg space-y-3">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <p className="text-sm text-foreground pr-6">
        You need an OpenRouter API key to continue.
      </p>
      <SignInButton variant="default" size="sm" />
    </div>
  );
}
