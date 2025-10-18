import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Employee } from "@shared/schema";

interface EmployeeTableProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  isLoading?: boolean;
}

export function EmployeeTable({ employees, onView, onEdit, onDelete, isLoading }: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique departments for filter
  const departments = Array.from(new Set(employees.map(emp => emp.department)));

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.first_name} ${employee.last_name}`;
    const matchesSearch = !search || 
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      employee.email.toLowerCase().includes(search.toLowerCase()) ||
      employee.position.toLowerCase().includes(search.toLowerCase());
    
    const matchesDepartment = !departmentFilter || departmentFilter === "all" || employee.department === departmentFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredEmployees.length);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full lg:w-48" data-testid="select-department">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-32" data-testid="select-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted border-b border-border">
              <TableHead className="font-medium text-foreground">Employee</TableHead>
              <TableHead className="font-medium text-foreground">ID</TableHead>
              <TableHead className="font-medium text-foreground">Department</TableHead>
              <TableHead className="font-medium text-foreground">Position</TableHead>
              <TableHead className="font-medium text-foreground">QR</TableHead>
              <TableHead className="font-medium text-foreground">Status</TableHead>
              <TableHead className="text-center font-medium text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-48"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse w-16"></div></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded animate-pulse w-24"></div></TableCell>
                </TableRow>
              ))
            ) : paginatedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No employees found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((employee) => (
                <TableRow key={employee.employee_id} className="hover:bg-accent transition-colors" data-testid={`row-employee-${employee.employee_id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={employee.image_url || ""} alt={`${employee.first_name} ${employee.last_name}`} />
                        <AvatarFallback className="bg-muted">
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground" data-testid={`text-name-${employee.employee_id}`}>
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-email-${employee.employee_id}`}>
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground" data-testid={`text-id-${employee.employee_id}`}>
                    {employee.employee_code}
                  </TableCell>
                  <TableCell className="text-foreground" data-testid={`text-department-${employee.employee_id}`}>
                    {employee.department}
                  </TableCell>
                  <TableCell className="text-foreground" data-testid={`text-position-${employee.employee_id}`}>
                    {employee.position}
                  </TableCell>
                  <TableCell>
                    {employee.qr_code || employee.qr_code_image || employee.registration_status === 'fully_registered' ? (
                      <Badge variant="default">Generated</Badge>
                    ) : (
                      <Badge variant="secondary">Not generated</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={employee.status === 'active' ? 'default' : 'secondary'}
                      data-testid={`badge-status-${employee.employee_id}`}
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(employee)}
                        data-testid={`button-view-${employee.employee_id}`}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(employee)}
                        data-testid={`button-edit-${employee.employee_id}`}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(employee)}
                        data-testid={`button-delete-${employee.employee_id}`}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredEmployees.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredEmployees.length > 0 ? startIndex + 1 : 0} to {endIndex} of {filteredEmployees.length} employees
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
