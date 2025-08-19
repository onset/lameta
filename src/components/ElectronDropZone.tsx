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

        const paths: string[] = [];

        // Use Electron's webUtils to get absolute paths from File objects
        if (evt.dataTransfer?.files) {
          for (let i = 0; i < evt.dataTransfer.files.length; i++) {
            const file = evt.dataTransfer.files.item(i);
            if (file) {
              try {
                // Use webUtils.getPathForFile() which is the modern way to get file paths in Electron
                const filePath = (window as any).electronAPI?.getPathForFile(
                  file
                );
                if (filePath) {
                  paths.push(normalizeOsPath(filePath));
                } else {
                  throw new Error(
                    "webUtils.getPathForFile returned null/undefined"
                  );
                }
              } catch (e) {
                console.error(
                  "ElectronDropZone: failed to get path for file",
                  file.name,
                  e
                );
                throw e; // Re-throw to indicate failure
              }
            }
          }
        }

        if (!paths.length) {
          NotifyWarning(
            t`Sorry, we couldn't read any file paths from that drop.`
          );
          return;
        }

        // Filter using the provided function if available
        const filteredPaths = fileCanBeDropped
          ? paths.filter(fileCanBeDropped)
          : paths;

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
