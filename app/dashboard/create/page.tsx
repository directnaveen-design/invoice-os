"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "AED" | "INR";
type TaxMode = "none" | "us_sales" | "eu_vat" | "zero_export" | "custom";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type SavedClient = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  tax_id: string | null;
};

const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "CAD", symbol: "CA$", label: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD — Australian Dollar" },
  { code: "AED", symbol: "د.إ", label: "AED — UAE Dirham" },
  { code: "INR", symbol: "₹", label: "INR — Indian Rupee" },
];

const TAX_MODES: { value: TaxMode; label: string; defaultRate: number }[] = [
  { value: "none", label: "No tax", defaultRate: 0 },
  { value: "us_sales", label: "US Sales Tax", defaultRate: 0 },
  { value: "eu_vat", label: "EU VAT", defaultRate: 20 },
  { value: "zero_export", label: "Zero-Rated Export (0%)", defaultRate: 0 },
  { value: "custom", label: "Custom Rate", defaultRate: 0 },
];

const TAX_DISCLAIMERS: Record<TaxMode, string> = {
  none: "",
  us_sales: "Sales tax applied as per applicable US state jurisdiction.",
  eu_vat: "VAT charged as per EU Directive 2006/112/EC.",
  zero_export:
    "Zero-rated international service export under reverse charge (Article 196, Council Directive 2006/112/EC).",
  custom: "",
};

const PUBLIC_BASE_URL = "https://invoice-os-beta.vercel.app";

const inputClass =
  "w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20";

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, days: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="text-emerald-400">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function CreateInvoicePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);

  const [clientMode, setClientMode] = useState<"new" | "saved">("new");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("INV-0001");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(addDays(today(), 30));
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: "", quantity: 1, unitPrice: 0 },
  ]);

  const [taxMode, setTaxMode] = useState<TaxMode>("none");
  const [taxRate, setTaxRate] = useState(0);
  const [taxNote, setTaxNote] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [upiId, setUpiId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      const [{ data: cl }, { count }] = await Promise.all([
        supabase.from("clients").select("id,name,email,address,tax_id").eq("user_id", user.id),
        supabase.from("invoices").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (cl) setSavedClients(cl);
      setInvoiceNumber(`INV-${String((count ?? 0) + 1).padStart(4, "0")}`);
    })();
  }, [router]);

  useEffect(() => {
    const preset = TAX_MODES.find((t) => t.value === taxMode);
    if (preset && taxMode !== "custom") {
      setTaxRate(preset.defaultRate);
      setTaxNote(TAX_DISCLAIMERS[taxMode]);
    }
  }, [taxMode]);

  const addItem = () => setItems((prev) => [...prev, { id: uid(), description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (id: string) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.id !== id)));
  const updateItem = (id: string, field: keyof LineItem, val: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  const handleSelectClient = (id: string) => {
    const c = savedClients.find((x) => x.id === id);
    if (!c) return;
    setClientName(c.name);
    setClientEmail(c.email || "");
    setClientAddress(c.address || "");
    setClientTaxId(c.tax_id || "");
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0), [items]);
  const taxAmount = useMemo(() => (subtotal * (Number(taxRate) || 0)) / 100, [subtotal, taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);
  const currencySymbol = useMemo(() => CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$", [currency]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) return setError("Session expired. Please log in.");
    if (!clientName.trim()) return setError("Client name is required.");

    const validItems = items.filter((i) => i.description.trim() && Number(i.quantity) > 0);
    if (validItems.length === 0) return setError("Add at least one valid line item.");
    if (total <= 0) return setError("Total must be greater than zero.");

    setSubmitting(true);
    try {
      const token = crypto.randomUUID();

      if (clientMode === "new") {
        await supabase.from("clients").insert({
          user_id: userId,
          name: clientName.trim(),
          email: clientEmail.trim() || null,
          address: clientAddress.trim() || null,
          tax_id: clientTaxId.trim() || null,
        });
      }

      const { error: invoiceError } = await supabase.from("invoices").insert({
        user_id: userId,
        client: clientName.trim(),
        email: clientEmail.trim() || null,
        client_address: clientAddress.trim() || null,
        client_tax_id: clientTaxId.trim() || null,
        invoice_number: invoiceNumber.trim(),
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        subtotal,
        tax_mode: taxMode,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        tax_note: taxNote,
        payment_link: paymentLink.trim() || null,
        upi_id: currency === "INR" ? upiId.trim() : null,
        status: "pending",
        share_token: token,
      });

      if (invoiceError) throw invoiceError;

      setCopied(false);
      setSuccessToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const shareLink = successToken ? `${PUBLIC_BASE_URL}/invoice/${successToken}` : "";

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="font-semibold">Invoice-OS Global</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              PRO
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Bank-grade 256-bit
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Create Commercial Invoice</h1>
        <p className="mt-1 text-xs text-slate-400">Multi-currency compliant billing for global enterprise clients.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client Details</span>
                <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setClientMode("new")}
                    className={`rounded-md px-2.5 py-1 ${clientMode === "new" ? "bg-slate-800 text-white" : "text-slate-400"}`}
                  >
                    New
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode("saved")}
                    className={`rounded-md px-2.5 py-1 ${clientMode === "saved" ? "bg-slate-800 text-white" : "text-slate-400"}`}
                  >
                    Directory ({savedClients.length})
                  </button>
                </div>
              </div>

              {clientMode === "saved" ? (
                <div className="relative">
                  <select
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className={`${inputClass} appearance-none pr-8`}
                  >
                    <option value="">Select client...</option>
                    {savedClients.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Client Name" required>
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" className={inputClass} />
                  </Field>
                  <Field label="Address">
                    <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="123 Market St, London" className={inputClass} />
                  </Field>
                  <Field label="Tax / VAT ID">
                    <input value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} placeholder="GB12345678" className={inputClass} />
                  </Field>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Line Items</span>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, "description", e.target.value)}
                        placeholder="Service Description"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, "quantity", Number(e.target.value))}
                        placeholder="Qty"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(it.id, "unitPrice", Number(e.target.value))}
                        placeholder="Rate"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                        className="rounded-lg p-2 text-slate-500 hover:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
              <Field label="Currency">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className={inputClass}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-slate-900">{c.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Tax Regulation">
                <select value={taxMode} onChange={(e) => setTaxMode(e.target.value as TaxMode)} className={inputClass}>
                  {TAX_MODES.map((m) => (
                    <option key={m.value} value={m.value} className="bg-slate-900">{m.label} ({m.defaultRate}%)</option>
                  ))}
                </select>
              </Field>

              {currency === "INR" ? (
                <div className="md:col-span-2">
                  <Field label="Merchant UPI ID">
                    <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="merchant@upi" className={inputClass} />
                  </Field>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <Field label="Payment Link (Stripe/PayPal)">
                    <input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://buy.stripe.com/..." className={inputClass} />
                  </Field>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice Summary</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({taxRate}%)</span>
                    <span className="font-mono text-slate-200">{currencySymbol}{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>Total Due</span>
                  <span className="font-mono text-emerald-400">{currencySymbol}{total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Issue Invoice <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        </form>
      </main>

      {successToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Invoice Live
              </span>
              <button onClick={() => setSuccessToken(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Client payment page is active:</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
              <input readOnly value={shareLink} className="flex-1 bg-transparent font-mono text-xs text-slate-300 outline -none truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-950"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-4 w-full rounded-xl bg-slate-800 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
                }
