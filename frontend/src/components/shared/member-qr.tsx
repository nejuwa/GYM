"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Copy, Check, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { getMemberQR } from "@/lib/api/members";
import { formatDate } from "@/lib/utils";

interface QRMeta {
  id: string;
  memberCode: string;
  fullName: string;
  status: string;
  activeMembership?: {
    id: string;
    package?: { name?: string } | null;
    endDate: string;
  } | null;
}

export function MemberQrPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [meta, setMeta] = useState<QRMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMemberQR(id)
      .then((res) => {
        setMeta(res.member);
        setQrImage(res.qrImage);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to generate QR code");
      })
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) {
    return <PageLoader label="Generating QR code..." />;
  }

  if (error || !meta || !qrImage) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="Unable to generate QR code">
          {error ?? "QR code unavailable for this member."}
        </Alert>
      </div>
    );
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(meta.memberCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast("success", "Member code copied");
    } catch {
      toast("error", "Could not copy code");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card className="text-center p-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
          <ScanLine className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Member Check-in QR Code</h2>
        <p className="mt-1 text-sm text-slate-500">
          Show this code at the front desk for check-in, or scan it at the entrance kiosk.
        </p>

        <div className="mt-6 mx-auto inline-block rounded-2xl border-4 border-slate-900 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrImage} alt={`QR code for ${meta.fullName}`} width={256} height={256} className="w-56 h-56" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Avatar name={meta.fullName} size="md" />
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">{meta.fullName}</p>
            <p className="font-mono text-xs text-slate-500">{meta.memberCode}</p>
          </div>
          <StatusBadge status={meta.status} />
        </div>

        {meta.activeMembership && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
            <Badge variant="success">{meta.activeMembership.package?.name ?? "Membership"}</Badge>
            <span>valid until {formatDate(meta.activeMembership.endDate)}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={copyCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Code"}
          </Button>
          <a href={qrImage} download={`${meta.memberCode}-qr.png`}>
            <Button leftIcon={<Download className="h-4 w-4" />}>Download QR</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}