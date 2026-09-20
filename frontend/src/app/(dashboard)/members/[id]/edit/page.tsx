import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MemberEditPage } from "@/components/shared/member-edit";

export const metadata = { title: "Edit Member | GYMMIS" };

export default function MemberEditPageRoute() {
  return (
    <div>
      <PageHeader
        title="Edit Member"
        subtitle="Update the member profile and account information."
        actions={
          <Link href="/members">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Members
            </Button>
          </Link>
        }
      />
      <MemberEditPage />
    </div>
  );
}