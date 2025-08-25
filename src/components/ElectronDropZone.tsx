import React from "react";
import { useDropzone } from "react-dropzone";
import { NotifyWarning } from "./Notify";
import { t } from "@lingui/macro";
import * as nodePath from "path";
import { getTestEnvironment } from "../getTestEnvironment";

interface ElectronDropZoneProps {
  fileCanBeDropped?: (path: string) => boolean;
  addFiles: (filePaths: string[]) => void;
  children: React.ReactNode;
  clickOpensChooser?: boolean;
}

/**
 * A simple drop zone that handles Electron-specific file path resolution.
 * Automatically extracts absolute file paths from various drag sources and provides
 * fallbacks for different Electron versions and operating systems.
 */
export const ElectronDropZone: React.FunctionComponent<ElectronDropZoneProps> =
  ({
    fileCanBeDropped,
    addFiles,
    children,
    clickOpensChooser: clickOpensChooser = true
  }) => {
    // Sanity check: ensure preload script has run and provided the necessary API.
    if (
      !(window as any).electronAPI ||
      typeof (window as any).electronAPI.getPathForFile !== "function"
    ) {
      const msg = t`ElectronDropZone: preload script did not set window.electronAPI.getPathForFile; drag-and-drop will not work.`;
      console.error(msg);
      NotifyWarning(msg);
      // We could throw here, but it's more user-friendly to just let the user try to click to add files.
    }

    // Helper: normalize file:// URIs and OS paths
    const normalizeOsPath = (p: string): string => {
      if (!p) return p;
      if (p.startsWith("file://")) {
        try {
          const url = new URL(p);
          let pathname = decodeURIComponent(url.pathname);
          if (/^\/[a-zA-Z]:\//.test(pathname)) {
            pathname = pathname.slice(1);
          }
          return nodePath.normalize(pathname);
        } catch (e) {
          try {
            console.log("ElectronDropZone: failed to parse file URI", p, e);
          } catch {}
        }
      }
      return nodePath.normalize(p);
    };

    const toAbsolutePath = (file: File): string => {
      if (getTestEnvironment().E2E) {
        throw new Error(
          "ElectronDropZone should not be used in E2E tests. See https://linear.app/lameta/issue/LAM-27/using-preload-breaks-e2e-tests"
        );
        // probably could mock something here if needed for e2e tests
      }
      const raw = (window as any).electronAPI.getPathForFile(file);
      const normalized = normalizeOsPath(raw);
      if (!nodePath.isAbsolute(normalized)) {
        throw new Error(
          "ElectronDropZone: preload getPathForFile did not return an absolute path"
        );
      }
      return normalized;
    };

    const onDrop = (acceptedFiles: File[]) => {
      const paths = acceptedFiles.map((f) => toAbsolutePath(f));
      const filteredPaths = fileCanBeDropped
        ? paths.filter(fileCanBeDropped)
        : paths;
      addFiles(filteredPaths);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      noKeyboard: true,
      multiple: true,
      onDrop,
      noClick: !clickOpensChooser
    });

    // Enhance the single child as the dropzone root, preserving existing props
    const childElement = React.Children.only(children) as React.ReactElement;
    const existingClass = childElement.props?.className || "";
    const className = [existingClass, isDragActive ? "drop-active" : ""]
      .filter(Boolean)
      .join(" ");

    const rootProps = getRootProps({ refKey: "ref", className });

    return React.cloneElement(
      childElement,
      { ...childElement.props, ...rootProps },
      <>
        <input {...getInputProps()} />
        {childElement.props.children}
      </>
    );
  };
