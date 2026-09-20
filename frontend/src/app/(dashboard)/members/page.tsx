import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MembersList } from "@/components/shared/members-list";

export const metadata = { title: "Members | GYMMIS" };

export default function MembersPage() {
  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Manage gym members, their memberships and contact details."
        actions={
          <Link href="/members/new">
            <Button leftIcon={<UserPlus className="h-4 w-4" />}>Register Member</Button>
          </Link>
        }
      />
      <MembersList />
    </div>
  );
}