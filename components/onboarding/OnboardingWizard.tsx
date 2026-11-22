"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { checkSlugAvailability, completeOnboarding, type SlugStatus } from "@/app/onboarding/actions";
import { CatalogPreview } from "@/components/onboarding/CatalogPreview";
import { slugify, slugSchema } from "@/lib/slug";
import { putWithProgress } from "@/lib/upload-client";
import { MAX_LOGO_BYTES, type PresignedResponse } from "@/lib/validators/upload";
import {
  brandingStepSchema,
  contactStepSchema,
  nameStepSchema,
  normalizeArgentineWhatsapp,
} from "@/lib/validators/onboarding";
import { firstErrors } from "@/lib/validators/vehicle";

interface OnboardingWizardProps {
  rootDomain: string;
  initial: {
    name: string;
    slug: string;
    whatsappNumber: string;
    city: string;
    address: string;
    instagramHandle: string;
    primaryColor: string;
  };
}

type SlugState = { status: "idle" | "checking" | SlugStatus; message: string };
type LogoStatus = "idle" | "processing" | "uploading" | "done" | "error";

const STEPS = ["Tu agencia", "Contacto", "Marca"] as const;
const COLOR_PRESETS = ["#E11D48", "#EA580C", "#CA8A04", "#16A34A", "#0F766E", "#0284C7", "#4F46E5", "#9333EA", "#DB2777", "#111111"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const INPUT_CLASS =
  "h-12 w-full border border-neutral-300 bg-white px-4 text-base outline-none focus:ring-4 focus:ring-neutral-900/10 dark:border-white/20 dark:focus:ring-white/10 dark:bg-white/5 focus:border-neutral-400 dark:focus:border-white/40 rounded-xl";

function Field(props: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{props.label}</span>
      {props.children}
      {props.error ? (
        <span className="block text-sm font-medium text-red-600">{props.error}</span>
      ) : props.hint ? (
        <span className="block text-sm text-neutral-600 dark:text-neutral-400">{props.hint}</span>
      ) : null}
    </label>
  );
}

export function OnboardingWizard({ initial, rootDomain }: OnboardingWizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>({ status: "idle", message: "" });

  const [whatsapp, setWhatsapp] = useState(initial.whatsappNumber);
  const [city, setCity] = useState(initial.city);
  const [address, setAddress] = useState(initial.address);
  const [instagram, setInstagram] = useState(initial.instagramHandle);

  const [color, setColor] = useState(initial.primaryColor);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<LogoStatus>("idle");
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Disponibilidad del subdominio: formato en el cliente, existencia en el servidor (con debounce).
  useEffect(() => {
    if (!slug) {
      setSlugState({ status: "idle", message: "" });
      return;
    }
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) {
      setSlugState({ status: "invalid", message: parsed.error.issues[0]?.message ?? "Subdominio inválido" });
      return;
    }

    setSlugState({ status: "checking", message: "Verificando…" });
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await checkSlugAvailability(parsed.data);
      if (cancelled) return;
      setSlugState(result.ok ? result.data : { status: "invalid", message: result.error });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const colorValid = HEX_COLOR.test(color);
  const normalizedWhatsapp = normalizeArgentineWhatsapp(whatsapp);
  const logoBusy = logoStatus === "processing" || logoStatus === "uploading";

  function goNext() {
    setFormError(null);

    if (step === 0) {
      const parsed = nameStepSchema.safeParse({ name, slug });
      if (!parsed.success) return setErrors(firstErrors(parsed.error));
      if (slugState.status !== "available") {
        return setErrors({ slug: slugState.status === "checking" ? "Esperá a que termine la verificación." : slugState.message || "Elegí otro subdominio." });
      }
    }

    if (step === 1) {
      const parsed = contactStepSchema.safeParse({ whatsappNumber: whatsapp, city, address, instagramHandle: instagram });
      if (!parsed.success) return setErrors(firstErrors(parsed.error));
    }

    setErrors({});
    setStep((current) => Math.min(2, current + 1));
  }

  async function handleLogo(file: File) {
    setLogoError(null);
    setLogoStatus("processing");
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 512,
        initialQuality: 0.9,
        fileType: "image/webp",
        maxSizeMB: 0.5,
        useWebWorker: true,
      });
      if (compressed.type !== "image/webp") throw new Error("Tu navegador no pudo convertir el logo a WebP");
      if (compressed.size > MAX_LOGO_BYTES) throw new Error("El logo es demasiado pesado");

      setLogoPreview(URL.createObjectURL(compressed));
      setLogoStatus("uploading");
      setLogoProgress(0);

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/webp", size: compressed.size }),
      });
      if (!response.ok) throw new Error("No pudimos preparar la subida del logo");
      const presigned = (await response.json()) as PresignedResponse;

      await putWithProgress(presigned.uploadUrl, compressed, presigned.headers, setLogoProgress);
      setLogoKey(presigned.key);
      setLogoStatus("done");
    } catch (error) {
      setLogoPreview(null);
      setLogoKey(null);
      setLogoStatus("error");
      setLogoError(error instanceof Error ? error.message : "No pudimos subir el logo");
    }
  }

  function removeLogo() {
    setLogoPreview(null);
    setLogoKey(null);
    setLogoStatus("idle");
    setLogoError(null);
  }

  function finish() {
    setFormError(null);
    const parsed = brandingStepSchema.safeParse({ primaryColor: color, logoKey });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    setErrors({});

    startTransition(async () => {
      const result = await completeOnboarding({
        name,
        slug,
        whatsappNumber: whatsapp,
        city,
        address,
        instagramHandle: instagram,
        primaryColor: color,
        logoKey,
      });

      if (!result.ok) {
        const found = result.fieldErrors ?? {};
        setErrors(found);
        setFormError(result.error);
        if (found.slug || found.name) setStep(0);
        else if (found.whatsappNumber || found.city || found.address || found.instagramHandle) setStep(1);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  const slugColor =
    slugState.status === "available"
      ? "text-emerald-700 dark:text-emerald-400"
      : slugState.status === "checking" || slugState.status === "idle"
        ? "text-neutral-600 dark:text-neutral-400"
        : "text-red-600";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <ol className="grid grid-cols-3 gap-2" aria-label="Pasos">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`flex h-12 items-center justify-center gap-2 border text-sm font-semibold ${
                index === step
                  ? "border-transparent bg-neutral-900 text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                  : index < step
                    ? "border-neutral-200 dark:border-white/10"
                    : "border-neutral-200 text-neutral-500 dark:border-white/10"
              } rounded-xl`}
            >
              {index < step ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <section className="space-y-5" aria-labelledby="step-0">
            <h2 id="step-0" className="text-2xl font-semibold font-display">
              ¿Cómo se llama tu agencia?
            </h2>
            <Field label="Nombre de la agencia" error={errors.name}>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slugTouched) setSlug(slugify(event.target.value));
                }}
                className={INPUT_CLASS}
                placeholder="Palermo Autos"
                autoComplete="organization"
              />
            </Field>

            <Field label="Tu dirección web" error={errors.slug}>
              <div className="flex items-stretch">
                <input
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${INPUT_CLASS} min-w-0 border-r-0`}
                  placeholder="miagencia"
                />
                <span className="flex items-center border border-neutral-200 bg-neutral-100 px-3 text-sm font-semibold dark:border-white/10 dark:bg-neutral-900 rounded-xl">
                  .{rootDomain}
                </span>
              </div>
            </Field>
            <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm font-semibold ${slugColor}`}>
              {slugState.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {slugState.status === "available" ? <Check className="h-4 w-4" /> : null}
              {slugState.message || `Tu catálogo va a estar en ${slug || "miagencia"}.${rootDomain}`}
            </p>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-5" aria-labelledby="step-1">
            <h2 id="step-1" className="text-2xl font-semibold font-display">
              ¿Dónde te contactan los clientes?
            </h2>
            <Field
              label="WhatsApp comercial"
              error={errors.whatsappNumber}
              hint={normalizedWhatsapp ? `Se va a guardar como ${normalizedWhatsapp}` : "Formato internacional: +54 9 11 5555 1234"}
            >
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={INPUT_CLASS}
                placeholder="+54 9 11 5555 1234"
              />
            </Field>
            <Field label="Ciudad" error={errors.city}>
              <input value={city} onChange={(event) => setCity(event.target.value)} className={INPUT_CLASS} placeholder="Buenos Aires" autoComplete="address-level2" />
            </Field>
            <Field label="Dirección del local (opcional)" error={errors.address}>
              <input value={address} onChange={(event) => setAddress(event.target.value)} className={INPUT_CLASS} placeholder="Av. Juan B. Justo 1850" autoComplete="street-address" />
            </Field>
            <Field label="Instagram (opcional)" error={errors.instagramHandle}>
              <input
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                className={INPUT_CLASS}
                placeholder="@palermoautos"
              />
            </Field>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-6" aria-labelledby="step-2">
            <h2 id="step-2" className="text-2xl font-semibold font-display">
              Poné tu marca
            </h2>

            <div className="space-y-2">
              <span className="block text-sm font-medium">Logo (opcional)</span>
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-neutral-200 bg-white dark:border-white/10 rounded-xl">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo cargado" className="h-full w-full object-contain p-1" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-neutral-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => logoInputRef.current?.click()}
                    className="flex h-12 items-center gap-2 border border-neutral-300 px-4 font-semibold disabled:opacity-50 dark:border-white/20 rounded-xl bg-white dark:bg-white/5"
                  >
                    {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {logoStatus === "processing" ? "Optimizando…" : logoStatus === "uploading" ? `Subiendo ${logoProgress}%` : logoPreview ? "Cambiar logo" : "Subir logo"}
                  </button>
                  {logoPreview && !logoBusy ? (
                    <button type="button" onClick={removeLogo} className="flex h-10 items-center gap-1 text-sm font-semibold text-red-600">
                      <X className="h-4 w-4" /> Quitar
                    </button>
                  ) : null}
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleLogo(file);
                  event.target.value = "";
                }}
              />
              {logoError ? <p role="alert" className="text-sm font-medium text-red-600">{logoError}</p> : null}
            </div>

            <div className="space-y-3">
              <span className="block text-sm font-medium">Color principal</span>
              <ul className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {COLOR_PRESETS.map((preset) => (
                  <li key={preset}>
                    <button
                      type="button"
                      aria-label={`Color ${preset}`}
                      aria-pressed={color.toUpperCase() === preset}
                      onClick={() => setColor(preset)}
                      className={`h-12 w-full ${color.toUpperCase() === preset ? "border-2 border-neutral-900 dark:border-white" : "border border-neutral-200 dark:border-white/10"} rounded-xl`}
                      style={{ backgroundColor: preset }}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <input
                  type="color"
                  aria-label="Elegir otro color"
                  value={colorValid ? color : "#111111"}
                  onChange={(event) => setColor(event.target.value.toUpperCase())}
                  className="h-12 w-20 cursor-pointer border border-neutral-300 bg-white p-1 dark:border-white/20 dark:bg-white/5 rounded-xl"
                />
                <input
                  value={color}
                  onChange={(event) => setColor(event.target.value.trim())}
                  maxLength={7}
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={INPUT_CLASS}
                  placeholder="#E11D48"
                  aria-label="Código de color"
                />
              </div>
              {errors.primaryColor ? <p className="text-sm font-medium text-red-600">{errors.primaryColor}</p> : null}
            </div>
          </section>
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {formError}
          </p>
        ) : null}

        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button
            type="button"
            disabled={step === 0 || pending}
            onClick={() => {
              setErrors({});
              setStep((current) => Math.max(0, current - 1));
            }}
            className="h-12 border border-neutral-300 font-semibold disabled:opacity-30 dark:border-white/20 rounded-xl bg-white dark:bg-white/5"
          >
            Atrás
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={step === 0 && slugState.status === "checking"}
              className="h-12 border border-transparent bg-neutral-900 text-base font-semibold text-white disabled:opacity-50 dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={pending || logoBusy || !colorValid}
              className="flex h-12 items-center justify-center gap-2 border border-transparent bg-neutral-900 text-base font-semibold text-white disabled:opacity-50 dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Publicar mi catálogo
            </button>
          )}
        </div>
      </div>

      <aside className={`space-y-3 ${step === 2 ? "block" : "hidden lg:block"}`} aria-label="Vista previa">
        <p className="text-sm font-semibold uppercase tracking-wider">Así se ve tu catálogo</p>
        <CatalogPreview name={name} logoUrl={logoPreview} color={color} city={city} hasWhatsapp={normalizedWhatsapp !== null} />
      </aside>
    </div>
  );
}
