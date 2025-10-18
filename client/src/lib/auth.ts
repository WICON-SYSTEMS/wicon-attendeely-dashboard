import { apiCall, setAuthToken, clearAuthToken } from "./queryClient";
import type { Admin, LoginData, AuthResponse } from "@shared/schema";

export async function login(loginData: LoginData): Promise<AuthResponse> {
  const result = await apiCall<AuthResponse>("POST", "/v1/admin/auth/login", loginData);
  
  // Store the token for future requests
  if (result.token) {
    setAuthToken(result.token.access_token);
  }
  
  return result;
}

export async function logout(): Promise<void> {
  // Clear the stored token
  clearAuthToken();
  // Note: The API doesn't seem to have a logout endpoint, so we just clear the token locally
}

export async function getCurrentUser(): Promise<{ admin: Admin } | null> {
  try {
    const result = await apiCall<{ admin: Admin }>("GET", "/v1/admin/auth/me");
    return result;
  } catch (error) {
    // If auth fails, clear the token
    clearAuthToken();
    return null;
  }
}
