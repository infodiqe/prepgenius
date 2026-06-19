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
  return apiRequest<paths["/api/v1/auth/profile/"]["get"]["responses"]["200"]["content"]["application/json"]>("/auth/profile/", {
    method: "GET",
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
