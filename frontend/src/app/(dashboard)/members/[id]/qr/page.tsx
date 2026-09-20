import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MemberQrPage } from "@/components/shared/member-qr";

export const metadata = { title: "Member QR Code | GYMMIS" };

export default function MemberQrPageRoute() {
  return (
    <div>
      <PageHeader
        title="Member QR Code"
        subtitle="Generate and print the member&apos;s check-in QR code."
        actions={
          <Link href="/members">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Members
            </Button>
          </Link>
        }
      />
      <MemberQrPage />
    </div>
  );
}