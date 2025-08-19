import React, { useEffect, useRef } from "react";
import { NotifyWarning } from "./Notify";
import { t } from "@lingui/macro";
import * as nodePath from "path";

interface ElectronDropZoneProps {
  fileCanBeDropped?: (path: string) => boolean;
  addFiles: (filePaths: string[]) => void;
  children: React.ReactNode;
}

/**
 * A simple drop zone that handles Electron-specific file path resolution.
 * Automatically extracts absolute file paths from various drag sources and provides
 * fallbacks for different Electron versions and operating systems.
 */
export const ElectronDropZone: React.FunctionComponent<ElectronDropZoneProps> =
  ({ fileCanBeDropped, addFiles, children }) => {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Helper: normalize file:// URIs and OS paths
      const normalizeOsPath = (p: string): string => {
        if (!p) return p;
        // If looks like file:// URI, decode it first
        if (p.startsWith("file://")) {
          try {
            const url = new URL(p);
            let pathname = decodeURIComponent(url.pathname);
            // Windows: URL pathname can start with /C:/...
            if (/^\/[a-zA-Z]:\//.test(pathname)) {
              pathname = pathname.slice(1);
            }
            // Convert to platform-specific separators
            return nodePath.normalize(pathname);
          } catch (e) {
            console.log("ElectronDropZone: failed to parse file URI", p, e);
          }
        }
        return nodePath.normalize(p);
      };

      const handleDragOver = (evt: DragEvent) => {
        evt.preventDefault();
        evt.stopPropagation();
      };

      const handleDragEnter = (evt: DragEvent) => {
        evt.preventDefault();
        evt.stopPropagation();
      };

      const handleDragLeave = (evt: DragEvent) => {
        evt.preventDefault();
        evt.stopPropagation();
      };

      const handleDrop = (evt: DragEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        console.log("ElectronDropZone.handleDrop: start");

        const paths: string[] = [];

        // 1) Preferred: Electron provides absolute paths on File objects as .path
        if (evt.dataTransfer?.files) {
          for (let i = 0; i < evt.dataTransfer.files.length; i++) {
            const file = evt.dataTransfer.files.item(i) as any;
            if (file?.path) {
              paths.push(normalizeOsPath(file.path as string));
            }
          }
        }

        // 2) Fallback: DataTransfer (uri-list, files, text/plain)
        const dt = evt.dataTransfer;
        if (dt) {
          // 2a) text/uri-list (may include multiple newline-separated URIs)
          try {
            if (dt.types?.includes("text/uri-list")) {
              const uriList = dt.getData("text/uri-list");
              if (uriList) {
                const uris = uriList
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter((l) => l && !l.startsWith("#"));
                const fromUris = uris.map(normalizeOsPath);
                paths.push(...fromUris);
              }
            }
          } catch (e) {
            console.log("ElectronDropZone: error reading text/uri-list", e);
          }

          // 2b) text/plain sometimes contains a single absolute path
          try {
            if (dt.types?.includes("text/plain")) {
              const plain = dt.getData("text/plain")?.trim();
              if (plain) {
                const maybeMany = plain
                  .split(/\r?\n/)
                  .map((p) => p.trim())
                  .filter(Boolean);
                const fromPlain = maybeMany.map(normalizeOsPath);
                paths.push(...fromPlain);
              }
            }
          } catch (e) {
            console.log("ElectronDropZone: error reading text/plain", e);
          }
        }

        // 3) Deduplicate and filter empties
        const unique = Array.from(new Set(paths.filter(Boolean)));
        console.log("ElectronDropZone: unique paths", unique);

        if (!unique.length) {
          NotifyWarning(
            t`Sorry, we couldn't read any file paths from that drop.`
          );
          return;
        }

        // 4) Filter using the provided function if available
        const filteredPaths = fileCanBeDropped
          ? unique.filter(fileCanBeDropped)
          : unique;

        console.log("ElectronDropZone: final filtered paths", filteredPaths);
        addFiles(filteredPaths);
      };

      container.addEventListener("dragover", handleDragOver);
      container.addEventListener("dragenter", handleDragEnter);
      container.addEventListener("dragleave", handleDragLeave);
      container.addEventListener("drop", handleDrop);

      return () => {
        container.removeEventListener("dragover", handleDragOver);
        container.removeEventListener("dragenter", handleDragEnter);
        container.removeEventListener("dragleave", handleDragLeave);
        container.removeEventListener("drop", handleDrop);
      };
    }, [fileCanBeDropped, addFiles]);

    // Clone the first child and add the ref to it without adding an extra div
    const childElement = React.Children.only(children) as React.ReactElement;

    return React.cloneElement(childElement, {
      ref: containerRef,
      ...childElement.props
    });
  };
