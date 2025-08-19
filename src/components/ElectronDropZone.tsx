import React from "react";
import Dropzone, {
  DropzoneProps,
  FileRejection,
  DropEvent
} from "react-dropzone";
import { NotifyWarning } from "./Notify";
import { t } from "@lingui/macro";
import * as nodePath from "path";

interface ElectronDropZoneProps extends Omit<DropzoneProps, "onDrop"> {
  onDrop: (filePaths: string[]) => void;
  multipleFiles?: boolean;
  children: DropzoneProps["children"];
}

/**
 * A wrapper around react-dropzone that handles Electron-specific file path resolution.
 * Automatically extracts absolute file paths from various drag sources and provides
 * fallbacks for different Electron versions and operating systems.
 */
export const ElectronDropZone: React.FunctionComponent<ElectronDropZoneProps> =
  ({ onDrop, multipleFiles = true, children, ...dropzoneProps }) => {
    const handleDrop = (
      accepted: File[],
      rejected: FileRejection[],
      evt: DropEvent
    ) => {
      if (accepted.length === 0) return;

      // Check for files with native paths first (standard Electron behavior)
      const withPath = accepted.filter(
        (f: any) => typeof f?.path === "string" && f.path.length > 0
      );

      let finalPaths: string[] = withPath
        .map((f: any) => f.path)
        .filter((p) => nodePath.isAbsolute(p));

      // If no absolute paths found, try comprehensive DataTransfer examination
      if (finalPaths.length === 0) {
        try {
          const de = evt as DragEvent;
          const dt = de?.dataTransfer;
          if (dt) {
            // Try direct files[].path (Electron exposes native path on dropped files)
            const direct = Array.from(dt.files || [])
              .map((f: any) => f.path)
              .filter(
                (p) =>
                  typeof p === "string" &&
                  p.length > 0 &&
                  nodePath.isAbsolute(p)
              );
            if (direct.length > 0) {
              finalPaths = direct;
            }

            // If still no paths, try text/uri-list (Windows Explorer often includes file:/// URIs)
            if (finalPaths.length === 0) {
              const uriList = dt.getData && dt.getData("text/uri-list");
              if (
                uriList &&
                typeof uriList === "string" &&
                uriList.length > 0
              ) {
                const lines = uriList
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter((l) => l && !l.startsWith("#"));
                const fromUris = lines
                  .filter((l) => l.toLowerCase().startsWith("file:"))
                  .map((uri) => {
                    try {
                      const u = new URL(uri);
                      // Convert to local path. On Windows: /C:/path -> strip leading slash.
                      let p = decodeURI(u.pathname);
                      if (
                        process.platform === "win32" &&
                        p.match(/^\/[a-zA-Z]:\//)
                      ) {
                        p = p.substring(1);
                      }
                      return p.replace(
                        /\//g,
                        process.platform === "win32" ? "\\" : "/"
                      );
                    } catch {
                      return "";
                    }
                  })
                  .filter((p) => p && nodePath.isAbsolute(p));
                if (fromUris.length > 0) {
                  finalPaths = fromUris;
                }
              }
            }
          }
        } catch {}
      }

      // Final fallback: try webUtils.getPathForFile() for newer Electron versions
      if (finalPaths.length === 0 && window.electronAPI?.getPathForFile) {
        try {
          finalPaths = accepted
            .map((file: any) => {
              try {
                const path = window.electronAPI.getPathForFile(file);
                return typeof path === "string" &&
                  path.length > 0 &&
                  nodePath.isAbsolute(path)
                  ? path
                  : "";
              } catch {
                return "";
              }
            })
            .filter((p) => p);
        } catch {}
      }

      // Show appropriate error messages
      if (finalPaths.length === 0 && accepted.length > 0) {
        NotifyWarning(
          t`Some items couldn't be added because their file path wasn't available. Try dragging from your file manager instead of a web browser.`
        );
        return;
      }

      // For single file components, take only the first file
      const pathsToUse = multipleFiles ? finalPaths : finalPaths.slice(0, 1);

      if (pathsToUse.length > 0) {
        onDrop(pathsToUse);
      }
    };

    return (
      <Dropzone useFsAccessApi={false} onDrop={handleDrop} {...dropzoneProps}>
        {children}
      </Dropzone>
    );
  };
