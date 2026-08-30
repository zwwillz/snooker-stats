"use client";

/**
 * Root-view URL/history is owned by SnookerDataCenterV2 after hydration.
 *
 * This component intentionally remains as a no-op compatibility mount so the
 * server shell does not need a second navigation controller. The previous
 * implementation captured document clicks and inferred navigation from DOM
 * labels, which could preserve stale history.state and race the real handlers.
 */
export default function SnookerViewUrlSync() {
  return null;
}
