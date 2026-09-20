"use client";

import Link from "next/link";
import { BarChart3, Users, CreditCard, UserCheck, Dumbbell, DollarSign, TrendingUp } from "lucide-react";
import { ReportKpis } from "./report-kpis";

export function ReportsHome() {
  const sections = [
    {
      title: "Financial Reports",
      description: "Revenue, expense trends, and net profitability",
      href: "/reports/financial",
      icon: <BarChart3 className="h-5 w-5 text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100",
    },
    {
      title: "Payments Report",
      description: "Payment collections and method breakdown",
      href: "/reports/payments",
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100",
    },
    {
      title: "Expenses Report",
      description: "Outflow totals and category breakdown",
      href: "/reports/expenses",
      icon: <TrendingUp className="h-5 w-5 text-rose-600" />,
      color: "bg-rose-50 border-rose-100",
    },
    {
      title: "Member Analytics",
      description: "Member demographics and registration growth",
      href: "/reports/members",
      icon: <Users className="h-5 w-5 text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
    },
    {
      title: "Membership Analytics",
      description: "Subscription status and package performance",
      href: "/reports/memberships",
      icon: <CreditCard className="h-5 w-5 text-violet-600" />,
      color: "bg-violet-50 border-violet-100",
    },
    {
      title: "Attendance Analytics",
      description: "Check-in volume, peak hours, and success rate",
      href: "/reports/attendance",
      icon: <UserCheck className="h-5 w-5 text-sky-600" />,
      color: "bg-sky-50 border-sky-100",
    },
    {
      title: "Trainer Reports",
      description: "Trainer workload and session completion",
      href: "/reports/trainers",
      icon: <Dumbbell className="h-5 w-5 text-orange-600" />,
      color: "bg-orange-50 border-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports & Analytics Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          Comprehensive business insights and operational metrics
        </p>
      </div>

      <ReportKpis />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="space-y-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${sec.color}`}>
                {sec.icon}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {sec.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{sec.description}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-600">
              <span>View detailed report</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
