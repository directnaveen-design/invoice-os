// app/dashboard/create/page.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Receipt,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const CURRENCIES = [
  { code: "INR", label: "INR — Indian Rupee", symbol: "₹" },
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "د.إ" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

type FormState = {
  client: string;
  email: string;
  invoiceNumber: string;
  dueDate: string;
  currency: CurrencyCode;
  amount: string;
  paymentLink: string;
  upiId: string;
};

const INITIAL_FORM: FormState = {
  client: "",
  email: "",
  invoiceNumber: "INV-0001",
  dueDate: "",
  currency: "USD",
  amount: "",
  paymentLink: "",
  upiId: "",
};

const PUBLIC_BASE_URL = "https://invoice-os-beta.vercel.app";

const inputClass =
  "w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 " +
  "placeholder:text-slate-600 outline-none transition " +
  "focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nextInvoiceNumber(current: string): string {
  const match = current.match(/(\d+)\s*$/);
  if (!match) return current;
  const digits = match[1];
  const incremented = String(Number(digits) + 1).padStart(digits.length, "0");
  return current.slice(0, match.index) + incremented;
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
      >
        {label}
        {required && <span className="text-emerald-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function CreateInvoicePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* ----------------------------- Session + numbering ----------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }
      if (cancelled) return;

      setUserId(user.id);

      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (cancelled) return;

      const nextNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
      setForm((prev) => ({ ...prev, invoiceNumber: nextNumber }));
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const activeCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === form.currency) ?? CURRENCIES[1],
    [form.currency]
  );

  const shareLink = shareToken ? `${PUBLIC_BASE_URL}/invoice/${shareToken}` : "";

  /* --------------------------------- Submit --------------------------------- */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const amountNumber = Number(form.amount);

    if (!form.client.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!form.invoiceNumber.trim()) {
      setError("Invoice number is required.");
      return;
    }
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      setError("Please enter a valid client email address.");
      return;
    }
    if (!form.amount.trim() || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError("Please enter a total amount greater than 0.");
      return;
    }
    if (!userId) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSubmitting(true);

    try {
      const token = crypto.randomUUID();

      const { error: insertError } = await supabase.from("invoices").insert({
        client: form.client.trim(),
        email: form.email.trim(),
        invoice_number: form.invoiceNumber.trim(),
        due_date: form.dueDate,
        currency: form.currency,
        amount: amountNumber,
        payment_link: form.paymentLink.trim(),
        upi_id: form.currency === "INR" ? form.upiId.trim() : "",
        status: "pending",
        share_token: token,
        user_id: userId,
      });

      if (insertError) throw insertError;

      setCopied(false);
      setShareToken(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the invoice. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------- Actions -------------------------------- */
  const handleCopy = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateAnother = () => {
    setShareToken(null);
    setCopied(false);
    setError(null);
    setForm((prev) => ({
      ...INITIAL_FORM,
      currency: prev.currency,
      invoiceNumber: nextInvoiceNumber(prev.invoiceNumber),
    }));
  };

  /* ---------------------------------- Render -------------------------------- */
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <Receipt className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              Create Invoice
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Generate a shareable invoice in seconds — no PDFs, no friction.
            </p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40 sm:p-8"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Client Name" htmlFor="client" required>
              <input
                id="client"
                type="text"
                value={form.client}
                onChange={(e) => setField("client", e.target.value)}
                placeholder="Acme Studios Inc."
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <Field label="Client Email" htmlFor="email" hint="Optional — used for reminders.">
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="billing@acme.com"
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <Field label="Invoice Number" htmlFor="invoice-number" required>
              <input
                id="invoice-number"
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setField("invoiceNumber", e.target.value)}
                placeholder="INV-0001"
                className={`${inputClass} font-mono tracking-wide`}
              />
            </Field>

            <Field label="Due Date" htmlFor="due-date">
              <input
                id="due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setField("dueDate", e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </Field>

            <Field label="Currency" htmlFor="currency" required>
              <div className="relative">
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value as CurrencyCode)}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  {CURRENCIES.map((currency) => (
                    <option
                      key={currency.code}
                      value={currency.code}
                      className="bg-slate-900 text-slate-100"
                    >
                      {currency.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </Field>

            <Field label="Total Amount" htmlFor="amount" required>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                  {activeCurrency.symbol}
                </span>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field
                label="Payment Link"
                htmlFor="payment-link"
                hint="Paste a Stripe, PayPal, Wise or your own portal link."
              >
                <input
                  id="payment-link"
                  type="url"
                  value={form.paymentLink}
                  onChange={(e) => setField("paymentLink", e.target.value)}
                  placeholder="https://buy.stripe.com/..."
                  className={inputClass}
                />
              </Field>
            </div>

            {form.currency === "INR" && (
              <div className="md:col-span-2">
                <Field label="UPI ID" htmlFor="upi-id" hint="Shown to your client for instant UPI payments.">
                  <input
                    id="upi-id"
                    type="text"
                    value={form.upiId}
                    onChange={(e) => setField("upiId", e.target.value)}
                    placeholder="yourname@upi"
                    autoComplete="off"
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Invoice...
                </>
              ) : (
                <>
                  Create Invoice
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ------------------------------ Success Modal ----------------------------- */}
      {shareToken && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-emerald-500/5 sm:p-8">
            <button
              type="button"
              onClick={() => setShareToken(null)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>

            <h2
              id="success-modal-title"
              className="text-xl font-semibold tracking-tight text-slate-100"
            >
              Invoice created
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              {form.invoiceNumber} for{" "}
              <span className="font-medium text-slate-200">{form.client}</span> is ready to share.
            </p>

            {/* Link box */}
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Public Invoice Link
              </p>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                <input
                  readOnly
                  value={shareLink}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Public invoice link"
                  className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-slate-300 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    copied
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <p aria-live="polite" className="sr-only">
                {copied ? "Link copied to clipboard" : ""}
              </p>
            </div>

            {/* Modal actions */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCreateAnother}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }
