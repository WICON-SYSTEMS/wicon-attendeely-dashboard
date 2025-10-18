import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, BarChart3, Download, RefreshCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { getComprehensiveAnalytics, getAttendanceTrends, getEmployeeAnalytics, type ComprehensiveAnalytics, type AttendanceTrends, type EmployeeAnalyticsResponse } from "@/lib/attendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEmployees } from "@/hooks/use-employees";
import { getDownloadFileName, brandCsvHeaderRow } from "@/lib/branding";

type SimpleDateRange = { from?: string; to?: string };

// Recharts-based trends chart (multi-series)
function TrendsChart({ trends }: { trends: AttendanceTrends | null }) {
  const data = (trends?.daily_trends || []).map(d => ({
    date: d.date,
    present: d.present,
    absent: d.absent,
    checked_out: d.checked_out,
    still_in: d.still_checked_in,
  }));
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} dot={false} name="Present" />
          <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
          <Line type="monotone" dataKey="checked_out" stroke="#3b82f6" strokeWidth={2} dot={false} name="Checked-out" />
          <Line type="monotone" dataKey="still_in" stroke="#a855f7" strokeWidth={2} dot={false} name="Still in" />
        </LineChart>
      </ResponsiveContainer>
      {data.length === 0 && <p className="text-sm text-muted-foreground mt-2">No trends data to display.</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const { employees } = useEmployees();
  const employeeMap = useMemo(() => new Map((employees || []).map(e => [e.employee_id, e])), [employees]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<SimpleDateRange | undefined>({
    from: new Date().toISOString().slice(0,10).replace(/-\d{2}$/, "-01"),
    to: new Date().toISOString().slice(0,10),
  });
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<AttendanceTrends | null>(null);
  const [trendsDays, setTrendsDays] = useState<string>("30");
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendsView, setTrendsView] = useState<"table" | "chart">("chart");
  const [useRangeForTrends, setUseRangeForTrends] = useState<boolean>(false);
  const [summaryView, setSummaryView] = useState<"table" | "chart">("table");
  // Employee analytics modal state
  const [empOpen, setEmpOpen] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [empId, setEmpId] = useState<string>("");
  const [empName, setEmpName] = useState<string>("");
  const [empCode, setEmpCode] = useState<string>("");
  const [empDept, setEmpDept] = useState<string>("");
  const [empStart, setEmpStart] = useState<string>("");
  const [empEnd, setEmpEnd] = useState<string>("");
  const [empData, setEmpData] = useState<EmployeeAnalyticsResponse | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const data = await getComprehensiveAnalytics(range?.from, range?.to);
      setAnalytics(data);
      toast({ title: "Reports loaded", description: `Period ${data.period.start_date} to ${data.period.end_date}` });
    } catch (e: any) {
      toast({ title: "Failed to load", description: e?.message || "Could not fetch analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeAnalytics = async (row: { employee_id: string; employee_name: string; employee_code: string; department: string; }) => {
    setEmpId(row.employee_id);
    setEmpName(row.employee_name);
    setEmpCode(row.employee_code);
    setEmpDept(row.department);
    setEmpOpen(true);
    await refreshEmployeeAnalytics(row.employee_id);
  };

  const refreshEmployeeAnalytics = async (id?: string) => {
    const target = id || empId;
    if (!target) return;
    try {
      setEmpLoading(true);
      const data = await getEmployeeAnalytics(target, empStart || undefined, empEnd || undefined);
      setEmpData(data);
    } catch (e: any) {
      toast({ title: "Failed to load employee analytics", description: e?.message || "Could not fetch analytics", variant: "destructive" });
    } finally {
      setEmpLoading(false);
    }
  };

  const exportEmployeeAnalyticsCsv = () => {
    if (!empData) { toast({ title: "No data", description: "Load analytics first.", variant: "destructive" }); return; }
    const headers = ["attendance_id","employee_id","date","check_in_time","check_out_time","hours_worked","status","qr_code_scanned","created_at","updated_at"];
    const toCsvValue = (v: unknown) => `"${(v ?? "").toString().replace(/"/g,'""')}"`;
    const rows = empData.attendance_records.map(r => [r.attendance_id, r.employee_id, r.date, r.check_in_time, r.check_out_time, r.hours_worked ?? "", r.status, r.qr_code_scanned ?? "", r.created_at, r.updated_at ?? ""]);
    const brandRow = brandCsvHeaderRow();
    const csv = [brandRow, headers, ...rows].map(r => r.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileBase = getDownloadFileName(`employee_${empCode || empId}_attendance`);
    a.download = `${fileBase}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Auto-fetch on initial mount
  useEffect(() => {
    handleGenerate();
    handleLoadTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadTrends = async () => {
    try {
      setLoadingTrends(true);
      let days = Number(trendsDays) || 30;
      if (useRangeForTrends && range?.from && range?.to) {
        const d1 = new Date(range.from);
        const d2 = new Date(range.to);
        const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        days = Math.max(1, Math.min(365, diff));
      }
      const data = await getAttendanceTrends(days);
      setTrends(data);
      toast({ title: "Trends loaded", description: data.period });
    } catch (e: any) {
      toast({ title: "Failed to load trends", description: e?.message || "Could not fetch trends", variant: "destructive" });
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleExport = () => {
    if (!analytics) {
      toast({ title: "No data", description: "Generate the report first.", variant: "destructive" });
      return;
    }
    const rows = analytics.employee_stats;
    const headers = [
      "employee_id","employee_name","employee_code","department","total_days_present","total_days_late","total_days_absent","total_days_partial","total_hours_worked","average_hours_per_day","attendance_percentage","punctuality_percentage","last_attendance_date","current_status","working_days_in_period"
    ];
    const toCsvValue = (v: unknown) => `"${(v ?? "").toString().replace(/"/g,'""')}"`;
    const brandRow = brandCsvHeaderRow();
    const csv = [brandRow, headers, ...rows.map(r => [
      r.employee_id,
      r.employee_name,
      r.employee_code,
      r.department,
      r.total_days_present,
      r.total_days_late,
      r.total_days_absent,
      r.total_days_partial,
      r.total_hours_worked,
      r.average_hours_per_day,
      r.attendance_percentage,
      r.punctuality_percentage,
      r.last_attendance_date ?? "",
      r.current_status,
      r.working_days_in_period,
    ])].map(r => r.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileBase = getDownloadFileName(`reports_${analytics.period.start_date}_${analytics.period.end_date}`);
    a.download = `${fileBase}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = (analytics?.employee_stats || []).filter((row) => {
    const q = query.toLowerCase();
    return !q || row.employee_name.toLowerCase().includes(q) || row.employee_code.toLowerCase().includes(q) || row.department.toLowerCase().includes(q);
  });

  const kpi = analytics?.overall_summary;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-2">Generate attendance and productivity summaries.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleGenerate} disabled={loading}>
              <RefreshCcw className={"w-4 h-4" + (loading ? " animate-spin" : "")} /> {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button className="gap-2" onClick={handleExport} disabled={!analytics}>
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
              <div className="lg:col-span-2">
                <label className="text-sm text-muted-foreground">Date range</label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={range?.from || ""} onChange={(e) => setRange(r => ({ ...(r||{}), from: e.target.value }))} />
                  <Input type="date" value={range?.to || ""} onChange={(e) => setRange(r => ({ ...(r||{}), to: e.target.value }))} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pick a start and end date then click Generate.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Analytics Modal */}
        <Dialog open={empOpen} onOpenChange={setEmpOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Employee Analytics – {empName} ({empCode}) • {empDept}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">Start date</label>
                  <Input type="date" value={empStart} onChange={(e) => setEmpStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">End date</label>
                  <Input type="date" value={empEnd} onChange={(e) => setEmpEnd(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => refreshEmployeeAnalytics()} disabled={empLoading} className="w-full">
                    <RefreshCcw className={"w-4 h-4 mr-2" + (empLoading ? " animate-spin" : "")} /> {empLoading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button onClick={exportEmployeeAnalyticsCsv} className="w-full"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm"><CardHeader><CardTitle>Present Days</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{empData?.employee_statistics.total_days_present ?? 0}</div></CardContent></Card>
                <Card className="shadow-sm"><CardHeader><CardTitle>Late Days</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{empData?.employee_statistics.total_days_late ?? 0}</div></CardContent></Card>
                <Card className="shadow-sm"><CardHeader><CardTitle className="text-red-600" >Absent Days</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{empData?.employee_statistics.total_days_absent ?? 0}</div></CardContent></Card>
                <Card className="shadow-sm"><CardHeader><CardTitle>Total Hours</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{empData?.employee_statistics.total_hours_worked ?? 0}</div></CardContent></Card>
              </div>

              {/* Records table */}
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Check-in</th>
                      <th className="text-left p-3 font-medium">Check-out</th>
                      <th className="text-left p-3 font-medium">Hours</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">QR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empLoading ? (
                      <tr><td className="p-4" colSpan={6}>Loading...</td></tr>
                    ) : !empData || empData.attendance_records.length === 0 ? (
                      <tr><td className="p-4 text-muted-foreground" colSpan={6}>No records.</td></tr>
                    ) : (
                      empData.attendance_records.map((r) => (
                        <tr key={r.attendance_id} className="border-b last:border-b-0">
                          <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="p-3">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'}</td>
                          <td className="p-3">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</td>
                          <td className="p-3">{r.hours_worked ?? '-'}</td>
                          <td className="p-3">{r.status}</td>
                          <td className="p-3">{r.qr_code_scanned || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trends */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Trends</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>View:</span>
                  <div className="flex items-center gap-1 bg-muted rounded p-1">
                    <Button size="sm" variant={trendsView === 'chart' ? 'default' : 'ghost'} onClick={() => setTrendsView('chart')}>Chart</Button>
                    <Button size="sm" variant={trendsView === 'table' ? 'default' : 'ghost'} onClick={() => setTrendsView('table')}>Table</Button>
                  </div>
                </div>
                <div className="hidden md:block w-px h-6 bg-border" />
                <div className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" checked={useRangeForTrends} onChange={(e) => setUseRangeForTrends(e.target.checked)} /> Use date range</label>
                </div>
                <Select value={trendsDays} onValueChange={(v) => setTrendsDays(v)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleLoadTrends} disabled={loadingTrends}>
                  <RefreshCcw className={"w-4 h-4 mr-1" + (loadingTrends ? " animate-spin" : "")} />
                  {loadingTrends ? "Loading..." : "Refresh"}
                </Button>
                <Button size="sm" onClick={() => {
                  if (!trends) { toast({ title: "No data", description: "Load trends first.", variant: "destructive" }); return; }
                  const headers = ["date","total_employees","present","late","absent","checked_out","still_checked_in"];
                  const toCsvValue = (v: unknown) => `"${(v ?? "").toString().replace(/"/g,'""')}"`;
                  const rows = trends.daily_trends.map(d => [d.date, d.total_employees, d.present, d.late, d.absent, d.checked_out, d.still_checked_in]);
                  const csv = [headers, ...rows].map(r => r.map(toCsvValue).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `trends_${trends.start_date}_${trends.end_date}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{trends ? `${trends.start_date} → ${trends.end_date}` : "Select a range and refresh."}</p>
          </CardHeader>
          <CardContent>
            {trendsView === 'chart' ? (
              <TrendsChart trends={trends} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Present</th>
                      <th className="text-left p-3 font-medium">Late</th>
                      <th className="text-left p-3 font-medium">Absent</th>
                      <th className="text-left p-3 font-medium">Checked-out</th>
                      <th className="text-left p-3 font-medium">Still in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trends?.daily_trends || []).map((d) => (
                      <tr key={d.date} className="border-b last:border-b-0">
                        <td className="p-3 whitespace-nowrap">{d.date}</td>
                        <td className="p-3">{d.present}</td>
                        <td className="p-3">{d.late}</td>
                        <td className="p-3">{d.absent}</td>
                        <td className="p-3">{d.checked_out}</td>
                        <td className="p-3">{d.still_checked_in}</td>
                      </tr>
                    ))}
                    {(!trends || trends.daily_trends.length === 0) && (
                      <tr>
                        <td className="p-6 text-muted-foreground" colSpan={6}>No trends data.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi?.total_employees ?? 0}</div>
              <p className="text-sm text-muted-foreground mt-2">In this period</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Present Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{kpi?.total_present_days ?? 0}</div>
              <p className="text-sm text-muted-foreground mt-2">Total attendance days</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Late Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{kpi?.total_late_days ?? 0}</div>
              <p className="text-sm text-muted-foreground mt-2">Late arrivals</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Absent Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{kpi?.total_absent_days ?? 0}</div>
              <p className="text-sm text-muted-foreground mt-2">Unexcused absences</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Total Hours Worked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi?.total_hours_worked ?? 0}</div>
              <p className="text-sm text-muted-foreground mt-2">Sum of hours in period</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi?.overall_attendance_rate ?? 0}%</div>
              <p className="text-sm text-muted-foreground mt-2">Across all employees</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Punctuality Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi?.overall_punctuality_rate ?? 0}%</div>
              <p className="text-sm text-muted-foreground mt-2">Across all employees</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Summary (Table/Chart toggle) */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Summary</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>View:</span>
                <div className="flex items-center gap-1 bg-muted rounded p-1">
                  <Button size="sm" variant={summaryView === 'table' ? 'default' : 'ghost'} onClick={() => setSummaryView('table')}>Table</Button>
                  <Button size="sm" variant={summaryView === 'chart' ? 'default' : 'ghost'} onClick={() => { setSummaryView('chart'); if (!trends) handleLoadTrends(); }}>Chart</Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className={summaryView === 'table' ? 'p-0' : ''}>
            {summaryView === 'chart' ? (
              <TrendsChart trends={trends} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-4 font-medium">Employee</th>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Days Present</th>
                      <th className="text-left p-4 font-medium">Days Late</th>
                      <th className="text-left p-4 font-medium">Days Absent</th>
                      <th className="text-left p-4 font-medium">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const emp = employeeMap.get(row.employee_id);
                      const imageUrl = (emp as any)?.image_url || "";
                      const initials = row.employee_name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
                      const title = `${row.employee_name} (${row.employee_code})`;
                      const attendanceHref = `/attendance?employee_id=${encodeURIComponent(row.employee_id)}`;
                      const viewHref = `/employees?q=${encodeURIComponent(row.employee_code)}`;
                      return (
                        <tr key={row.employee_id} className="border-b last:border-b-0 hover:bg-accent/40">
                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8" title={title}>
                                <AvatarImage src={imageUrl} alt={row.employee_name} />
                                <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <a href={attendanceHref} className="text-primary hover:underline" title="Open in Attendance">
                                  {row.employee_name} ({row.employee_code})
                                </a>
                                <span className="text-muted-foreground">•</span>
                                <button className="text-primary/80 hover:underline" onClick={() => openEmployeeAnalytics(row)} title="Open analytics modal">Analytics</button>
                                <span className="text-muted-foreground">•</span>
                                <a href={viewHref} className="text-primary/80 hover:underline" title="View employee">View</a>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">{row.department}</td>
                          <td className="p-4">{row.total_days_present}</td>
                          <td className="p-4">{row.total_days_late}</td>
                          <td className="p-4">{row.total_days_absent}</td>
                          <td className="p-4">{row.total_hours_worked}</td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td className="p-6 text-muted-foreground" colSpan={6}>
                          No report data for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
