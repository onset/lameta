// NB: started by using @sentry/electron, but it was buggy and unsupported in Fall 2018.
// Switched to the Browser SDK

// ===============================================================================
// E2E TEST SENTRY ISSUE FIX (August 2025)
// ===============================================================================
// PROBLEM: E2E tests were showing error "Failed to initialize RendererTransport:
//          window.__electronCall isn't defined. Make sure you call call.initialize()
//          in the main process"
//
// ROOT CAUSE:
// 1. Code calls Sentry.captureException() directly (e.g., in Project.ts catch blocks)
// 2. Sentry auto-initializes when methods are called without explicit init
// 3. In Electron environments, Sentry detects Electron and uses RendererTransport
// 4. RendererTransport expects window.__electronCall (set up by main process)
// 5. In E2E tests, window.__electronCall doesn't exist, causing the error
//
// SOLUTION:
// 1. Added safeCaptureException() wrapper that checks E2E environment first
// 2. Enhanced initializeSentry() to skip initialization in E2E tests
// 3. Replaced direct Sentry.captureException() calls with safeCaptureException()
// 4. Added console filtering in E2E runner as secondary defense
// ===============================================================================

import * as Sentry from "@sentry/browser";
import { StackFrame } from "@sentry/browser";
import { RewriteFrames } from "@sentry/integrations";
import userSettingsSingleton from "./UserSettings";
import pkg from "package.json";
import { getTestEnvironment } from "../getTestEnvironment";

// frame.replace("file:///C:/dev/lameta/app/dist", "dist"),

export function initializeSentry(evenIfDevelopmentBuild: boolean = false) {
  // CRITICAL: Don't initialize Sentry in E2E tests to avoid RendererTransport issues
  // WHY: E2E tests run actual Electron renderer processes, but window.__electronCall
  // isn't set up, causing Sentry's RendererTransport to fail with:
  // "Failed to initialize RendererTransport: window.__electronCall isn't defined"
  if (getTestEnvironment().E2E) {
    console.log("Skipping Sentry initialization in E2E test environment");
    return; // Early return - completely skip Sentry setup in E2E tests
  }

  // Only initialize Sentry in production builds or when explicitly requested
  if (evenIfDevelopmentBuild || process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "https://46f4099f6a80454c9e9b4c7f4ed00020@o359058.ingest.sentry.io/3369701",
      release: `${pkg.version}`,
      // Disable automatic environment detection to prevent RendererTransport issues
      environment: "browser",
      integrations: [
        new Sentry.Integrations.Breadcrumbs({
          // these aren't bad but my errors were getting refused for being too big
          console: false
        }),
        new RewriteFrames({
          iteratee: (frame: StackFrame) => {
            const start = frame.filename!.indexOf("dist");
            const newFilename = "~/" + frame.filename?.substr(start, 99);
            return { ...frame, filename: newFilename };
          }
        })
      ],
      beforeSend(event) {
        try {
          console.log("Sending " + JSON.stringify(event));
        } catch (err) {}
        return event;
      }
      /* This works, but I have it turned off for now because we don't really have a support
            plan in place.
            
      beforeSend(event) {
        // Check if it is an exception, if so, show the report dialog
        // Note that this only will work in the renderer process, it's a noop on the main process
            if (event.exception) {
          showReportDialog({
            title: "We're sorry, lameta had a problem.",
            subtitle:
              "If you'd like to help us get rid of this bug, tell us what happened below.",
            subtitle2: "",
            user: { email: userSettingsSingleton?.Email || "", name: "" }
          });
        }
        return event;
      }
        */
    });
    setUserInfoForErrorReporting(
      userSettingsSingleton.Email,
      userSettingsSingleton.HowUsing
    );
  }
}
export function setUserInfoForErrorReporting(email: string, howUsing: string) {
  if (getTestEnvironment().E2E) {
    return; // Skip in E2E tests
  }
  Sentry.configureScope((scope) => {
    console.log("setUserInfoForErrorReporting");
    scope.setUser({ email });
    scope.setExtra("how_using", howUsing);
  });
}
export function sentryBreadCrumb(msg: string) {
  if (getTestEnvironment().E2E) {
    return; // Skip in E2E tests
  }
  Sentry.addBreadcrumb({ message: msg });
}
export function sentryExceptionBreadCrumb(err: Error) {
  if (getTestEnvironment().E2E) {
    return; // Skip in E2E tests
  }
  Sentry.addBreadcrumb({ message: err.message, level: Sentry.Severity.Error });
}
export function sentryException(err: Error) {
  if (getTestEnvironment().E2E) {
    console.log(`E2E test - would send error: ${err.message}`);
    return; // Skip in E2E tests
  }
  if (userSettingsSingleton.SendErrors) {
    Sentry.captureException(err);
  } else {
    console.log(`Skipping sending error: ${err.message}`);
  }
}
export function sentryErrorFromString(message: string) {
  if (getTestEnvironment().E2E) {
    console.log(`E2E test - would send error: ${message}`);
    return; // Skip in E2E tests
  }
  if (userSettingsSingleton.SendErrors) {
    try {
      throw new Error(message);
    } catch (err) {
      Sentry.captureException(err);
    }
  } else {
    console.log(`Skipping sending error: ${message}`);
  }
}

/**
 * PROBLEM SOLVED: E2E tests were failing with error:
 * "Failed to initialize RendererTransport: window.__electronCall isn't defined"
 *
 * ROOT CAUSE: When code calls Sentry.captureException() directly (like in Project.ts),
 * Sentry auto-initializes if not already initialized. In Electron apps, Sentry detects
 * the Electron environment and tries to use RendererTransport, which expects
 * window.__electronCall to be set up by the main process. In E2E tests, this isn't
 * available, causing the error.
 *
 * SOLUTION: This wrapper function checks if we're in an E2E test environment before
 * calling any Sentry methods. This prevents Sentry from auto-initializing in E2E tests.
 *
 * USE: Replace direct calls to Sentry.captureException(err) with safeCaptureException(err)
 */
export function safeCaptureException(err: any) {
  // Check if we're running in E2E test environment where Sentry should be disabled
  if (getTestEnvironment().E2E) {
    // Log that we're skipping Sentry to help with debugging, but don't spam the console
    console.log(
      "Skipping Sentry.captureException in E2E test environment:",
      err.message || err
    );
    return; // Early return - don't call Sentry at all
  }

  // In non-E2E environments, call Sentry normally but wrap in try-catch
  // to handle any unexpected Sentry initialization issues gracefully
  try {
    Sentry.captureException(err);
  } catch (sentryError) {
    // If Sentry itself fails, log it but don't crash the application
    console.error("Failed to capture exception with Sentry:", sentryError);
  }
}
