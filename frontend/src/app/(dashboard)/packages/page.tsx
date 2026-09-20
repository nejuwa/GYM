import { PageHeader } from "@/components/layout/page-header";
import { PackagesPage } from "@/components/shared/packages-page";

export const metadata = { title: "Packages | GYMMIS" };

export default function PackagesRoutePage() {
  return (
    <div>
      <PageHeader
        title="Packages"
        subtitle="Create and manage membership packages, pricing and availability."
      />
      <PackagesPage />
    </div>
  );
}