export type Role = "OWNER" | "MANAGER" | "TRAINER" | "MEMBER";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  fullName: string;
  status?: AccountStatus;
  phone?: string | null;
  avatarUrl?: string | null;
  memberProfile?: Member | null;
  trainerProfile?: Trainer | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  success: boolean;
  token: string;
  refreshToken: string;
}
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type MembershipStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED" | "PENDING";
export type AttendanceStatus = "GRANTED" | "REJECTED";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_MONEY";
export type PaymentStatus = "COMPLETED" | "PENDING" | "REFUNDED";
export type ExpenseCategory = "EQUIPMENT" | "UTILITIES" | "RENT" | "SALARIES" | "MAINTENANCE" | "MARKETING" | "SUPPLIES" | "OTHER";
export type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type NotificationType = "MEMBERSHIP" | "PAYMENT" | "ATTENDANCE" | "SYSTEM" | "ANNOUNCEMENT";

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  phone?: string | null;
  avatarUrl?: string | null;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  memberProfile?: Member | null;
  trainerProfile?: Trainer | null;
}

export interface Member {
  id: string;
  userId?: string | null;
  memberCode: string;
  fullName: string;
  gender: string;
  dateOfBirth?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  photo?: string | null;
  emergencyContact?: string | null;
  qrCodeData?: string | null;
  qrCode?: string | null;
  registrationDate?: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  user?: User | null;
  memberships?: Membership[];
  attendances?: Attendance[];
  payments?: Payment[];
  trainers?: TrainerAssignment[];
  sessions?: TrainingSession[];
  latestMembership?: Membership | null;
  latestTrainerAssignment?: TrainerAssignment | null;
  _count?: { attendances?: number; payments?: number };
}

export interface Package {
  id: string;
  name: string;
  description?: string | null;
  durationDays: number;
  price: number;
  features?: string | string[] | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  memberships?: Membership[];
  _count?: { memberships?: number };
}

export interface Membership {
  id: string;
  memberId: string;
  packageId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  pricePaid: number;
  autoRenew: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  member?: Member;
  package?: Package;
  payments?: Payment[];
}

export interface Attendance {
  id: string;
  memberId: string;
  date: string;
  entryTime: string;
  exitTime?: string | null;
  status: AttendanceStatus;
  rejectionReason?: string | null;
  accessMethod: string;
  verifiedBy?: string | null;
  createdAt: string;
  member?: Member;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  memberId: string;
  membershipId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  notes?: string | null;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
  member?: Member;
  membership?: Membership;
  recordedBy?: { id: string; fullName: string; username: string } | null;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  vendor?: string | null;
  notes?: string | null;
  receiptAttachment?: string | null;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
  recordedBy?: { id: string; fullName: string; username: string } | null;
}

export interface Trainer {
  id: string;
  userId?: string | null;
  fullName: string;
  specialization: string;
  phone: string;
  email: string;
  bio?: string | null;
  photo?: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  user?: User | null;
  assignedMembers?: TrainerAssignment[];
  sessions?: TrainingSession[];
  _count?: { sessions?: number };
}

export interface TrainerAssignment {
  id: string;
  trainerId: string;
  memberId: string;
  assignedDate: string;
  status: AccountStatus;
  trainer?: Trainer;
  member?: Member;
}

export interface TrainingSession {
  id: string;
  trainerId: string;
  memberId: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  trainer?: Trainer;
  member?: Member;
}

export interface Notification {
  id: string;
  recipientId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  role?: string | null;
  action: string;
  module: string;
  details?: string | null;
  ipAddress?: string | null;
  result: string;
  createdAt: string;
  user?: { id: string; username: string; email: string } | null;
}

export interface OwnerManagerDashboard {
  role: "OWNER" | "MANAGER";
  kpis: {
    totalMembers: number;
    activeMembers: number;
    activeMemberships: number;
    expiringSoon: number;
    todayAttendance: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    netProfit: number;
    totalTrainers: number;
  };
  recentAttendance: Attendance[];
  recentPayments: Payment[];
  monthTrends: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  packageStats: Array<{ name: string; count: number }>;
}

export interface TrainerDashboard {
  role: "TRAINER";
  trainer: Trainer;
  kpis: { assignedMembersCount: number; todaySessionsCount: number; totalUpcomingSessions: number };
  todaySessions: TrainingSession[];
  upcomingSessions: TrainingSession[];
  assignedMembers: TrainerAssignment[];
}

export interface MemberDashboard {
  role: "MEMBER";
  member: Member;
  activeMembership?: Membership | null;
  kpis: { totalMembers: number; monthlyVisits: number; membershipStatus: string; daysRemaining: number };
  attendances: Attendance[];
  payments: Payment[];
  sessions: TrainingSession[];
}

export type DashboardResponseData = OwnerManagerDashboard | TrainerDashboard | MemberDashboard;

export interface FinancialReportResponse {
  summary: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number; transactionsCount: number; expensesCount: number };
  monthlySummary: Array<{ month: string; revenue: number; expenses: number; netProfit: number }>;
  expensesByCategory: Array<{ category: ExpenseCategory; _sum: { amount: number }; _count: { id: number } }>;
  paymentsByMethod: Array<{ paymentMethod: PaymentMethod; _sum: { amount: number }; _count: { id: number } }>;
}

export interface MemberReportResponse {
  summary: { totalMembers: number; activeMembers: number; suspendedMembers: number };
  genderStats: Array<{ gender: string; _count: number }>;
  registrationTrends: Array<{ month: string; newMembers: number }>;
}

export interface MembershipReportResponse {
  summary: { totalMemberships: number; active: number; expired: number; cancelled: number };
  packagePerformance: Array<{ packageName: string; durationDays: number; totalSold: number; totalRevenue: number }>;
}

export interface PaymentReportResponse {
  summary: { totalAmount: number; paymentCount: number };
  byMethod: Record<string, { count: number; amount: number }>;
  payments: Array<{ id: string; amount: number; paymentMethod: string; paymentDate: string }>;
}

export interface ExpenseReportResponse {
  summary: { totalAmount: number; expenseCount: number };
  byCategory: Record<string, { count: number; amount: number }>;
  expenses: Array<{ id: string; title: string; category: string; amount: number; expenseDate: string }>;
}

export interface AttendanceReportResponse {
  summary: { totalVisits: number; granted: number; rejected: number; successRate: number | string; peakHour: string | null; weekdayVisits: number; weekendVisits: number };
  dailyTrends: Array<{ date: string; granted: number; rejected: number; total: number }>;
  hourlyDistribution: Array<{ hour: number; label: string; visits: number }>;
}

export interface TrainerReportResponse {
  summary: { totalTrainers: number; activeTrainers: number; totalAssignments: number; totalSessions: number; sessionsThisMonth: number };
  workload: Array<{
    trainerId: string; trainerName: string; specialization: string; status: string;
    assignedMembers: number; totalSessions: number; completed: number; scheduled: number;
    cancelled: number; sessionsThisMonth: number; completionRate: number;
  }>;
}