import { MembershipsList } from "@/components/shared/memberships-list";

export const metadata = { title: "Membership | GYMMIS" };

export default function MembershipsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Membership</h1>
        <p className="mt-1 text-sm font-medium text-[#E50914]">
          Manage and mentor all members memberships
        </p>
      </div>
      <MembershipsList />
    </div>
  );
}