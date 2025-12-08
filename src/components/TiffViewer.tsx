import * as React from "react";
import { useEffect, useRef, useState } from "react";
import * as fs from "fs";
import * as UTIF from "utif2";
import { css } from "@emotion/react";

interface ITiffViewerProps {
  path: string;
  className?: string;
}

/**
 * A component that displays TIFF images by decoding them with utif2 and
 * rendering to a canvas element. This is necessary because Chromium doesn't
 * natively support TIFF images in <img> tags.
 */
export const TiffViewer: React.FC<ITiffViewerProps> = ({ path, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTiff = async () => {
      try {
        setLoading(true);
        setError(null);

        // Read the file
        const buffer = fs.readFileSync(path);
        // Convert Node.js Buffer to ArrayBuffer (not SharedArrayBuffer)
        const arrayBuffer = new ArrayBuffer(buffer.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < buffer.length; i++) {
          view[i] = buffer[i];
        }

        // Decode the TIFF
        const ifds = UTIF.decode(arrayBuffer);
        if (!ifds || ifds.length === 0) {
          throw new Error("No image data found in TIFF file");
        }

        // Decode the first page
        UTIF.decodeImage(arrayBuffer, ifds[0]);
        const firstPage = ifds[0];

        // Ensure width and height are valid integers
        const width = Math.floor(firstPage.width);
        const height = Math.floor(firstPage.height);

        if (!width || !height || width <= 0 || height <= 0) {
          throw new Error(
            `Invalid image dimensions: ${firstPage.width}x${firstPage.height}`
          );
        }

        if (!isMounted) return;

        setDimensions({ width, height });

        // Convert to RGBA
        const rgba = UTIF.toRGBA8(firstPage);

        if (!rgba || rgba.length === 0) {
          throw new Error("Failed to decode TIFF image data");
        }

        // Draw to canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }

        const imageData = ctx.createImageData(width, height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);

        setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load TIFF image"
          );
          setLoading(false);
        }
      }
    };

    loadTiff();

    return () => {
      isMounted = false;
    };
  }, [path]);

  if (error) {
    return (
      <div
        css={css`
          color: #c00;
          padding: 1em;
        `}
      >
        Error loading TIFF: {error}
      </div>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      `}
    >
      {loading && (
        <div
          css={css`
            padding: 1em;
            color: #666;
          `}
        >
          Loading TIFF...
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={className}
        data-testid="tiff-viewer-canvas"
        css={css`
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: ${loading ? "none" : "block"};
        `}
      />
    </div>
  );
};
