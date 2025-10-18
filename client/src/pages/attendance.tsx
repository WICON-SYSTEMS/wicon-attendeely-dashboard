import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, RefreshCcw, Download, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEmployees } from "@/hooks/use-employees";
import { useToast } from "@/hooks/use-toast";
import { getAllAttendance, getEmployeeAttendance, type AttendanceRecord, type ComprehensiveAnalytics } from "@/lib/attendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadBrandedCsv } from "@/lib/downloads";

// Helpers
const formatTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString() : "-");
const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "-");

export default function AttendancePage() {
  const ALL_EMP_VALUE = "__ALL__";
  const { employees, isLoading: isLoadingEmployees } = useEmployees();
  const { toast } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [summaryMode, setSummaryMode] = useState<"daily" | "period">("daily");
  const [dailyBreakdown, setDailyBreakdown] = useState<Array<{
    date: string;
    total_employees: number;
    present: number;
    late: number;
    absent: number;
    checked_out: number;
    still_checked_in: number;
    total_hours_worked: number;
    average_hours_per_employee: number;
  }>>([]);

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string>("");
  const [historyStartDate, setHistoryStartDate] = useState<string>("");
  const [historyEndDate, setHistoryEndDate] = useState<string>("");
  const [historyRows, setHistoryRows] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.employee_id, e])), [employees]);
  const selectedEmployee = selectedEmployeeId ? employeeMap.get(selectedEmployeeId) : undefined;

  const handleEmployeeChange = (v: string) => {
    const id = v === ALL_EMP_VALUE ? "" : v;
    setSelectedEmployeeId(id);
    // Auto-refresh when changing employee selection
    // slight delay to ensure state is applied
    setTimeout(() => {
      handleRefresh();
    }, 0);
  };

  // History helpers
  const openHistory = async (employeeId: string) => {
    setHistoryEmployeeId(employeeId);
    setHistoryOpen(true);
    await refreshHistory(employeeId);
  };

  const refreshHistory = async (employeeId?: string) => {
    if (!(employeeId || historyEmployeeId)) return;
    try {
      setHistoryLoading(true);
      const data = await getEmployeeAttendance(employeeId || historyEmployeeId, historyStartDate || undefined, historyEndDate || undefined);
      setHistoryRows(data.attendance_records || []);
    } catch (e: any) {
      toast({ title: "Failed to load history", description: e?.message || "Could not fetch employee attendance", variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportHistoryCsv = () => {
    if (!historyRows.length) {
      toast({ title: "No data", description: "No history to export.", variant: "destructive" });
      return;
    }
    const headers = ["attendance_id","employee_id","date","check_in_time","check_out_time","hours_worked","status","qr_code_scanned","created_at","updated_at"];
    const rows = historyRows.map(r => [r.attendance_id, r.employee_id, r.date, r.check_in_time, r.check_out_time, r.hours_worked ?? "", r.status, r.qr_code_scanned ?? "", r.created_at, r.updated_at ?? ""]);
    downloadBrandedCsv(headers, rows, `attendance_${historyEmployeeId}`);
  };

  // Auto-fetch on initial mount
  useEffect(() => {
    // Preselect employee from URL if provided
    try {
      const params = new URLSearchParams(window.location.search);
      const eid = params.get("employee_id");
      if (eid) {
        setSelectedEmployeeId(eid);
        setTimeout(() => handleRefresh(), 0);
        return;
      }
    } catch {}
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const resp = await getAllAttendance({
        page: 1,
        limit: 20,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        status: status !== 'all' ? status : undefined,
        include_analytics: true,
        include_trends: true,
      });
      setRows(resp.attendance_records);
      setAnalytics(resp.comprehensive_analytics || null);
      setDailyBreakdown(resp.daily_breakdown || []);
      toast({ title: "Attendance loaded", description: `${resp.pagination?.total_items ?? resp.attendance_records.length} records retrieved.` });
    } catch (e: any) {
      toast({ title: "Failed to load", description: e?.message || "Could not fetch attendance", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!rows.length) {
      toast({ title: "No data", description: "Load attendance first.", variant: "destructive" });
      return;
    }
    const headers = ["attendance_id","employee_id","date","check_in_time","check_out_time","hours_worked","status","qr_code_scanned","created_at","updated_at"];
    const csvRows = rows.map((r: AttendanceRecord) => [
      r.attendance_id,
      r.employee_id,
      r.date,
      r.check_in_time,
      r.check_out_time,
      r.hours_worked ?? "",
      r.status,
      r.qr_code_scanned ?? "",
      r.created_at,
      r.updated_at ?? "",
    ]);
    downloadBrandedCsv(headers, csvRows, `attendance_${selectedEmployeeId || "all"}`);
  };

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const emp = employeeMap.get(r.employee_id);
    const empName = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : r.employee_id.toLowerCase();
    const matchesQuery = !q || empName.includes(q);
    const matchesStatus = status === "all" || r.status.toLowerCase() === status;
    return matchesQuery && matchesStatus;
  });

  // Compute cards based on summaryMode
  const targetDay = (endDate || new Date().toISOString().slice(0,10));
  const dayRow = dailyBreakdown.find(d => d.date === targetDay);
  const presentCount = summaryMode === 'daily'
    ? (dayRow?.present ?? filtered.length)
    : (analytics?.overall_summary?.total_present_days ?? filtered.length);
  const lateCount = summaryMode === 'daily'
    ? (dayRow?.late ?? 0)
    : (analytics?.overall_summary?.total_late_days ?? 0);
  const absentCount = summaryMode === 'daily'
    ? (dayRow?.absent ?? 0)
    : (analytics?.overall_summary?.total_absent_days ?? 0);
  const stillCheckedIn = dayRow?.still_checked_in ?? 0;
  const checkedOut = dayRow?.checked_out ?? 0;
  const totalEmployeesToday = dayRow?.total_employees ?? employees.length;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground mt-2">Track employee daily attendance and punctuality.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={loading || isLoadingEmployees}>
              <RefreshCcw className={"w-4 h-4" + (loading ? " animate-spin" : "")} /> {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button className="gap-2" onClick={handleExport} disabled={!filtered.length}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Search</label>
                <Input placeholder="Search employee..." value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Employee (optional)</label>
                <Select value={selectedEmployeeId || ALL_EMP_VALUE} onValueChange={handleEmployeeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingEmployees ? "Loading employees..." : "All employees"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_EMP_VALUE}>All employees</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.employee_id} value={e.employee_id}>
                        {e.first_name} {e.last_name} ({e.employee_code}) • {e.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start date" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End date" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Summary</h2>
            {selectedEmployee && (
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7" title={`${selectedEmployee.first_name} ${selectedEmployee.last_name} (${selectedEmployee.employee_code})`}>
                  <AvatarImage src={(selectedEmployee as any).image_url || ""} alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} />
                  <AvatarFallback className="bg-muted text-[10px]">
                    {`${selectedEmployee.first_name[0]}${selectedEmployee.last_name[0]}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mode:</span>
            <Select value={summaryMode} onValueChange={(v) => setSummaryMode(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="period">Period</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Present</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{presentCount}</div>
              <p className="text-sm text-muted-foreground mt-2">{summaryMode === 'daily' ? 'Employees present (day)' : 'Present days (period)'}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Late</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{lateCount}</div>
              <p className="text-sm text-muted-foreground mt-2">{summaryMode === 'daily' ? 'Late arrivals (day)' : 'Late days (period)'}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Absent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{absentCount}</div>
              <p className="text-sm text-muted-foreground mt-2">{summaryMode === 'daily' ? 'Not checked in (day)' : 'Absent days (period)'}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Checked-out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{checkedOut}</div>
              <p className="text-sm text-muted-foreground mt-2">Completed work (day)</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">Date: {targetDay} • Employees: {totalEmployeesToday} • Still checked-in: {stillCheckedIn}</p>

        {/* Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              Attendance {selectedEmployee ? `– ${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "(All)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left p-4 font-medium">Employee</th>
                    <th className="text-left p-4 font-medium">Department</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Check-in</th>
                    <th className="text-left p-4 font-medium">Check-out</th>
                    <th className="text-left p-4 font-medium">Hours</th>
                    <th className="text-left p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const emp = employeeMap.get(r.employee_id);
                    const name = r.employee_name || (emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id);
                    const imageUrl = (emp as any)?.image_url || "";
                    const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : (r.employee_name ? r.employee_name[0] : '?');
                    const dept = r.department || emp?.department || "-";
                    const badgeClass = r.status === 'checked_out'
                      ? 'px-2 py-1 rounded-full text-xs bg-green-100 text-green-700'
                      : 'px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700';
                    return (
                      <tr key={r.attendance_id} className="border-b last:border-b-0">
                        <td className="p-4 font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8" title={`${name}${emp?.employee_code ? ` (${emp.employee_code})` : ''}`}>
                              <AvatarImage src={imageUrl} alt={name} />
                              <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <button className="text-primary hover:underline inline-flex items-center gap-1" onClick={() => openHistory(r.employee_id)} title="View attendance history">
                              <Eye className="w-4 h-4" /> {name}
                            </button>
                          </div>
                        </td>
                        <td className="p-4">{dept}</td>
                        <td className="p-4">
                          <span className={badgeClass}>{r.status}</span>
                        </td>
                        <td className="p-4">{formatTime(r.check_in_time)}</td>
                        <td className="p-4">{formatTime(r.check_out_time)}</td>
                        <td className="p-4">{r.hours_worked ?? '-'}</td>
                        <td className="p-4">{formatDate(r.date)}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="p-6 text-muted-foreground" colSpan={7}>
                        No attendance records for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Attendance History Modal */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={(employeeMap.get(historyEmployeeId) as any)?.image_url || ""} alt={employeeMap.get(historyEmployeeId) ? `${employeeMap.get(historyEmployeeId)!.first_name} ${employeeMap.get(historyEmployeeId)!.last_name}` : "Employee"} />
                  <AvatarFallback className="bg-muted">
                    {employeeMap.get(historyEmployeeId) ? `${employeeMap.get(historyEmployeeId)!.first_name[0]}${employeeMap.get(historyEmployeeId)!.last_name[0]}`.toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle>Attendance History</DialogTitle>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {employeeMap.get(historyEmployeeId) ? `${employeeMap.get(historyEmployeeId)!.first_name} ${employeeMap.get(historyEmployeeId)!.last_name}` : historyEmployeeId}
                    </p>
                    {employeeMap.get(historyEmployeeId) && (
                      <a
                        href={`/employees?q=${encodeURIComponent(employeeMap.get(historyEmployeeId)!.employee_code)}`}
                        className="text-xs text-primary hover:underline"
                        title={`View employee ${employeeMap.get(historyEmployeeId)!.first_name} ${employeeMap.get(historyEmployeeId)!.last_name} (${employeeMap.get(historyEmployeeId)!.employee_code})`}
                      >
                        View employee
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">Start date</label>
                  <Input type="date" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">End date</label>
                  <Input type="date" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => refreshHistory()} disabled={historyLoading} className="w-full">
                    <RefreshCcw className={"w-4 h-4 mr-2" + (historyLoading ? " animate-spin" : "")} /> {historyLoading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button onClick={exportHistoryCsv} className="w-full"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
                </div>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Employee</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Check-in</th>
                      <th className="text-left p-3 font-medium">Check-out</th>
                      <th className="text-left p-3 font-medium">Hours</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">QR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr><td className="p-4" colSpan={7}>Loading...</td></tr>
                    ) : historyRows.length === 0 ? (
                      <tr><td className="p-4 text-muted-foreground" colSpan={7}>No records.</td></tr>
                    ) : (
                      historyRows.map((h) => (
                        <tr key={h.attendance_id} className="border-b last:border-b-0">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={(employeeMap.get(historyEmployeeId) as any)?.image_url || ""} alt="Employee" />
                                <AvatarFallback className="bg-muted text-xs">
                                  {employeeMap.get(historyEmployeeId) ? `${employeeMap.get(historyEmployeeId)!.first_name[0]}${employeeMap.get(historyEmployeeId)!.last_name[0]}`.toUpperCase() : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {employeeMap.get(historyEmployeeId) ? `${employeeMap.get(historyEmployeeId)!.first_name} ${employeeMap.get(historyEmployeeId)!.last_name}` : historyEmployeeId}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">{formatDate(h.date)}</td>
                          <td className="p-3">{formatTime(h.check_in_time)}</td>
                          <td className="p-3">{formatTime(h.check_out_time)}</td>
                          <td className="p-3">{h.hours_worked ?? '-'}</td>
                          <td className="p-3">{h.status}</td>
                          <td className="p-3">{h.qr_code_scanned || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
