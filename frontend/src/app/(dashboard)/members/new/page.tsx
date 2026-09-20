import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MemberNewPage } from "@/components/shared/members-new";

export const metadata = { title: "Register Member | GYMMIS" };

export default function NewMemberPage() {
  return (
    <div>
      <PageHeader
        title="Register Member"
        subtitle="Create a member account, initial package and membership in one step."
        actions={
          <Link href="/members">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Members
            </Button>
          </Link>
        }
      />
      <MemberNewPage />
    </div>
  );
}