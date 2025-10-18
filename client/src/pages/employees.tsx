import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmployeeTable } from "@/components/employees/employee-table";
import { EmployeeModal } from "@/components/employees/employee-modal";
import { EmployeeDetailModal } from "@/components/employees/employee-detail-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmployees } from "@/hooks/use-employees";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Download } from "lucide-react";
import type { Employee } from "@shared/schema";
import { getEmployees as fetchEmployees } from "@/lib/employees";

export default function Employees() {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { 
    employees, 
    isLoading, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee,
    isDeleting,
    isCreating,
    isUpdating,
    createError,
    updateError
  } = useEmployees();
  const { toast } = useToast();

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    deleteEmployee(employeeToDelete.employee_id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setEmployeeToDelete(null);
        toast({ title: "Deleted", description: `${employeeToDelete.first_name} ${employeeToDelete.last_name} has been removed.` });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message || "Failed to delete employee", variant: "destructive" });
      }
    });
  };

  const handleSubmitEmployee = (employeeData: any) => {
    if (editingEmployee) {
      updateEmployee({ id: editingEmployee.employee_id, data: employeeData }, {
        onSuccess: () => {
          setShowModal(false);
          toast({
            title: "Success",
            description: "Employee updated successfully!",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to update employee",
            variant: "destructive",
          });
        }
      });
    } else {
      createEmployee(employeeData, {
        onSuccess: () => {
          setShowModal(false);
          toast({
            title: "Success",
            description: "Employee added successfully!",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to create employee",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleEditFromDetail = (employee: Employee) => {
    setShowDetailModal(false);
    handleEditEmployee(employee);
  };

  const toCsvValue = (val: unknown) => {
    const s = val === null || val === undefined ? "" : String(val);
    // Escape quotes by doubling them, wrap in quotes
    return `"${s.replace(/"/g, '""')}"`;
  };

  const handleDownloadEmployeesCsv = async () => {
    try {
      setIsExporting(true);
      // Fetch all employees in pages of 100 (API maximum)
      const pageSize = 100;
      let page = 1;
      let all: Employee[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await fetchEmployees(page, pageSize);
        all = all.concat(batch);
        if (batch.length < pageSize) break; // last page
        page += 1;
      }
      const headers = [
        "employee_id",
        "employee_code",
        "first_name",
        "last_name",
        "email",
        "phone",
        "department",
        "position",
        "status",
        "registration_status",
        "hire_date",
        "salary"
      ];
      const rows = all.map(e => [
        e.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.department,
        e.position,
        e.status,
        e.registration_status,
        e.hire_date,
        typeof e.salary === 'number' ? e.salary : ''
      ]);
      const csv = [headers, ...rows].map(r => r.map(toCsvValue).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'CSV ready', description: `Exported ${rows.length} employees.` });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err?.message || 'Could not generate CSV', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
            <p className="text-muted-foreground mt-2">Manage your company's workforce</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadEmployeesCsv} disabled={isExporting}>
              {isExporting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Download CSV</>
              )}
            </Button>
            <Button onClick={handleAddEmployee} data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Employee Table */}
        <EmployeeTable
          employees={employees}
          onView={handleViewEmployee}
          onEdit={handleEditEmployee}
          onDelete={handleDeleteEmployee}
          isLoading={isLoading}
        />

        {/* Employee Modal */}
        <EmployeeModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitEmployee}
          employee={editingEmployee}
          isLoading={isCreating || isUpdating}
        />

        {/* Employee Detail Modal */}
        <EmployeeDetailModal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onEdit={handleEditFromDetail}
          employee={selectedEmployee}
        />

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete
                {" "}
                <span className="font-medium text-foreground">
                  {employeeToDelete ? `${employeeToDelete.first_name} ${employeeToDelete.last_name}` : "this employee"}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete} data-testid="button-confirm-delete" disabled={isDeleting}>
                  {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
