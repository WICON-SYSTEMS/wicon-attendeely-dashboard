import { QueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@shared/schema";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://minjec-attendance-backend-1.onrender.com";

// Token management
const TOKEN_STORAGE_KEY = "auth_token";
let authToken: string | null = null;

// Initialize token from storage on module load
try {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) authToken = stored;
} catch {
  // ignore storage errors (e.g., SSR or privacy mode)
}

export function setAuthToken(token: string | null) {
  authToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
  isFormData = false
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  
  const options: RequestInit = {
    method,
    headers: {} as Record<string, string>,
  };

  // Add auth header if token exists
  if (authToken) {
    (options.headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
  }

  // Handle different content types
  if (body) {
    if (isFormData) {
      // For FormData, don't set Content-Type (browser will set it with boundary)
      options.body = body;
    } else {
      (options.headers as Record<string, string>)["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || "An error occurred";
    } catch {
      errorMessage = errorText || "An error occurred";
    }
    throw new Error(errorMessage);
  }

  return response;
}

// Helper function to handle API responses with the standard format
export async function apiCall<T>(
  method: string,
  path: string,
  body?: any,
  isFormData = false
): Promise<T> {
  const response = await apiRequest(method, path, body, isFormData);
  const result: ApiResponse<T> = await response.json();
  
  if (result.status !== "success") {
    throw new Error(result.message || "API request failed");
  }
  
  return result.data;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
