/*
 * Post-attempt finalisation destination (SPR1-HOTFIX-02).
 *
 * Pure mapping from the player's `?flow=` marker to the screen the attempt
 * finalises on. The diagnostic flow lands on the diagnostic completion screen;
 * everything else keeps the standard results page. Used by the practice page
 * for both the MockPlayerShell `completionHref` prop and the scored/submitted
 * re-entry redirects, so they can never diverge.
 */

const DIAGNOSTIC_FLOW = "diagnostic";

export function resolveCompletionHref(
  attemptId: string,
  flow: string | string[] | undefined,
): string {
  return flow === DIAGNOSTIC_FLOW
    ? `/diagnostic/${attemptId}`
    : `/results/${attemptId}`;
}
