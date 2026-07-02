import { apiRequest } from "@/lib/api/client";
import { paths, components } from "@/lib/api/types";

// Define TypeScript schemas from generated types
export type LoginRequest = paths["/api/v1/auth/login/"]["post"]["requestBody"]["content"]["application/json"];
export type RegisterRequest = paths["/api/v1/auth/register/"]["post"]["requestBody"]["content"]["application/json"];
export type VerifyEmailRequest = paths["/api/v1/auth/verify-email/"]["post"]["requestBody"]["content"]["application/json"];
export type ResendVerificationRequest = paths["/api/v1/auth/resend-verification/"]["post"]["requestBody"]["content"]["application/json"];
export type ResetRequest = paths["/api/v1/auth/password/reset/"]["post"]["requestBody"]["content"]["application/json"];
export type ConfirmResetRequest = paths["/api/v1/auth/password/confirm/"]["post"]["requestBody"]["content"]["application/json"];

export async function login(data: LoginRequest) {
  return apiRequest<{ detail: string }>("/auth/login/", {
    method: "POST",
    body: data,
  });
}

export async function register(data: RegisterRequest) {
  return apiRequest<{ detail: string }>("/auth/register/", {
    method: "POST",
    body: data,
  });
}

export async function logout() {
  return apiRequest<{ detail: string }>("/auth/logout/", {
    method: "POST",
  });
}

export async function verifyEmail(data: VerifyEmailRequest) {
  return apiRequest<{ detail: string }>("/auth/verify-email/", {
    method: "POST",
    body: data,
  });
}

export async function resendVerification(data: ResendVerificationRequest) {
  return apiRequest<{ detail: string }>("/auth/resend-verification/", {
    method: "POST",
    body: data,
  });
}

export async function requestPasswordReset(data: ResetRequest) {
  return apiRequest<{ detail: string }>("/auth/password/reset/", {
    method: "POST",
    body: data,
  });
}

export async function confirmPasswordReset(data: ConfirmResetRequest) {
  return apiRequest<{ detail: string }>("/auth/password/confirm/", {
    method: "POST",
    body: data,
  });
}

export async function getProfile() {
  // Session probe (runs on app mount, incl. public pages). A 401 here means
  // "not signed in" — refresh is still attempted, but a refresh failure must
  // NOT redirect to /login, or logged-out visitors on public pages would be
  // bounced away. AuthContext interprets the thrown 401 as "no session".
  return apiRequest<paths["/api/v1/auth/profile/"]["get"]["responses"]["200"]["content"]["application/json"]>("/auth/profile/", {
    method: "GET",
    skipAuthRedirect: true,
  });
}

export type UpdateProfileRequest = components["schemas"]["PatchedUpdateProfileRequest"];
export type UserProfile = paths["/api/v1/auth/profile/"]["get"]["responses"]["200"]["content"]["application/json"];

export async function updateProfile(data: UpdateProfileRequest) {
  return apiRequest<UserProfile>("/auth/profile/", {
    method: "PATCH",
    body: data,
  });
}

// ── T29: profile completion (reuses existing backend endpoints) ─────────────

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

// /auth/password/change/ is not in the generated client yet; typed inline.
export async function changePassword(data: ChangePasswordRequest) {
  return apiRequest<{ detail: string }>("/auth/password/change/", {
    method: "POST",
    body: data,
  });
}

// POST /auth/data/export/ → 202; backend queues the export and emails the user.
export async function exportData() {
  return apiRequest<{ detail: string }>("/auth/data/export/", {
    method: "POST",
  });
}

// DELETE /auth/account/delete/ — anonymizes the account and clears auth cookies.
export async function deleteAccount(data: { password: string }) {
  return apiRequest<{ detail: string }>("/auth/account/delete/", {
    method: "DELETE",
    body: data,
  });
}
