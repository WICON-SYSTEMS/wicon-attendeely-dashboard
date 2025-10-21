import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useEmployees } from "@/hooks/use-employees";
import { Users, UserCheck, Clock, Calendar, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAttendanceTrends, getAllAttendance, type AttendanceRecord } from "@/lib/attendance";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const { employees, isLoading, error } = useEmployees();

  // Real data state
  const [weeklyAttendance, setWeeklyAttendance] = useState<Array<{ day: string; percentage: number; title: string }>>([]);
  const [recentActivities, setRecentActivities] = useState<Array<{ employeeId: string; name: string; imageUrl?: string; message: string; detail: string; time: string; color: string }>>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const weeklyHasData = weeklyAttendance.some(d => d.percentage > 0);
  // KPI snapshot (backend-driven)
  const [kpi, setKpi] = useState<{ present: number | null; total: number | null; prevPresent: number | null; late: number | null }>({ present: null, total: null, prevPresent: null, late: null });

  // Live clock for local time display
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = now;
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Local-time-based greeting
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Local time and timezone label
  const timeString = today.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tzPart = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(today)
    .find(p => p.type === 'timeZoneName')?.value;
  const offsetMinutes = -today.getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  const gmtOffset = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
  const timeWithZone = `${timeString} ${tzPart || gmtOffset}`;

  // Calculate stats from backend trends + employees list
  const employeeList = Array.isArray(employees) ? employees : [];
  const totalEmployeesLocal = employeeList.length;
  const activeEmployees = employeeList.filter(emp => emp.status === 'active').length;
  const presentToday = kpi.present ?? 0;
  const totalFromApi = kpi.total ?? null;
  const totalEmployees = totalFromApi ?? totalEmployeesLocal;
  const absentToday = totalEmployees != null ? Math.max(totalEmployees - presentToday, 0) : 0;
  const prevPresent = kpi.prevPresent;
  const changeValue = prevPresent != null && totalEmployees ? Math.round(((presentToday - prevPresent) / totalEmployees) * 100) : null;

  const stats = [
    {
      title: "Total Employees",
      value: (totalEmployees ?? 0).toString(),
      icon: Users,
      color: "bg-sky-500 text-white"
    },
    {
      title: "Active Employees",
      value: activeEmployees.toString(),
      icon: UserCheck,
      color: "bg-emerald-500 text-white"
    },
    {
      title: "Present Today",
      value: presentToday.toString(),
      icon: UserCheck,
      change: changeValue != null ? `${changeValue > 0 ? '+' : ''}${changeValue}%` : undefined,
      changeText: changeValue != null ? "vs yesterday" : "",
      positive: changeValue != null ? changeValue >= 0 : null,
      color: "bg-emerald-100 text-emerald-700"
    },
    {
      title: "Late Arrivals",
      value: (kpi.late ?? "-").toString(),
      icon: Clock,
      change: undefined,
      changeText: "",
      positive: null,
      color: "bg-amber-100 text-amber-700"
    },
    {
      title: "Absent Today",
      value: absentToday.toString(),
      icon: Calendar,
      change: "",
      changeText: "",
      positive: null,
      color: "bg-rose-100 text-rose-700"
    }
  ];

  // Load real weekly attendance (derive last 7 non-empty days from last 30 days)
  useEffect(() => {
    const loadTrends = async () => {
      try {
        setLoadingTrends(true);
        const trends = await getAttendanceTrends(30);
        const all = trends.daily_trends || [];
        const withData = all.filter(d => (d.total_employees ?? 0) > 0 || (d.present ?? 0) > 0);
        const picked = (withData.length >= 7 ? withData.slice(-7) : all.slice(-7));
        const days = picked.map(d => {
          const date = new Date(d.date);
          const label = date.toLocaleDateString(undefined, { weekday: 'short' });
          const pct = d.total_employees > 0 ? Math.round((d.present / d.total_employees) * 100) : 0;
          const title = `${date.toLocaleDateString()} • Present ${d.present}/${d.total_employees} (${pct}%)`;
          return { day: label, percentage: pct, title };
        });
        setWeeklyAttendance(days);
        setLastUpdated(new Date().toLocaleString());
        // Update KPI from latest trends
        const last = all.length ? all[all.length - 1] : null;
        const prev = all.length > 1 ? all[all.length - 2] : null;
        setKpi(k => ({
          present: last && typeof last.present === 'number' ? last.present : null,
          total: last && typeof last.total_employees === 'number' ? last.total_employees : null,
          prevPresent: prev && typeof prev.present === 'number' ? prev.present : null,
          late: last && typeof last.late === 'number' ? last.late : k.late,
        }));
      } catch (e) {
        // swallow errors on dashboard load
      } finally {
        setLoadingTrends(false);
      }
    };
    loadTrends();
  }, []);

  // Load recent activities (latest attendance records)
  useEffect(() => {
    const loadRecent = async () => {
      try {
        setLoadingRecent(true);
        const resp = await getAllAttendance({ page: 1, limit: 8 });
        const empMap = new Map((employees || []).map(e => [e.employee_id, e]));
        const items = (resp.attendance_records || []).map((r: AttendanceRecord) => {
          const emp = empMap.get(r.employee_id);
          const name = (r as any).employee_name || (emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id);
          const imageUrl = (emp as any)?.image_url || undefined;
          const time = r.check_in_time || r.created_at;
          const timeText = new Date(time).toLocaleTimeString();
          const message = r.status === 'checked_out' ? 'Checked out' : 'Checked in';
          const color = r.status === 'checked_out' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600';
          const detail = `${new Date(r.date).toLocaleDateString()}`;
          return { employeeId: r.employee_id, name, imageUrl, message, detail, time: timeText, color };
        });
        setRecentActivities(items);
      } finally {
        setLoadingRecent(false);
      }
    };
    loadRecent();
  }, [employees]);

  // Load KPI from /attendance/all daily_breakdown (today & yesterday) to include 'late'
  useEffect(() => {
    const loadKpiFromAll = async () => {
      try {
        const fmt = (d: Date) => d.toISOString().slice(0,10);
        const todayDate = new Date();
        const yest = new Date(todayDate);
        yest.setDate(todayDate.getDate() - 1);
        const resp = await getAllAttendance({
          page: 1,
          limit: 1,
          start_date: fmt(yest),
          end_date: fmt(todayDate),
          include_analytics: true,
          include_trends: false,
        });
        const days = resp.daily_breakdown || [];
        const last = days.length ? days[days.length - 1] : null;
        const prev = days.length > 1 ? days[days.length - 2] : null;
        setKpi(k => ({
          present: last ? last.present : k.present,
          total: last ? last.total_employees : k.total,
          prevPresent: prev ? prev.present : k.prevPresent,
          late: last ? last.late : k.late,
        }));
      } catch {}
    };
    loadKpiFromAll();
  }, []);

  const handleRefresh = async () => {
    setLoadingTrends(true);
    setLoadingRecent(true);
    // trigger both loaders concurrently
    await Promise.all([
      (async () => {
        const trends = await getAttendanceTrends(30);
        const all = trends.daily_trends || [];
        const withData = all.filter(d => (d.total_employees ?? 0) > 0 || (d.present ?? 0) > 0);
        const picked = (withData.length >= 7 ? withData.slice(-7) : all.slice(-7));
        const days = picked.map(d => {
          const date = new Date(d.date);
          const label = date.toLocaleDateString(undefined, { weekday: 'short' });
          const pct = d.total_employees > 0 ? Math.round((d.present / d.total_employees) * 100) : 0;
          const title = `${date.toLocaleDateString()} • Present ${d.present}/${d.total_employees} (${pct}%)`;
          return { day: label, percentage: pct, title };
        });
        setWeeklyAttendance(days);
        const last = all.length ? all[all.length - 1] : null;
        const prev = all.length > 1 ? all[all.length - 2] : null;
        setKpi(k => ({
          present: last && typeof last.present === 'number' ? last.present : null,
          total: last && typeof last.total_employees === 'number' ? last.total_employees : null,
          prevPresent: prev && typeof prev.present === 'number' ? prev.present : null,
          late: last && typeof last.late === 'number' ? last.late : k.late,
        }));
      })(),
      // Refresh KPI from /attendance/all daily_breakdown
      (async () => {
        try {
          const fmt = (d: Date) => d.toISOString().slice(0,10);
          const todayDate = new Date();
          const yest = new Date(todayDate);
          yest.setDate(todayDate.getDate() - 1);
          const resp = await getAllAttendance({
            page: 1,
            limit: 1,
            start_date: fmt(yest),
            end_date: fmt(todayDate),
            include_analytics: true,
            include_trends: false,
          });
          const days = resp.daily_breakdown || [];
          const last = days.length ? days[days.length - 1] : null;
          const prev = days.length > 1 ? days[days.length - 2] : null;
          setKpi(k => ({
            present: last ? last.present : k.present,
            total: last ? last.total_employees : k.total,
            prevPresent: prev ? prev.present : k.prevPresent,
            late: last ? last.late : k.late,
          }));
        } catch {}
      })(),
      (async () => {
        const resp = await getAllAttendance({ page: 1, limit: 8 });
        const empMap = new Map((employees || []).map(e => [e.employee_id, e]));
        const items = (resp.attendance_records || []).map((r: AttendanceRecord) => {
          const emp = empMap.get(r.employee_id);
          const name = (r as any).employee_name || (emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id);
          const imageUrl = (emp as any)?.image_url || undefined;
          const time = r.check_in_time || r.created_at;
          const timeText = new Date(time).toLocaleTimeString();
          const message = r.status === 'checked_out' ? 'Checked out' : 'Checked in';
          const color = r.status === 'checked_out' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600';
          const detail = `${new Date(r.date).toLocaleDateString()}`;
          return { employeeId: r.employee_id, name, imageUrl, message, detail, time: timeText, color };
        });
        setRecentActivities(items);
      })()
    ]);
    setLoadingTrends(false);
    setLoadingRecent(false);
    setLastUpdated(new Date().toLocaleString());
  };

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {greeting}, {user?.full_name || 'Admin'}!
            </h1>
            <p className="text-muted-foreground mt-2">Today is {dateString} • {timeWithZone}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">Last updated: {lastUpdated}</span>
            )}
            <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={loadingTrends || loadingRecent}>
              <RefreshCcw className={"w-4 h-4" + ((loadingTrends || loadingRecent) ? " animate-spin" : "")} /> {loadingTrends || loadingRecent ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const titleColor =
              stat.title === 'Present Today' ? 'text-emerald-700' :
              stat.title === 'Absent Today' ? 'text-rose-700' :
              stat.title === 'Late Arrivals' ? 'text-amber-700' :
              stat.title === 'Active Employees' ? 'text-emerald-700' :
              stat.title === 'Total Employees' ? 'text-indigo-700' :
              'text-muted-foreground';
            const valueColor =
              stat.title === 'Present Today' ? 'text-emerald-700' :
              stat.title === 'Absent Today' ? 'text-rose-700' :
              stat.title === 'Late Arrivals' ? 'text-amber-700' :
              stat.title === 'Active Employees' ? 'text-emerald-700' :
              stat.title === 'Total Employees' ? 'text-indigo-700' :
              'text-foreground';
            return (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${titleColor}`}>
                        {stat.title}
                      </p>
                      <p className={`text-3xl font-bold ${valueColor}`} data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${
                      stat.positive === true ? 'text-green-600' :
                      stat.positive === false ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {stat.change}
                    </span>
                    {stat.changeText && (
                      <span className="text-muted-foreground ml-1">{stat.changeText}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Attendance Chart */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Weekly Attendance</h3>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="text-xs text-muted-foreground">Last updated: {lastUpdated}</span>
                  )}
                  <button onClick={handleRefresh} className="inline-flex items-center gap-2 text-sm px-3 py-2 border rounded hover:bg-accent" disabled={loadingTrends || loadingRecent}>
                    <RefreshCcw className={"w-4 h-4" + ((loadingTrends || loadingRecent) ? " animate-spin" : "")} /> Refresh
                  </button>
                </div>
              </div>
              <div className="h-80 md:h-96">
                {weeklyAttendance.length > 0 && weeklyHasData ? (
                  <ResponsiveContainer>
                    <BarChart data={weeklyAttendance} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number, _n, p: any) => [`${v}%`, p && p.payload && p.payload.title ? p.payload.title : '']} />
                      <Legend />
                      <Bar dataKey="percentage" name="Attendance %" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                    {loadingTrends ? 'Loading trends...' : 'No attendance recorded in the recent period.'}
                  </div>
                )}
                </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activities</h3>
              <div className="space-y-4">
                {(recentActivities.length ? recentActivities : []).map((activity, index) => {
                  const initials = activity.name
                    ? activity.name.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
                    : '?';
                  return (
                    <a key={index} href={`/attendance?employee_id=${encodeURIComponent(activity.employeeId)}`} className="flex items-center gap-3 hover:bg-accent rounded-md px-2 py-1 transition-colors" data-testid={`activity-${index}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={activity.imageUrl || ""} alt={activity.name} />
                        <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {activity.message} • {activity.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.detail}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    </a>
                  );
                })}
                {recentActivities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activities.</p>
                )}
                {loadingRecent && (
                  <p className="text-sm text-muted-foreground">Loading recent activities...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
