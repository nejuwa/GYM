"use client";

import { useState } from "react";
import { Info, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { createTrainer, updateTrainer } from "@/lib/api/trainers";
import { trainerStatusOptions } from "@/components/shared/trainer-ui";
import type { AccountStatus, Trainer } from "@/types";
import { ProfileImageUploader } from "@/components/shared/profile-image-uploader";

const SPECIALIZATIONS = ["Strength", "Cardio", "CrossFit", "Pilates", "Yoga", "HIIT", "Bodybuilding", "Weight Loss", "Rehab / Mobility"];

interface TrainerFormProps {
  initial?: Trainer | null;
  onComplete: (trainer: Trainer) => void;
}

export function TrainerForm({ initial, onComplete }: TrainerFormProps) {
  const { toast } = useToast();
  const isEdit = Boolean(initial);

  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [specSelections, setSpecSelections] = useState<string[]>(
    initial
      ? initial.specialization.split(",").map((s) => s.trim()).filter(Boolean)
      : []
  );
  const [customSpec, setCustomSpec] = useState("");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [status, setStatus] = useState<AccountStatus>(initial?.status ?? "ACTIVE");
  const [photoUrl, setPhotoUrl] = useState(initial?.photo ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSpec = (value: string) => {
    setSpecSelections((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const addCustomSpec = () => {
    const v = customSpec.trim();
    if (!v) return;
    if (!specSelections.includes(v)) setSpecSelections((prev) => [...prev, v]);
    setCustomSpec("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!phone.trim()) next.phone = "Phone is required";
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "A valid email is required";
    if (!isEdit && (!password || !/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)))
      next.password = "Min 6 chars with letters and numbers";
    const skills = [...specSelections, ...(customSpec.trim() ? [customSpec.trim()] : [])];
    if (skills.length === 0) next.specialization = "Select at least one specialization";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const finalPhoto = photoUrl.trim() || (isEdit ? null : undefined);

    setBusy(true);
    try {
      if (isEdit && initial) {
        const res = await updateTrainer(initial.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          specialization: skills.join(","),
          bio: bio.trim() || undefined,
          photo: finalPhoto,
          imageFile,
          status,
        });
        toast("success", "Trainer updated", res.trainer.fullName);
        onComplete(res.trainer);
      } else {
        const res = await createTrainer({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          specialization: skills.join(","),
          bio: bio.trim() || undefined,
          photo: finalPhoto,
          imageFile,
        });
        toast("success", "Trainer registered", `${res.trainer.fullName} · ${res.trainer.specialization}`);
        onComplete(res.trainer);
      }
    } catch (err) {
      toast("error", isEdit ? "Failed to update trainer" : "Failed to register trainer", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <ProfileImageUploader
        url={photoUrl}
        file={imageFile}
        onUrlChange={setPhotoUrl}
        onFileChange={setImageFile}
        onError={(message) => toast("error", "Invalid profile image", message)}
        disabled={busy}
        label="Profile image"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Full name *" placeholder="e.g. Sara Bekele" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
        <Input label="Email *" type="email" placeholder="trainer@gym.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Phone *" placeholder="+251 9XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        {isEdit ? (
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)} options={trainerStatusOptions} />
        ) : (
          <Input
            label="Login password *"
            type="password"
            placeholder="Min 6 chars, letters & numbers"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Specializations *</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((s) => {
            const active = specSelections.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpec(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-slate-600 hover:border-primary/50"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Custom skill (e.g. Kettlebell)" value={customSpec} onChange={(e) => setCustomSpec(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={addCustomSpec}>
            Add
          </Button>
        </div>
        {errors.specialization && <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>}
        <p className="mt-1 text-xs text-slate-400">Stored as a single skill list; search matches any skill.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Bio / certifications</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Experience, certifications, emergency contact, notes..."
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <p className="mt-1 text-xs text-slate-400">
          Free-text field (e.g. certifications list) — the backend has no structured certification/payroll fields.
        </p>
      </div>

      {isEdit ? (
        <Alert variant="info" title="Updating trainer">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Deactivated trainers no longer appear in the active roster but keep their linked login account.
          </div>
        </Alert>
      ) : (
        <Alert variant="info" title="Registration creates a login">
          The trainer gets an account with this email/password and the TRAINER role.
        </Alert>
      )}

      <Button type="submit" className="w-full" loading={busy}>
        <UserRound className="h-4 w-4" /> {isEdit ? "Save Changes" : "Register Trainer"}
      </Button>
    </form>
  );
}