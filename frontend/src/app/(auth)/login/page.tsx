import type { Metadata } from "next";
import { BarChart3, CreditCard, Dumbbell, ShieldCheck, Users } from "lucide-react";
import { LoginForm } from "@/components/shared/login-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Sign In | GYMMIS",
};

const features = [
  {
    title: "Members Management",
    icon: Users,
  },
  {
    title: "Trainers & Training",
    icon: Dumbbell,
  },
  {
    title: "Payment Management",
    icon: CreditCard,
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
  },
];

export default function LoginPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="relative hidden h-screen w-1/2 overflow-hidden bg-[#080808] text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.88)_0%,rgba(0,0,0,.62)_72%,rgba(0,0,0,.15)_100%)]" />
        <div className="absolute inset-y-0 right-[-1px] w-[22%] bg-white [clip-path:polygon(100%_0,100%_100%,0_100%)]" />

        <div className="relative z-10 flex w-full flex-col items-center px-10 pb-12 pt-[18vh]">
          <Logo size="lg" variant="light" showTagline className="scale-[1.35]" />
          <div className="mt-12 text-center">
            <h1 className="text-[30px] font-bold leading-tight">
              Manage your Gym. <span className="text-[#ed1118]">Grow your business.</span>
            </h1>
            <div className="mx-auto mt-2 h-[2px] w-[285px] bg-[#ed1118]" />
            <p className="mx-auto mt-3 max-w-[350px] text-[12px] leading-4 text-slate-300">
              Manage members, memberships, attendance, payments and more - all in one system.
            </p>
          </div>

          <div className="mt-auto grid w-[355px] grid-cols-4 overflow-hidden rounded-lg border border-white/20 bg-black/40 backdrop-blur-sm">
            {features.map(({ title, icon: Icon }) => (
              <div key={title} className="flex min-h-[78px] flex-col items-center justify-center gap-2 border-r border-white/15 px-2 text-center last:border-r-0">
                <Icon className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span className="text-[10px] leading-3 text-slate-200">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-white px-5 py-10 sm:px-10">
        <div className="mb-8 lg:hidden">
          <Logo size="md" variant="dark" showTagline />
        </div>
        <LoginForm />
        <div className="mt-11 flex items-center gap-1 text-[10px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.5} />
          <span>© {new Date().getFullYear()} <span className="font-semibold text-[#ed1118]">GYMMIS</span>. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}