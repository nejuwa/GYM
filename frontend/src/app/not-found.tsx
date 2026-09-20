import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}