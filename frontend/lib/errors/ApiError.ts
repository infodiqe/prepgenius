/**
 * ApiError — the framework's structured "raw API error" contract (T02).
 *
 * Extends `Error` so it is backward-compatible with existing `catch (e) =>
 * e.message` call sites, while carrying the HTTP `status` and parsed `payload`
 * the normalizer needs for status-based classification. The API client (or any
 * feature) can `throw new ApiError(status, payload)`; `normalizeError` also
 * handles Responses, plain `{ status, data }` objects, network TypeErrors, and
 * malformed input, so adopting this class is recommended but not required.
 */
export class ApiError extends Error {
  readonly status: number | null;
  readonly payload: unknown;

  constructor(status: number | null, payload?: unknown, message?: string) {
    super(message ?? "API request failed");
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}
