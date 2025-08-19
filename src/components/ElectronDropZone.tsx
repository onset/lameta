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
        console.log("ElectronDropZone: electronAPI available?", !!(window as any).electronAPI);

        const paths: string[] = [];

        // 1) Preferred: Use Electron's webUtils to get absolute paths from File objects
        if (evt.dataTransfer?.files) {
          console.log(
            "ElectronDropZone: found",
            evt.dataTransfer.files.length,
            "files"
          );
          console.log(
            "ElectronDropZone: electronAPI available?",
            !!(window as any).electronAPI
          );
          console.log(
            "ElectronDropZone: getPathForFile available?",
            !!(window as any).electronAPI?.getPathForFile
          );

          for (let i = 0; i < evt.dataTransfer.files.length; i++) {
            const file = evt.dataTransfer.files.item(i);
            if (file) {
              console.log(
                "ElectronDropZone: processing file",
                file.name,
                "type:",
                file.type,
                "size:",
                file.size
              );
              console.log(
                "ElectronDropZone: file object keys:",
                Object.keys(file)
              );
              console.log(
                "ElectronDropZone: file.path (deprecated):",
                (file as any).path
              );
              console.log("ElectronDropZone: file object:", file);

              try {
                // Use webUtils.getPathForFile() which is the modern way to get file paths in Electron
                const filePath = (window as any).electronAPI?.getPathForFile(
                  file
                );
                console.log(
                  "ElectronDropZone: webUtils returned path:",
                  filePath
                );
                if (filePath) {
                  paths.push(normalizeOsPath(filePath));
                }
              } catch (e) {
                console.log(
                  "ElectronDropZone: error getting path for file",
                  file.name,
                  e
                );
                // Fallback to deprecated .path property if webUtils fails
                console.log(
                  "ElectronDropZone: trying fallback .path property:",
                  (file as any).path
                );
                if ((file as any).path) {
                  paths.push(normalizeOsPath((file as any).path));
                }
              }
            }
          }
        }

        // Let's also inspect DataTransfer items
        if (evt.dataTransfer?.items) {
          console.log(
            "ElectronDropZone: found",
            evt.dataTransfer.items.length,
            "items"
          );
          for (let i = 0; i < evt.dataTransfer.items.length; i++) {
            const item = evt.dataTransfer.items[i];
            console.log(
              "ElectronDropZone: item",
              i,
              "kind:",
              item.kind,
              "type:",
              item.type
            );
            if (item.kind === "file") {
              const file = item.getAsFile();
              console.log("ElectronDropZone: item.getAsFile():", file);
              if (file) {
                console.log(
                  "ElectronDropZone: item file name:",
                  file.name,
                  "path:",
                  (file as any).path
                );
                try {
                  const filePath = (window as any).electronAPI?.getPathForFile(
                    file
                  );
                  console.log(
                    "ElectronDropZone: webUtils for item file:",
                    filePath
                  );
                  if (filePath && !paths.includes(filePath)) {
                    paths.push(normalizeOsPath(filePath));
                  }
                } catch (e) {
                  console.log("ElectronDropZone: error with item file:", e);
                }
              }
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
