/**
 * usePhotoUpload
 * ─────────────
 * Resizes an uploaded image to max 300×300, converts to JPEG data URL.
 * Used by the onboarding profile photo step.
 */

import { useState, useCallback } from "react";

export function usePhotoUpload() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePhotoUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      onResult: (dataUrl: string) => void,
      onError?: (message: string) => void
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            onResult(dataUrl);
            setIsProcessing(false);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } catch (error: any) {
        onError?.(error.message);
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, handlePhotoUpload };
}
