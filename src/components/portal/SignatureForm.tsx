"use client";

import { useState, useTransition } from "react";
import { SignaturePad } from "./SignaturePad";
import { submitPortalSignature } from "@/lib/portal/actions";

/** Form tanda tangan di halaman portal publik -- dipasangkan dengan `SignaturePad`. Client Component karena butuh state canvas + useTransition untuk submit tanpa reload halaman. */
export function SignatureForm({
  token,
  defaultDocumentLabel,
  defaultSignerName,
}: {
  token: string;
  defaultDocumentLabel: string;
  defaultSignerName?: string;
}) {
  const [documentLabel, setDocumentLabel] = useState(defaultDocumentLabel);
  const [signerName, setSignerName] = useState(defaultSignerName ?? "");
  const [signerRole, setSignerRole] = useState("Klien");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!signatureDataUrl) {
      setResult({ ok: false, message: "Silakan gambar tanda tangan terlebih dahulu." });
      return;
    }
    startTransition(async () => {
      const res = await submitPortalSignature({
        token,
        documentLabel,
        signerName,
        signerRole,
        signatureDataUrl,
      });
      if (res.ok) {
        setResult({ ok: true, message: "Tanda tangan berhasil disimpan. Terima kasih!" });
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {result.message}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Dokumen yang ditandatangani</label>
        <input
          value={documentLabel}
          onChange={(e) => setDocumentLabel(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nama penanda tangan</label>
          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Nama lengkap"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Jabatan/peran</label>
          <input
            value={signerRole}
            onChange={(e) => setSignerRole(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <SignaturePad onChange={setSignatureDataUrl} />
      {result && !result.ok && <p className="text-xs text-red-600">{result.message}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Menyimpan..." : "Kirim Tanda Tangan"}
      </button>
    </div>
  );
}
