import { apiRequest } from "@/lib/queryClient";
import type { ApiResponse } from "@shared/schema";

export interface AttendanceRecord {
  attendance_id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  hours_worked: number | null;
  status: string;
  qr_code_scanned: string | null;
  created_at: string;
  updated_at: string | null;
  // present in /attendance/all
  employee_name?: string;
  employee_code?: string;
  department?: string;
}

// Employee analytics (per-employee comprehensive analytics)
export interface EmployeeAnalyticsResponse {
  employee_statistics: {
    employee_id: string;
    employee_name: string;
    employee_code: string;
    department: string;
    total_days_present: number;
    total_days_late: number;
    total_days_absent: number;
    total_days_partial: number;
    total_hours_worked: number;
    average_hours_per_day: number;
    attendance_percentage: number;
    punctuality_percentage: number;
    last_attendance_date: string | null;
    current_status: string;
    working_days_in_period: number;
  };
  attendance_records: AttendanceRecord[];
  period_summary: { start_date: string; end_date: string; total_records: number };
}

export async function getEmployeeAnalytics(
  employeeId: string,
  start_date?: string,
  end_date?: string
): Promise<EmployeeAnalyticsResponse> {
  const params = new URLSearchParams();
  if (start_date) params.set("start_date", start_date);
  if (end_date) params.set("end_date", end_date);
  const url = `/v1/attendance/analytics/employee/${encodeURIComponent(employeeId)}${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiRequest("GET", url);
  const json = (await res.json()) as ApiResponse<EmployeeAnalyticsResponse>;
  if (json.status !== "success") {
    throw new Error(json.message || "Failed to fetch employee analytics");
  }
  return json.data;
}

// Trends
export interface AttendanceTrends {
  period: string;
  start_date: string;
  end_date: string;
  daily_trends: Array<{
    date: string;
    total_employees: number;
    present: number;
    late: number;
    absent: number;
    checked_out: number;
    still_checked_in: number;
    total_hours_worked: number;
    average_hours_per_employee: number;
  }>;
  trend_summary: {
    average_attendance_rate: number;
    average_punctuality_rate: number;
    total_days_analyzed: number;
  };
}

export async function getAttendanceTrends(days: number): Promise<AttendanceTrends> {
  const params = new URLSearchParams();
  params.set("days", String(days));
  const url = `/v1/attendance/analytics/trends?${params.toString()}`;
  const res = await apiRequest("GET", url);
  const json = (await res.json()) as ApiResponse<AttendanceTrends>;
  if (json.status !== "success") {
    throw new Error(json.message || "Failed to fetch trends");
  }
  return json.data;
}

export interface EmployeeAttendanceResponse {
  attendance_records: AttendanceRecord[];
  total_records: number;
  date_range: null | { start_date: string; end_date: string };
}

export async function getEmployeeAttendance(
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<EmployeeAttendanceResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const query = params.toString();
  const url = query
    ? `/v1/attendance/employee/${encodeURIComponent(employeeId)}?${query}`
    : `/v1/attendance/employee/${encodeURIComponent(employeeId)}`;

  const res = await apiRequest("GET", url);
  const json = (await res.json()) as ApiResponse<EmployeeAttendanceResponse>;
  if (json.status !== "success") {
    throw new Error(json.message || "Failed to fetch attendance");
  }
  return json.data;
}

// All attendance with analytics/trends
export interface AllAttendanceFilters {
  page?: number;
  limit?: number; // <= 100
  start_date?: string;
  end_date?: string;
  employee_id?: string | null;
  status?: string | null; // checked_in | checked_out
  include_analytics?: boolean;
  include_trends?: boolean;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ComprehensiveAnalytics {
  period: { start_date: string; end_date: string; working_days: number };
  overall_summary: {
    total_employees: number;
    total_present_days: number;
    total_absent_days: number;
    total_late_days: number;
    total_hours_worked: number;
    average_hours_per_employee: number;
    overall_attendance_rate: number; // percent
    overall_punctuality_rate: number; // percent
  };
  employee_stats: Array<{
    employee_id: string;
    employee_name: string;
    employee_code: string;
    department: string;
    total_days_present: number;
    total_days_late: number;
    total_days_absent: number;
    total_days_partial: number;
    total_hours_worked: number;
    average_hours_per_day: number;
    attendance_percentage: number;
    punctuality_percentage: number;
    last_attendance_date: string | null;
    current_status: string;
    working_days_in_period: number;
  }>;
}

export interface AllAttendanceResponse {
  attendance_records: AttendanceRecord[];
  pagination: Pagination;
  filters: { start_date: string | null; end_date: string | null; employee_id: string | null; status: string | null };
  summary?: { total_records: number; page_records: number; filters_applied: string };
  comprehensive_analytics?: ComprehensiveAnalytics;
  daily_breakdown?: Array<{
    date: string;
    total_employees: number;
    present: number;
    late: number;
    absent: number;
    checked_out: number;
    still_checked_in: number;
    total_hours_worked: number;
    average_hours_per_employee: number;
  }>;
}

export async function getAllAttendance(filters: AllAttendanceFilters = {}): Promise<AllAttendanceResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.employee_id) params.set("employee_id", filters.employee_id);
  if (filters.status) params.set("status", filters.status);
  if (typeof filters.include_analytics === 'boolean') params.set("include_analytics", String(filters.include_analytics));
  if (typeof filters.include_trends === 'boolean') params.set("include_trends", String(filters.include_trends));

  const url = `/v1/attendance/all${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiRequest("GET", url);
  const json = (await res.json()) as ApiResponse<AllAttendanceResponse>;
  if (json.status !== "success") {
    throw new Error(json.message || "Failed to fetch attendance");
  }
  return json.data;
}

export async function getComprehensiveAnalytics(start_date?: string, end_date?: string): Promise<ComprehensiveAnalytics> {
  const params = new URLSearchParams();
  if (start_date) params.set("start_date", start_date);
  if (end_date) params.set("end_date", end_date);
  const url = `/v1/attendance/analytics/comprehensive${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiRequest("GET", url);
  const json = (await res.json()) as ApiResponse<ComprehensiveAnalytics>;
  if (json.status !== "success") {
    throw new Error(json.message || "Failed to fetch analytics");
  }
  return json.data;
}
