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

/* ============================================================
   TYPES
   ============================================================ */
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
  country: string | null;
};

type SavedProduct = {
  id: string;
  name: string;
  default_price: number;
};

/* ============================================================
   CONSTANTS
   ============================================================ */
const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "CAD", symbol: "CA$", label: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD — Australian Dollar" },
  { code: "AED", symbol: "د.إ", label: "AED — UAE Dirham" },
  { code: "INR", symbol: "₹", label: "INR — Indian Rupee" },
];

const TAX_MODES: { value: TaxMode; label: string; desc: string; defaultRate: number }[] = [
  { value: "none", label: "No tax", desc: "Standard invoice without tax lines.", defaultRate: 0 },
  { value: "us_sales", label: "US Sales Tax", desc: "Per-state sales tax (0–12%).", defaultRate: 0 },
  { value: "eu_vat", label: "EU VAT", desc: "VAT charged based on client country.", defaultRate: 20 },
  { value: "zero_export", label: "Zero-Rated Export", desc: "0% reverse charge for cross-border B2B.", defaultRate: 0 },
  { value: "custom", label: "Custom Rate", desc: "Define your own tax percentage.", defaultRate: 0 },
];

const TAX_DISCLAIMERS: Record<TaxMode, string> = {
  none: "",
  us_sales: "Sales tax applied as per applicable US state jurisdiction.",
  eu_vat: "VAT charged as per EU Directive 2006/112/EC.",
  zero_export:
    "Zero-rated international service export. Reverse charge: VAT to be accounted by the recipient under Article 196, Council Directive 2006/112/EC.",
  custom: "",
};

const BRAND_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];
const PUBLIC_BASE_URL = "https://invoice-os-beta.vercel.app";

const inputClass =
  "w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 " +
  "placeholder:text-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20";

/* ============================================================
   HELPERS
   ============================================================ */
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
        {required && <span className="text-emerald-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionHead({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/80">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE COMPONENT
   ============================================================ */
export default function CreateInvoicePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);

  const [clientMode, setClientMode] = useState<"saved" | "new">("new");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [saveToDirectory, setSaveToDirectory] = useState(true);

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
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  const [paymentLink, setPaymentLink] = useState("");
  const [upiId, setUpiId] = useState("");
  const [brandColor, setBrandColor] = useState("#10b981");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

      const [{ data: cl }, { data: pr }, { count }] = await Promise.all([
        supabase
          .from("clients")
          .select("id,name,email,address,tax_id,country")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id,name,default_price")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setSavedClients(cl || []);
      setSavedProducts(pr || []);
      setInvoiceNumber(`INV-${String((count ?? 0) + 1).padStart(4, "0")}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const preset = TAX_MODES.find((t) => t.value === taxMode);
    if (preset && taxMode !== "custom") {
      setTaxRate(preset.defaultRate);
      setTaxNote(TAX_DISCLAIMERS[taxMode]);
    }
  }, [taxMode]);

  useEffect(() => {
    if (currency !== "INR") setUpiId("");
    if (currency === "INR") setPaymentLink("");
  }, [currency]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: uid(), description: "", quantity: 1, unitPrice: 0 }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.id !== id)));
  }, []);

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }, []);

  const handleSelectClient = useCallback(
    (id: string) => {
      setSelectedClientId(id);
      if (!id) return;
      const c = savedClients.find((x) => x.id === id);
      if (!c) return;
      setClientName(c.name);
      setClientEmail(c.email || "");
      setClientAddress(c.address || "");
      setClientTaxId(c.tax_id || "");
    },
    [savedClients]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
        0
      ),
    [items]
  );
  const taxAmount = useMemo(
    () => (subtotal * (Number(taxRate) || 0)) / 100,
    [subtotal, taxRate]
  );
  const total = useMemo(
    () => Math.max(0, subtotal + taxAmount - (Number(discount) || 0)),
    [subtotal, taxAmount, discount]
  );
  const balanceDue = useMemo(
    () => Math.max(0, total - (Number(amountPaid) || 0)),
    [total, amountPaid]
  );

  const currencySymbol = useMemo(
    () => CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$",
    [currency]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("Session expired. Please sign in again.");
      return;
    }
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }

    const validItems = items.filter(
      (i) => i.description.trim() && (Number(i.quantity) || 0) > 0
    );
    if (validItems.length === 0) {
      setError("Add at least one valid line item.");
      return;
    }
    if (total <= 0) {
      setError("Invoice total must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const token = crypto.randomUUID();

      if (clientMode === "new" && saveToDirectory && clientName.trim()) {
        await supabase.from("clients").insert({
          user_id: userId,
          name: clientName.trim(),
          email: clientEmail.trim() || null,
          address: clientAddress.trim() || null,
          tax_id: clientTaxId.trim() || null,
        });
      }

      const { data, error: rpcError } = await supabase.rpc("create_invoice_with_items", {
        p_invoice: {
          user_id: userId,
          client: clientName.trim(),
          email: clientEmail.trim(),
          client_address: clientAddress.trim(),
          client_tax_id: clientTaxId.trim(),
          invoice_number: invoiceNumber.trim(),
          issue_date: issueDate,
          due_date: dueDate,
          currency,
          subtotal,
          tax_mode: taxMode,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount,
          total,
          amount_paid: amountPaid,
          tax_note: taxNote,
          payment_link: paymentLink,
          upi_id: currency === "INR" ? upiId : "",
          notes,
          brand_color: brandColor,
          logo_url: "",
          share_token: token,
        },
        p_items: validItems.map((it, idx) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unitPrice) || 0,
          line_total: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
          position: idx,
        })),
      });

      if (rpcError) throw rpcError;
      const returnedToken =
        (data as { share_token?: string } | null)?.share_token ?? token;

      setCopied(false);
      setSuccessToken(returnedToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const shareLink = successToken ? `${PUBLIC_BASE_URL}/invoice/${successToken}` : "";

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const t = document.createElement("textarea");
      t.value = shareLink;
      t.style.position = "fixed";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <Receipt className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Invoice-OS</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="h-3 w-3" /> Pro
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Bank-grade encryption</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Create invoice</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enterprise multi-currency invoicing with itemized line tracking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Client Section */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <SectionHead
                icon={<Building2 className="h-4 w-4 text-emerald-400" />}
                title="Client Information"
                subtitle="Select from directory or enter new details."
              />

              <div className="mb-4 inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    clientMode === "new"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  New Client
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("saved")}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    clientMode === "saved"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Directory ({savedClients.length})
                </button>
              </div>

              {clientMode === "saved" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleSelectClient(e.target.value)}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      <option value="">Select a saved client…</option>
                      {savedClients.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900">
                          {c.name} {c.email ? `(${c.email})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Client Name" required>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Acme Corp"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Client Email">
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="billing@acme.com"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Billing Address">
                    <input
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="123 Market St, San Francisco, CA"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tax / VAT ID">
                    <input
                      value={clientTaxId}
                      onChange={(e) => setClientTaxId(e.target.value)}
                      placeholder="US123456789"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </section>

            {/* Line Items Section */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <SectionHead
                icon={<FileText className="h-4 w-4 text-emerald-400" />}
                title="Line Items"
                subtitle="Specify services, deliverables, and unit prices."
              />

              <div className="space-y-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-12 gap-3 items-center rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, "description", e.target.value)}
                        placeholder="Description (e.g. Design System)"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, "quantity", e.target.value)}
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
                        onChange={(e) => updateItem(it.id, "unitPrice", e.target.value)}
                        placeholder="Rate"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex justify-end">
    
