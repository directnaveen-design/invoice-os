"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, QrCode, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type InvoiceForPanel = {
  share_token: string;
  invoice_number: string;
  currency: string;
  total: number;
  amount_paid: number;
  status: string;
  upi_id: string | null;
  payment_link: string | null;
};

const fmt = (n: number, code: string) => {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(n || 0); }
  catch { return `${(n || 0).toFixed(2)} ${code}`; }
};

export default function PaymentPanel({ invoice }: { invoice: InvoiceForPanel }) {
  const [copied, setCopied] = useState(false);
  const [showUTR, setShowUTR] = useState(false);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(invoice.status === "paid");

  const balance = useMemo(() => Math.max(0, Number(invoice.total) - Number(invoice.amount_paid)), [invoice]);
  const isINR = invoice.currency === "INR";
  const upiId = invoice.upi_id || "direct.naveen@okicici";

  const upiLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: "Invoice Payment",
      am: balance.toFixed(2),
      cu: "INR",
      tn: `INV-${invoice.invoice_number}`.slice(0, 50),
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, balance, invoice.invoice_number]);

  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiLink)}`,
    [upiLink]
  );

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const submitPayment = async () => {
    if (!utr.trim()) { setError("Enter UTR / Transaction ID"); return; }
    setLoading(true); setError("");
    const { data, error: rpcError } = await supabase.rpc("record_invoice_payment", {
      p_share_token: invoice.share_token,
      p_amount: balance,
      p_method: isINR ? "upi" : "bank_transfer",
      p_reference: utr.trim(),
    });
    setLoading(false);
    if (rpcError) { setError(rpcError.message); return; }
    const result = data as { error?: string; status?: string };
    if (result.error === "already_paid") { setError("This invoice is already marked paid."); return; }
    if (result.error === "not_found") { setError("Invoice not found."); return; }
    setDone(true);
    setTimeout(() => window.location.reload(), 800);
  };

  if (done) {
    return (
      <div className="mt-8 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-2 text-lg font-bold text-emerald-700">Payment received — Thank you!</p>
        <p className="mt-1 text-sm text-emerald-600">This invoice is now marked as paid.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-3">
        <p className="text-sm font-bold text-slate-800">Complete your payment</p>
        <p className="text-xs text-slate-500">
          {isINR ? "Pay via UPI — scan or click to open your UPI app" : "Pay via the link below"}
        </p>
      </div>

      <div className="p-5">
        {/* Amount to pay */}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-white p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Amount to pay</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(balance, invoice.currency)}</p>
          </div>
          {Number(invoice.amount_paid) > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Already paid</p>
              <p className="text-sm font-semibold text-emerald-600">{fmt(Number(invoice.amount_paid), invoice.currency)}</p>
            </div>
          )}
        </div>

        {/* UPI section */}
        {isINR && (
          <div className="mb-4 flex flex-col items-center gap-4 rounded-lg bg-white p-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="UPI QR Code" className="h-40 w-40 shrink-0 rounded-lg border border-slate-200" />
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <QrCode className="h-3.5 w-3.5" /> Scan with any UPI app
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <code className="flex-1 truncate font-mono text-sm text-slate-800">{upiId}</code>
                <button
                  onClick={() => copy(upiId)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white"
                >
                  {copied ? "Copied" : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <a
                href={upiLink}
                className="mt-2 block rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700 sm:hidden"
              >
                Open UPI App
              </a>
              <p className="mt-2 text-[11px] text-slate-500">GPay · PhonePe · Paytm · BHIM · any UPI app</p>
            </div>
          </div>
        )}

        {/* International payment link */}
        {!isINR && invoice.payment_link && (
          <div className="mb-4 rounded-lg bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment link</p>
            <a
              href={invoice.payment_link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-sm font-medium text-emerald-600 underline"
            >
              {invoice.payment_link}
            </a>
          </div>
        )}

        {/* Mark as paid */}
        {!showUTR ? (
          <button
            onClick={() => setShowUTR(true)}
            className="w-full rounded-lg border-2 border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
          >
            I have paid — mark this invoice as paid
          </button>
        ) : (
          <div className="rounded-lg bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">
              Enter your {isINR ? "UPI transaction ID (UTR)" : "bank transfer reference"}
            </p>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder={isINR ? "e.g. 123456789012" : "e.g. TXN-ABC123"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {error && (
              <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setShowUTR(false); setError(""); }}
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={loading}
                className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</> : "Confirm payment"}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              ⓘ The invoice owner will verify this reference. Only submit if you've actually paid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
  }
