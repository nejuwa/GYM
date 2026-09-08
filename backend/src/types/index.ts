export const Role = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  TRAINER: 'TRAINER',
  MEMBER: 'MEMBER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const AttendanceStatus = {
  GRANTED: 'GRANTED',
  REJECTED: 'REJECTED',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_MONEY: 'MOBILE_MONEY',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ExpenseCategory = {
  EQUIPMENT: 'EQUIPMENT',
  UTILITIES: 'UTILITIES',
  RENT: 'RENT',
  SALARIES: 'SALARIES',
  MAINTENANCE: 'MAINTENANCE',
  MARKETING: 'MARKETING',
  SUPPLIES: 'SUPPLIES',
  OTHER: 'OTHER',
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const SessionStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const NotificationType = {
  MEMBERSHIP: 'MEMBERSHIP',
  PAYMENT: 'PAYMENT',
  ATTENDANCE: 'ATTENDANCE',
  SYSTEM: 'SYSTEM',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
