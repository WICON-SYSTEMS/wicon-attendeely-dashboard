import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, uploadEmployeeBiometrics } from "@/lib/employees";
import type { Employee, InsertEmployee, UpdateEmployee } from "@shared/schema";

export function useEmployees() {
  const queryClient = useQueryClient();

  const { data: employees, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["/v1/admin/employees"],
    queryFn: () => getEmployees(1, 50),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: InsertEmployee): Promise<Employee> => {
      return createEmployee(employeeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/admin/employees"] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployee }): Promise<Employee> => {
      return updateEmployee(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/admin/employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/admin/employees"] });
    },
  });

  const uploadBiometricsMutation = useMutation({
    mutationFn: async ({ employeeId, file }: { employeeId: string; file: File }) => {
      return uploadEmployeeBiometrics(employeeId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v1/admin/employees"] });
    },
  });

  return {
    employees: employees || [],
    isLoading,
    isFetching,
    error,
    refetch,
    createEmployee: createEmployeeMutation.mutate,
    updateEmployee: updateEmployeeMutation.mutate,
    deleteEmployee: deleteEmployeeMutation.mutate,
    uploadBiometrics: uploadBiometricsMutation.mutate,
    isCreating: createEmployeeMutation.isPending,
    isUpdating: updateEmployeeMutation.isPending,
    isDeleting: deleteEmployeeMutation.isPending,
    isUploadingBiometrics: uploadBiometricsMutation.isPending,
    createError: createEmployeeMutation.error,
    updateError: updateEmployeeMutation.error,
    deleteError: deleteEmployeeMutation.error,
    uploadError: uploadBiometricsMutation.error,
  };
}
