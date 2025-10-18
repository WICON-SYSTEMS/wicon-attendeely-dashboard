import { apiCall, apiRequest } from "./queryClient";
import type { Employee, InsertEmployee, UpdateEmployee, BiometricUploadResponse, ApiResponse } from "@shared/schema";

// Get all employees (paginated)
type EmployeesListResponse = {
  employees: Employee[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

export async function getEmployees(page = 1, limit = 50): Promise<Employee[]> {
  const result = await apiCall<EmployeesListResponse>(
    "GET",
    `/v1/admin/employees?page=${page}&limit=${limit}`
  );
  return result.employees;
}

// Get employee by ID
export async function getEmployee(employeeId: string): Promise<Employee> {
  const result = await apiCall<Employee>("GET", `/v1/admin/employees/${employeeId}`);
  return result;
}

// Create new employee
export async function createEmployee(employeeData: InsertEmployee): Promise<Employee> {
  const result = await apiCall<Employee>("POST", "/v1/admin/employees", employeeData);
  return result;
}

// Update employee
export async function updateEmployee(employeeId: string, employeeData: UpdateEmployee): Promise<Employee> {
  const result = await apiCall<Employee>("PUT", `/v1/admin/employees/${employeeId}`, employeeData);
  return result;
}

// Delete employee
export async function deleteEmployee(employeeId: string): Promise<void> {
  await apiCall<void>("DELETE", `/v1/admin/employees/${employeeId}`);
}

// Upload employee photo/biometrics
export async function uploadEmployeeBiometrics(
  employeeId: string,
  file: File
): Promise<{ data: BiometricUploadResponse; message: string }> {
  const formData = new FormData();
  // Primary expected field name
  formData.append("file", file);
  // Some backends expect 'image' instead of 'file' – include for compatibility
  formData.append("image", file);
  // And some use 'photo'
  formData.append("photo", file);

  const response = await apiRequest(
    "POST",
    `/v1/mobile/employees/${employeeId}/image-upload-generate-qr`,
    formData,
    true
  );
  const json = (await response.json()) as ApiResponse<BiometricUploadResponse>;
  if (json.status !== "success") {
    throw new Error(json.message || "Biometric upload failed");
  }
  return { data: json.data, message: json.message };
}

// Helper to normalize QR image to a data URL if backend returns raw base64
export function normalizeQrImage(src: string | undefined | null): string | null {
  if (!src) return null;
  // Already a data URL
  if (src.startsWith('data:')) return src;
  // If it's an absolute URL, return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  // Heuristic: likely raw base64 without header; prefix PNG data header
  return `data:image/png;base64,${src}`;
}
