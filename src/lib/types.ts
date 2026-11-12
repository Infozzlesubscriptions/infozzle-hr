export type Role = 'MD' | 'HR'
export type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'inactive' | 'completed' | string

export interface User { id: string; name: string; email: string; role: Role; avatarUrl?: string }
export interface Department { id: string; name: string }
export interface Employee {
  id: string; employeeId?: string; firstName: string; lastName: string; email: string; personalEmail?: string; phone?: string; address?: string; dateOfBirth?: string; profilePhotoUrl?: string | null;
  department?: Department | string; designation?: string; joiningDate?: string; status: Status; manager?: Pick<Employee, 'id' | 'firstName' | 'lastName'>
}
export interface LeaveRequest {
  id: string; employee: Employee; type: string; startDate: string; endDate: string; days: number; reason: string; status: Status; createdAt?: string; reviewerComment?: string
}
export interface WfhRequest {
  id: string; employee: Employee; date: string; endDate?: string; days?: number; reason: string; status: Status; createdAt?: string
}
export interface CalendarEvent { id: string; title: string; start: string; end?: string; allDay?: boolean; type?: string; description?: string; color?: string }
export interface OnboardingRecord { id: string; employee: Employee; startDate: string; progress: number; status: Status; tasks: OnboardingTask[] }
export interface OnboardingTask { id: string; title: string; dueDate?: string; completed: boolean; assignee?: string }
export interface Notification { id: string; title: string; message: string; read: boolean; createdAt: string; link?: string }
export interface AuditLog { id: string; actor?: User; action: string; entity: string; entityId?: string; createdAt: string; metadata?: Record<string, unknown> }
export interface Paginated<T> { results: T[]; count: number; next?: string | null; previous?: string | null }
export interface DashboardData {
  metrics: { key: string; label: string; value: number; change?: number }[];
  headcountTrend: { label: string; value: number }[];
  leaveByDepartment: { department: string; value: number }[];
  upcoming: CalendarEvent[];
}
export interface LeaveBalance { type: string; allocated: number; used: number; remaining: number }
export interface WfhUsage { used: number; limit: number; period: string }

export const getList = <T>(data: Paginated<T> | T[]) => Array.isArray(data) ? data : data.results
export const employeeName = (employee?: Employee) => employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown employee'
