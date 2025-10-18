import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { login, logout, getCurrentUser } from "@/lib/auth";
import type { LoginData } from "@shared/schema";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/v1/admin/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Store the admin data in the cache
      queryClient.setQueryData(["/v1/admin/auth/me"], { admin: data.admin });
      setLocation("/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/v1/admin/auth/me"], null);
      queryClient.clear();
      setLocation("/login");
    },
  });

  return {
    user: user?.admin,
    isLoading,
    isAuthenticated: !!user?.admin,
    login: (data: LoginData) => loginMutation.mutate(data),
    logout: () => logoutMutation.mutate(),
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}
