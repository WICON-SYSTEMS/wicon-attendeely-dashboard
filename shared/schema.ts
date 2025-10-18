import { z } from "zod";

// API Response wrapper
export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  message: string;
}

// Admin types based on existing API
export interface Admin {
  admin_id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

// Employee types based on existing API
export interface Employee {
  employee_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hire_date: string;
  salary: number;
  status: "active" | "inactive";
  registration_status: string;
  biometric_status: {
    fingerprint_registered: boolean;
    facial_biometrics_registered: boolean;
    qr_code_generated: boolean;
  } | null;
  attendance_summary: {
    total_days_present: number;
    total_days_absent: number;
    average_hours_per_day: number;
  } | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string | null;
  // Newly exposed from list endpoint
  qr_code?: string | null;
  qr_code_image?: string | null;
  qr_code_expires_at?: string | null;
  // New: profile image URL from backend
  image_url?: string | null;
  // From GET employee by id
  qr_code_info?: {
    qr_code: string;
    qr_code_image: string;
    is_active: boolean;
    expires_at: string | null;
  } | null;
}

// Auth response types
export interface AuthResponse {
  admin: Admin;
  token?: {
    access_token: string;
    token_type: string;
  };
}

// Biometric upload response
export interface BiometricUploadResponse {
  employee_id: string;
  facial_biometric_id: string;
  qr_code: string;
  qr_code_image: string;
  quality_metrics: {
    face_quality: number;
    eye_distance: number;
    pose_angle: number;
    lighting_score: number;
  };
  registration_status: string;
  expires_at: string;
  registered_at: string;
}

// Validation schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertEmployeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  hire_date: z.string(),
  salary: z.number().min(1, "Salary must be greater than 0"),
});

export const updateEmployeeSchema = insertEmployeeSchema.partial();

export type LoginData = z.infer<typeof loginSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
