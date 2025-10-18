import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEmployees } from "@/hooks/use-employees";
import { sendPayout, getPayoutEnvInfo, type PayoutMedium } from "@/lib/payments";
import { Download, Upload, Wallet, FileSpreadsheet, Shield, Coins, Eye, FileDown } from "lucide-react";
import { getAllSalaries, getEmployeeSalary, type SalariesListResponse, type EmployeeSalaryResponse } from "@/lib/salaries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import { downloadBrandedCsv } from "@/lib/downloads";

export default function PaymentsPage() {
  const { toast } = useToast();
  const { employees, isLoading } = useEmployees();

  // Manual payout state
  const [employeeId, setEmployeeId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("XAF");
  const [medium, setMedium] = useState<PayoutMedium>("mobile money");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState<string>("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  // Manual: salary lookup state (reuses salMonth/salYear filters)
  const [manualSalary, setManualSalary] = useState<EmployeeSalaryResponse | null>(null);
  const [loadingManualSalary, setLoadingManualSalary] = useState(false);

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvDefaultMedium, setCsvDefaultMedium] = useState<PayoutMedium>("mobile money");
  const [csvInProgress, setCsvInProgress] = useState<{ total: number; done: number; success: number; failed: number } | null>(null);

  // Salaries state
  const [salMonth, setSalMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [salYear, setSalYear] = useState<number | undefined>(new Date().getFullYear());
  const [salDept, setSalDept] = useState<string>("");
  const [salPage, setSalPage] = useState(1);
  const [salLimit, setSalLimit] = useState(20);
  const [salariesResp, setSalariesResp] = useState<SalariesListResponse | null>(null);
  const [loadingSalaries, setLoadingSalaries] = useState(false);

  // Breakdown modal state
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownEmpId, setBreakdownEmpId] = useState<string | null>(null);
  const [breakdownResp, setBreakdownResp] = useState<EmployeeSalaryResponse | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const loadSalaries = async () => {
    try {
      setLoadingSalaries(true);
      const data = await getAllSalaries({ page: salPage, limit: salLimit, month: salMonth, year: salYear, department: salDept || undefined });
      setSalariesResp(data);
    } catch (e: any) {
      toast({ title: "Failed to load salaries", description: e?.message || "", variant: "destructive" });
    } finally {
      setLoadingSalaries(false);
    }
  };

  // When switching employee, clear previous salary/amount and immediately fetch new salary
  useEffect(() => {
    if (!employeeId) return;
    setManualSalary(null);
    setAmount("");
    // fetch immediately for snappy UX
    fetchManualSalary();
  }, [employeeId]);

  // Auto-fetch salary when month/year changes (debounced). Employee change handled above immediately.
  useEffect(() => {
    if (!employeeId) return;
    const timer = setTimeout(async () => {
      try {
        setLoadingManualSalary(true);
        const resp = await getEmployeeSalary(employeeId, { month: salMonth, year: salYear });
        setManualSalary(resp);
        const calc = resp?.salary_breakdown?.calculated_salary ?? resp?.salary_info?.calculated_salary ?? null;
        if ((amount ?? "") === "" && calc != null && !Number.isNaN(calc)) {
          setAmount(String(calc));
        }
      } catch (e: any) {
        // Silent for auto-fetch; manual button shows toast
      } finally {
        setLoadingManualSalary(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [salMonth, salYear, employeeId]);

  useEffect(() => {
    loadSalaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salPage, salLimit, salMonth, salYear, salDept]);

  const fetchManualSalary = async () => {
    if (!employeeId) return;
    try {
      setLoadingManualSalary(true);
      const resp = await getEmployeeSalary(employeeId, { month: salMonth, year: salYear });
      setManualSalary(resp);
      const calc = resp?.salary_breakdown?.calculated_salary ?? resp?.salary_info?.calculated_salary ?? null;
      if (calc != null && !Number.isNaN(calc)) {
        setAmount(String(calc));
      }
    } catch (e: any) {
      toast({ title: "Salary lookup failed", description: e?.message || "", variant: "destructive" });
    } finally {
      setLoadingManualSalary(false);
    }
  };

  const openBreakdown = async (employeeId: string) => {
    setBreakdownEmpId(employeeId);
    setBreakdownOpen(true);
    await loadBreakdown(employeeId);
  };

  const loadBreakdown = async (employeeId?: string) => {
    const id = employeeId || breakdownEmpId;
    if (!id) return;
    try {
      setLoadingBreakdown(true);
      const resp = await getEmployeeSalary(id, { month: salMonth, year: salYear });
      setBreakdownResp(resp);
    } catch (e: any) {
      toast({ title: "Failed to load breakdown", description: e?.message || "", variant: "destructive" });
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setLoadingSalaries(true);
      const allRows: any[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const data = await getAllSalaries({ page, limit: salLimit, month: salMonth, year: salYear, department: salDept || undefined });
        totalPages = data.pagination.total_pages;
        allRows.push(...data.salaries);
        page++;
      } while (page <= totalPages);
      const header = [
        "employee_id","employee_name","employee_code","department","position","base_salary","monthly_hours_worked","expected_hours","hourly_rate","calculated_salary","month","year"
      ];
      const rows = allRows.map(s => [
        s.employee_id,
        s.employee_name ?? "",
        s.employee_code ?? "",
        s.department ?? "",
        s.position ?? "",
        s.base_salary ?? "",
        s.monthly_hours_worked ?? "",
        s.expected_hours ?? "",
        s.hourly_rate ?? "",
        s.calculated_salary ?? "",
        s.month ?? "",
        s.year ?? "",
      ]);
      const base = `salaries_${salYear || "yyyy"}_${salMonth || "mm"}`;
      downloadBrandedCsv(header, rows, base);
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message || "", variant: "destructive" });
    } finally {
      setLoadingSalaries(false);
    }
  };

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
    [employees]
  );

  useEffect(() => {
    if (!employeeId && sortedEmployees.length > 0) {
      setEmployeeId(sortedEmployees[0].employee_id);
    }
  }, [sortedEmployees, employeeId]);

  const handleManualPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !amount) {
      toast({ title: "Missing fields", description: "Select an employee and enter an amount.", variant: "destructive" });
      return;
    }
    const emp = sortedEmployees.find(e => e.employee_id === employeeId);
    if (!emp) {
      toast({ title: "Employee not found", description: "Please select a valid employee.", variant: "destructive" });
      return;
    }
    const externalId = `pay_${Date.now()}_${emp.employee_id}`;
    const name = `${emp.first_name} ${emp.last_name}`;
    setIsSubmittingManual(true);
    sendPayout({
      amount: Number(amount),
      phone: emp.phone,
      medium,
      name,
      email: emp.email,
      userId: emp.employee_id,
      externalId,
      message: note || `Payout on ${date}`,
    })
      .then((resp) => {
        toast({ title: resp.status || "Payout sent", description: resp.message || `${currency} ${Number(amount).toLocaleString()} to ${name}` });
        setAmount("");
        setNote("");
      })
      .catch((err: any) => {
        toast({ title: "Payout failed", description: err?.message || "Could not send payout", variant: "destructive" });
      })
      .finally(() => setIsSubmittingManual(false));
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
    setCsvPreview([]);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const rows = text.trim().split(/\r?\n/).map(line => line.split(",").map(c => c.trim()));
        setCsvPreview(rows.slice(0, 6)); // preview first 6 rows incl header
      };
      reader.readAsText(file);
    }
  };

  const handleCsvTemplate = () => {
    const header = ["employee_id", "amount", "currency", "date", "note"]; // YYYY-MM-DD
    const example = [
      ["emp_XXXX", "100000", "XAF", new Date().toISOString().slice(0, 10), "September salary"],
    ];
    const csv = [header, ...example].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payments_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = () => {
    if (!csvFile) {
      toast({ title: "No file selected", description: "Choose a CSV file to upload.", variant: "destructive" });
      return;
    }
    const rows = csvPreview.slice(1); // skip header
    if (rows.length === 0) {
      toast({ title: "Empty CSV", description: "No data rows found.", variant: "destructive" });
      return;
    }
    const mapById = new Map(sortedEmployees.map(e => [e.employee_id, e]));
    let done = 0, success = 0, failed = 0;
    setCsvInProgress({ total: rows.length, done, success, failed });
    const processNext = async (index: number) => {
      if (index >= rows.length) {
        toast({ title: "CSV processed", description: `Success: ${success}, Failed: ${failed}` });
        setCsvInProgress(null);
        setCsvFile(null);
        setCsvPreview([]);
        return;
      }
      const [empId, amtStr, cur, d, noteStr] = rows[index];
      const emp = empId ? mapById.get(empId) : undefined;
      if (!emp) {
        failed++; done++;
        setCsvInProgress({ total: rows.length, done, success, failed });
        return processNext(index + 1);
      }
      const name = `${emp.first_name} ${emp.last_name}`;
      const externalId = `pay_${Date.now()}_${emp.employee_id}_${index}`;
      try {
        await sendPayout({
          amount: Number(amtStr),
          phone: emp.phone,
          medium: csvDefaultMedium,
          name,
          email: emp.email,
          userId: emp.employee_id,
          externalId,
          message: noteStr || `Payout on ${d || date}`,
        });
        success++; done++;
      } catch (e: any) {
        failed++; done++;
      }
      setCsvInProgress({ total: rows.length, done, success, failed });
      processNext(index + 1);
    };
    processNext(0);
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground mt-2">Create payouts to employees manually or via CSV upload.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCsvTemplate}>
              <Download className="w-4 h-4" /> Download CSV Template
            </Button>
          </div>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList>
            <TabsTrigger value="manual" className="gap-2">
              <Wallet className="w-4 h-4" /> Manual Payout
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> CSV Upload
            </TabsTrigger>
            <TabsTrigger value="salaries" className="gap-2">
              <Coins className="w-4 h-4" /> Salaries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Manual Payout</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Month/Year for salary lookup (reuses Salaries filters) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label>Month</Label>
                    <Select value={String(salMonth || "")} onValueChange={(v)=> setSalMonth(v? Number(v) : undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length:12}, (_,i)=> i+1).map(m => (
                          <SelectItem key={m} value={String(m)}>{new Date(2000, m-1, 1).toLocaleString(undefined, { month: 'long' })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={String(salYear || "")} onValueChange={(v)=> setSalYear(v? Number(v) : undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 6}, (_,i)=> new Date().getFullYear() - i).map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={fetchManualSalary} disabled={!employeeId || loadingManualSalary} className="w-full">
                      {loadingManualSalary ? 'Fetching…' : 'Get Calculated Salary'}
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleManualPayout} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Employee</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId} disabled={isLoading || sortedEmployees.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select employee"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedEmployees.map((e) => (
                          <SelectItem key={e.employee_id} value={e.employee_id}>
                            {e.first_name} {e.last_name} ({e.employee_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-16"
                      />
                    </div>
                    {manualSalary && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Calculated for {manualSalary.salary_info.month} {manualSalary.salary_info.year}: 
                        <span className="font-medium"> {currency} {Number(manualSalary.salary_info.calculated_salary ?? manualSalary.salary_breakdown?.calculated_salary ?? 0).toLocaleString()}</span>
                        {manualSalary.salary_info.monthly_hours_worked != null && (
                          <span> • Hours: {manualSalary.salary_info.monthly_hours_worked.toFixed(2)}</span>
                        )}
                        <Button type="button" variant="link" className="px-2" onClick={() => {
                          const calc = manualSalary?.salary_breakdown?.calculated_salary ?? manualSalary?.salary_info?.calculated_salary ?? null;
                          if (calc != null) setAmount(String(calc));
                        }}>Use this</Button>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Medium</Label>
                    <Select value={medium} onValueChange={(v) => setMedium(v as PayoutMedium)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medium" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile money">Mobile Money</SelectItem>
                        <SelectItem value="orange money">Orange Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XAF">XAF</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Note</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for this payout" />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" className="gap-2" disabled={isSubmittingManual}>
                      {isSubmittingManual ? "Sending..." : "Create Payout"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>CSV Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <input
                    id="payments-csv"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvChange}
                  />
                  <Label htmlFor="payments-csv">
                    <Button variant="outline" type="button" className="gap-2">
                      <Upload className="w-4 h-4" /> Choose CSV
                    </Button>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label>Default Medium</Label>
                    <Select value={csvDefaultMedium} onValueChange={(v) => setCsvDefaultMedium(v as PayoutMedium)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Medium" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile money">Mobile Money</SelectItem>
                        <SelectItem value="orange money">Orange Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCsvUpload} disabled={!csvFile} className="gap-2">
                    Upload & Queue
                  </Button>
                </div>
                {csvFile && (
                  <p className="text-xs text-muted-foreground">Selected: {csvFile.name}</p>
                )}
                {csvInProgress && (
                  <div className="text-sm text-muted-foreground">
                    Processing {csvInProgress.done}/{csvInProgress.total} • Success: {csvInProgress.success} • Failed: {csvInProgress.failed}
                    <div className="w-full h-2 bg-muted rounded mt-2 overflow-hidden">
                      <div className="h-2 bg-primary" style={{ width: `${(csvInProgress.done / csvInProgress.total) * 100}%` }}></div>
                    </div>
                  </div>
                )}
                {csvPreview.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          {csvPreview[0].map((h, i) => (
                            <th key={i} className="text-left p-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(1).map((row, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            {row.map((cell, ci) => (
                              <td key={ci} className="p-3">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.length === 1 && (
                      <p className="text-xs text-muted-foreground mt-2">No data rows found in the CSV.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Salaries Tab */}
          <TabsContent value="salaries">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Monthly Salaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Month</Label>
                    <Select value={String(salMonth || "")} onValueChange={(v)=> setSalMonth(v? Number(v) : undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length:12}, (_,i)=> i+1).map(m => (
                          <SelectItem key={m} value={String(m)}>{new Date(2000, m-1, 1).toLocaleString(undefined, { month: 'long' })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={String(salYear || "")} onValueChange={(v)=> setSalYear(v? Number(v) : undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 6}, (_,i)=> new Date().getFullYear() - i).map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input placeholder="e.g. Engineering" value={salDept} onChange={(e)=> setSalDept(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button variant="outline" onClick={() => { setSalPage(1); loadSalaries(); }} disabled={loadingSalaries} className="w-full">{loadingSalaries ? 'Loading…' : 'Refresh'}</Button>
                    <Button variant="outline" type="button" onClick={handleExportCsv} disabled={loadingSalaries} className="whitespace-nowrap"><FileDown className="w-4 h-4 mr-2"/>Export CSV</Button>
                  </div>
                </div>

                {salariesResp?.month_summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-3 bg-muted rounded">Month: <span className="font-medium">{salariesResp.month_summary.month} {salariesResp.month_summary.year}</span></div>
                    <div className="p-3 bg-muted rounded">Employees: <span className="font-medium">{salariesResp.month_summary.total_employees}</span></div>
                    <div className="p-3 bg-muted rounded">Total Budget: <span className="font-medium">XAF {salariesResp.month_summary.total_salary_budget.toLocaleString()}</span></div>
                    <div className="p-3 bg-muted rounded">Total Hours: <span className="font-medium">{salariesResp.month_summary.total_hours_worked.toFixed(2)}</span></div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Employee</th>
                        <th className="text-left p-3">Department</th>
                        <th className="text-right p-3">Base</th>
                        <th className="text-right p-3">Hours</th>
                        <th className="text-right p-3">Hourly</th>
                        <th className="text-right p-3">Calculated</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(salariesResp?.salaries || []).map((s, idx) => (
                        <tr key={`${s.employee_id}-${idx}`} className="border-b last:border-b-0">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={s.image_url || ''} alt={s.employee_name} className="object-cover" />
                                <AvatarFallback>{(s.employee_name||'').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium" title={`${s.employee_name} (${s.employee_code})`}>
                                  <Link href={`/attendance?employee_id=${s.employee_id}`} className="hover:underline">
                                    {s.employee_name}
                                  </Link>
                                </div>
                                <div className="text-xs text-muted-foreground">{s.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-foreground">{s.department || '-'}</div>
                            <div className="text-xs text-muted-foreground">{s.position || '-'}</div>
                          </td>
                          <td className="p-3 text-right">{s.base_salary != null ? `XAF ${s.base_salary.toLocaleString()}` : '-'}</td>
                          <td className="p-3 text-right">{s.monthly_hours_worked != null ? s.monthly_hours_worked.toFixed(2) : '-'}</td>
                          <td className="p-3 text-right">{s.hourly_rate != null ? `XAF ${s.hourly_rate.toLocaleString()}` : '-'}</td>
                          <td className="p-3 text-right font-medium">{s.calculated_salary != null ? `XAF ${s.calculated_salary.toLocaleString()}` : '-'}</td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openBreakdown(s.employee_id)}>
                              <Eye className="w-4 h-4"/> View breakdown
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {(!salariesResp || salariesResp.salaries.length === 0) && (
                        <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{loadingSalaries ? 'Loading salaries…' : 'No salary data found'}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {salariesResp?.pagination && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>Page {salariesResp.pagination.current_page} of {salariesResp.pagination.total_pages}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" disabled={!salariesResp.pagination.has_previous || loadingSalaries} onClick={()=> setSalPage(p => Math.max(1, p-1))}>Previous</Button>
                      <Button variant="outline" disabled={!salariesResp.pagination.has_next || loadingSalaries} onClick={()=> setSalPage(p => p+1)}>Next</Button>
                      <Select value={String(salLimit)} onValueChange={(v)=> { setSalLimit(Number(v)); setSalPage(1); }}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[10,20,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Breakdown Modal */}
        <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Salary Breakdown</DialogTitle>
              <DialogDescription>
                {breakdownResp?.salary_info ? (
                  <span>
                    {breakdownResp.salary_info.employee_name} ({breakdownResp.salary_info.employee_code})
                  </span>
                ) : (
                  <span>Details</span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Controls synced with Salaries filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <Label>Month</Label>
                <Select value={String(salMonth || "")} onValueChange={(v)=> { setSalMonth(v? Number(v) : undefined); loadBreakdown(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length:12}, (_,i)=> i+1).map(m => (
                      <SelectItem key={m} value={String(m)}>{new Date(2000, m-1, 1).toLocaleString(undefined, { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={String(salYear || "")} onValueChange={(v)=> { setSalYear(v? Number(v) : undefined); loadBreakdown(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 6}, (_,i)=> new Date().getFullYear() - i).map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => loadBreakdown()} disabled={loadingBreakdown} className="w-full">{loadingBreakdown ? 'Loading…' : 'Refresh'}</Button>
              </div>
            </div>

            {/* Content */}
            {loadingBreakdown && (
              <div className="py-8 text-center text-muted-foreground">Loading breakdown…</div>
            )}
            {!loadingBreakdown && breakdownResp && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Salary Info</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>Base: <span className="font-medium">{breakdownResp.salary_info.base_salary != null ? `XAF ${breakdownResp.salary_info.base_salary.toLocaleString()}` : '-'}</span></div>
                    <div>Hourly: <span className="font-medium">{breakdownResp.salary_info.hourly_rate != null ? `XAF ${breakdownResp.salary_info.hourly_rate.toLocaleString()}` : '-'}</span></div>
                    <div>Hours Worked: <span className="font-medium">{breakdownResp.salary_info.monthly_hours_worked != null ? breakdownResp.salary_info.monthly_hours_worked.toFixed(2) : '-'}</span></div>
                    <div>Expected Hours: <span className="font-medium">{breakdownResp.salary_info.expected_hours ?? '-'}</span></div>
                    <div>Calculated: <span className="font-medium">{breakdownResp.salary_info.calculated_salary != null ? `XAF ${breakdownResp.salary_info.calculated_salary.toLocaleString()}` : '-'}</span></div>
                    <div>Month: <span className="font-medium">{breakdownResp.salary_info.month} {breakdownResp.salary_info.year}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Attendance Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>Days Worked: <span className="font-medium">{breakdownResp.attendance_details.days_worked}</span></div>
                    <div>Days Present: <span className="font-medium">{breakdownResp.attendance_details.days_present}</span></div>
                    <div>Total Records: <span className="font-medium">{breakdownResp.attendance_details.total_attendance_records}</span></div>
                    <div>Attendance %: <span className="font-medium">{breakdownResp.attendance_details.attendance_percentage}%</span></div>
                    <div>Hours Efficiency: <span className="font-medium">{breakdownResp.attendance_details.hours_efficiency}%</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Salary Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>Base Monthly: <span className="font-medium">{breakdownResp.salary_breakdown.base_monthly_salary != null ? `XAF ${breakdownResp.salary_breakdown.base_monthly_salary.toLocaleString()}` : '-'}</span></div>
                    <div>Hourly Rate: <span className="font-medium">{breakdownResp.salary_breakdown.hourly_rate != null ? `XAF ${breakdownResp.salary_breakdown.hourly_rate.toLocaleString()}` : '-'}</span></div>
                    <div>Hours Worked: <span className="font-medium">{breakdownResp.salary_breakdown.hours_worked != null ? breakdownResp.salary_breakdown.hours_worked.toFixed(2) : '-'}</span></div>
                    <div>Expected Hours: <span className="font-medium">{breakdownResp.salary_breakdown.expected_hours ?? '-'}</span></div>
                    <div>Calculated: <span className="font-medium">{breakdownResp.salary_breakdown.calculated_salary != null ? `XAF ${breakdownResp.salary_breakdown.calculated_salary.toLocaleString()}` : '-'}</span></div>
                    <div>Salary Difference: <span className="font-medium">{breakdownResp.salary_breakdown.salary_difference != null ? `XAF ${breakdownResp.salary_breakdown.salary_difference.toLocaleString()}` : '-'}</span></div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
