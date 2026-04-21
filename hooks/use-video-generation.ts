"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseJsonResponse, fallbackErrorMessage } from "@/lib/safe-json";

export type VideoStatus =
  | "idle"
  | "submitting"
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface VideoGenerationState {
  status: VideoStatus;
  error: string | null;
  videoUrl: string | null;
  jobId: string | null;
  model: string | null;
}

interface SubmitParams {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  duration?: number;
  resolution?: string;
  generate_audio?: boolean;
  input_references?: Array<{ type: "image_url"; image_url: { url: string } }>;
}

const POLL_INTERVAL = 5000;

export function useVideoGeneration(apiKey: string | null) {
  const [state, setState] = useState<VideoGenerationState>({
    status: "idle",
    error: null,
    videoUrl: null,
    jobId: null,
    model: null,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function revokeBlobUrl() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      revokeBlobUrl();
    };
  }, []);

  const submit = useCallback(
    async (params: SubmitParams) => {
      if (!apiKey) return;

      stopPolling();
      revokeBlobUrl();

      setState({
        status: "submitting",
        error: null,
        videoUrl: null,
        jobId: null,
        model: params.model,
      });

      try {
        const res = await fetch("/api/video/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(params),
        });

        const { ok, status, data, text } = await parseJsonResponse<{
          id?: string;
          error?: string;
        }>(res);

        if (!ok || !data) {
          setState((s) => ({
            ...s,
            status: "failed",
            error:
              data?.error ||
              fallbackErrorMessage(status, text) ||
              "Failed to submit video generation",
          }));
          return;
        }

        const jobId = data.id;
        if (!jobId) {
          setState((s) => ({
            ...s,
            status: "failed",
            error: "No job ID returned from video submission",
          }));
          return;
        }
        setState((s) => ({ ...s, status: "pending", jobId }));

        // Start polling
        pollingRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/video/${jobId}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            const {
              ok: pollOk,
              status: pollStatus,
              data: pollData,
              text: pollText,
            } = await parseJsonResponse<{
              status?: string;
              error?: string;
            }>(pollRes);

            if (!pollOk || !pollData) {
              stopPolling();
              setState((s) => ({
                ...s,
                status: "failed",
                error:
                  pollData?.error ||
                  fallbackErrorMessage(pollStatus, pollText) ||
                  "Video generation failed",
              }));
              return;
            }

            if (pollData.status === "in_progress") {
              setState((s) => ({ ...s, status: "in_progress" }));
            } else if (pollData.status === "completed") {
              stopPolling();

              // Download the video content through our proxy
              try {
                const contentRes = await fetch(
                  `/api/video/${jobId}/content?index=0`,
                  { headers: { Authorization: `Bearer ${apiKey}` } }
                );

                if (!contentRes.ok) {
                  throw new Error("Failed to download video");
                }

                const blob = await contentRes.blob();
                const url = URL.createObjectURL(blob);
                blobUrlRef.current = url;

                setState((s) => ({
                  ...s,
                  status: "completed",
                  videoUrl: url,
                }));
              } catch {
                setState((s) => ({
                  ...s,
                  status: "failed",
                  error: "Video completed but download failed",
                }));
              }
            } else if (
              pollData.status === "failed" ||
              pollData.status === "cancelled" ||
              pollData.status === "expired"
            ) {
              stopPolling();
              setState((s) => ({
                ...s,
                status: "failed",
                error:
                  pollData.error ||
                  `Video generation ${pollData.status}`,
              }));
            }
          } catch {
            // Network error during poll — keep trying
          }
        }, POLL_INTERVAL);
      } catch (err) {
        setState((s) => ({
          ...s,
          status: "failed",
          error:
            err instanceof Error
              ? err.message
              : "Failed to submit video generation",
        }));
      }
    },
    [apiKey]
  );

  const cancel = useCallback(() => {
    stopPolling();
    setState((s) => ({
      ...s,
      status: s.status === "idle" || s.status === "completed" || s.status === "failed"
        ? s.status
        : "idle",
    }));
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    revokeBlobUrl();
    setState({
      status: "idle",
      error: null,
      videoUrl: null,
      jobId: null,
      model: null,
    });
  }, []);

  return { state, submit, cancel, reset };
}
