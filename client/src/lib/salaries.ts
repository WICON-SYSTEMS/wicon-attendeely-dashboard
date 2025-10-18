import { apiCall } from "./queryClient";

export type SalaryRecord = {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string | null;
  position: string | null;
  base_salary: number | null;
  monthly_hours_worked: number | null;
  expected_hours: number | null;
  hourly_rate: number | null;
  calculated_salary: number | null;
  image_url: string | null;
  month: string;
  year: number;
};

export type SalariesListResponse = {
  salaries: SalaryRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
  month_summary: {
    month: string;
    year: number;
    total_employees: number;
    total_salary_budget: number;
    total_hours_worked: number;
    expected_hours_per_employee: number;
    average_hours_worked: number;
    department_filter: string | null;
  };
};

export async function getAllSalaries(params: {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  department?: string;
} = {}): Promise<SalariesListResponse> {
  const { page = 1, limit = 20, month, year, department } = params;
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  if (month) sp.set("month", String(month));
  if (year) sp.set("year", String(year));
  if (department) sp.set("department", department);
  return await apiCall<SalariesListResponse>("GET", `/v1/admin/salary/all?${sp.toString()}`);
}

export type EmployeeSalaryResponse = {
  salary_info: SalaryRecord;
  attendance_details: {
    days_worked: number;
    days_present: number;
    total_attendance_records: number;
    attendance_percentage: number;
    hours_efficiency: number;
  };
  salary_breakdown: {
    base_monthly_salary: number | null;
    hourly_rate: number | null;
    hours_worked: number | null;
    expected_hours: number | null;
    calculated_salary: number | null;
    salary_difference: number | null;
  };
};

export async function getEmployeeSalary(employeeId: string, params: { month?: number; year?: number } = {}): Promise<EmployeeSalaryResponse> {
  const sp = new URLSearchParams();
  if (params.month) sp.set("month", String(params.month));
  if (params.year) sp.set("year", String(params.year));
  const qs = sp.toString();
  const path = qs ? `/v1/admin/salary/${employeeId}?${qs}` : `/v1/admin/salary/${employeeId}`;
  return await apiCall<EmployeeSalaryResponse>("GET", path);
}
