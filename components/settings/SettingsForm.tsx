"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { updateTenantSettings } from "@/app/dashboard/settings/actions";
import { checkSlugAvailability, type SlugStatus } from "@/app/onboarding/actions";
import { CatalogPreview } from "@/components/onboarding/CatalogPreview";
import { slugSchema } from "@/lib/slug";
import { putWithProgress } from "@/lib/upload-client";
import { normalizeArgentineWhatsapp } from "@/lib/validators/onboarding";
import { settingsSchema } from "@/lib/validators/settings";
import { MAX_LOGO_BYTES, type PresignedResponse } from "@/lib/validators/upload";
import { firstErrors } from "@/lib/validators/vehicle";

interface SettingsFormProps {
  rootDomain: string;
  customDomain: string | null;
  initial: {
    name: string;
    slug: string;
    whatsappNumber: string;
    city: string;
    address: string;
    instagramHandle: string;
    primaryColor: string;
    logoUrl: string | null;
    notifyNewLeads: boolean;
    notifyEmail: string;
  };
}

type SlugState = { status: "idle" | "checking" | SlugStatus; message: string };
type LogoStatus = "idle" | "processing" | "uploading" | "done" | "error";
type Message = { type: "ok" | "error"; text: string } | null;

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

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border border-neutral-200 p-4 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.04]">
      <h2 className="text-xl font-semibold font-display">{props.title}</h2>
      {props.children}
    </section>
  );
}

export function SettingsForm({ initial, rootDomain, customDomain }: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugState, setSlugState] = useState<SlugState>({ status: "available", message: "" });
  const [savedSlug, setSavedSlug] = useState(initial.slug);

  const [whatsapp, setWhatsapp] = useState(initial.whatsappNumber);
  const [city, setCity] = useState(initial.city);
  const [address, setAddress] = useState(initial.address);
  const [instagram, setInstagram] = useState(initial.instagramHandle);

  const [color, setColor] = useState(initial.primaryColor);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(initial.logoUrl);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoStatus, setLogoStatus] = useState<LogoStatus>("idle");
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [notifyNewLeads, setNotifyNewLeads] = useState(initial.notifyNewLeads);
  const [notifyEmail, setNotifyEmail] = useState(initial.notifyEmail);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (slug === savedSlug) {
      setSlugState({ status: "available", message: "" });
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
  }, [slug, savedSlug]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const colorValid = HEX_COLOR.test(color);
  const normalizedWhatsapp = normalizeArgentineWhatsapp(whatsapp);
  const logoBusy = logoStatus === "processing" || logoStatus === "uploading";
  const displayedLogo = logoPreview ?? (removeLogo ? null : currentLogoUrl);
  const slugChanged = slug !== savedSlug;

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
      setRemoveLogo(false);
      setLogoStatus("done");
    } catch (error) {
      setLogoPreview(null);
      setLogoKey(null);
      setLogoStatus("error");
      setLogoError(error instanceof Error ? error.message : "No pudimos subir el logo");
    }
  }

  function discardLogo() {
    setLogoPreview(null);
    setLogoKey(null);
    setLogoStatus("idle");
    if (currentLogoUrl) setRemoveLogo(true);
  }

  function save() {
    setMessage(null);
    setErrors({});

    const payload = {
      name,
      slug,
      whatsappNumber: whatsapp,
      city,
      address,
      instagramHandle: instagram,
      primaryColor: color,
      logoAction: logoKey ? "replace" : removeLogo ? "remove" : "keep",
      logoKey,
      notifyNewLeads,
      notifyEmail,
    };

    const parsed = settingsSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error));
      setMessage({ type: "error", text: "Revisá los campos marcados." });
      return;
    }
    if (slugChanged && slugState.status !== "available") {
      setErrors({ slug: slugState.message || "Elegí otro subdominio." });
      return;
    }
    if (
      slugChanged &&
      !window.confirm("Si cambiás la dirección web, los links que ya compartiste dejan de funcionar. ¿Querés continuar?")
    ) {
      return;
    }

    startTransition(async () => {
      const result = await updateTenantSettings(payload);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ type: "error", text: result.error });
        return;
      }
      setSavedSlug(result.data.slug);
      setCurrentLogoUrl(result.data.logoUrl);
      setLogoPreview(null);
      setLogoKey(null);
      setRemoveLogo(false);
      setLogoStatus("idle");
      setMessage({ type: "ok", text: "Cambios guardados. Tu catálogo público ya está actualizado." });
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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Section title="Agencia">
          <Field label="Nombre de la agencia" error={errors.name}>
            <input value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} autoComplete="organization" />
          </Field>

          <Field label="Dirección web" error={errors.slug}>
            <div className="flex items-stretch">
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                maxLength={30}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`${INPUT_CLASS} min-w-0 border-r-0`}
              />
              <span className="flex items-center border border-neutral-200 bg-neutral-100 px-3 text-sm font-semibold dark:border-white/10 dark:bg-neutral-900 rounded-xl">
                .{rootDomain}
              </span>
            </div>
          </Field>
          {slugChanged ? (
            <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm font-semibold ${slugColor}`}>
              {slugState.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {slugState.status === "available" ? <Check className="h-4 w-4" /> : null}
              {slugState.status === "available" ? "¡Disponible! Al guardar, la dirección anterior deja de funcionar." : slugState.message}
            </p>
          ) : null}
          {customDomain ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Dominio propio activo: <strong>{customDomain}</strong>. Para cambiarlo, escribinos.
            </p>
          ) : null}
        </Section>

        <Section title="Contacto">
          <Field
            label="WhatsApp comercial"
            error={errors.whatsappNumber}
            hint={normalizedWhatsapp ? `Se guarda como ${normalizedWhatsapp}` : "Formato internacional: +54 9 11 5555 1234"}
          >
            <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} type="tel" inputMode="tel" className={INPUT_CLASS} />
          </Field>
          <Field label="Ciudad" error={errors.city}>
            <input value={city} onChange={(event) => setCity(event.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Dirección del local (opcional)" error={errors.address}>
            <input value={address} onChange={(event) => setAddress(event.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Instagram (opcional)" error={errors.instagramHandle}>
            <input value={instagram} onChange={(event) => setInstagram(event.target.value)} autoCapitalize="none" autoCorrect="off" className={INPUT_CLASS} placeholder="@miagencia" />
          </Field>
        </Section>

        <Section title="Marca">
          <div className="space-y-2">
            <span className="block text-sm font-medium">Logo</span>
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-neutral-200 bg-white dark:border-white/10 rounded-xl">
                {displayedLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayedLogo} alt="Logo" className="h-full w-full object-contain p-1" />
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
                  {logoStatus === "processing" ? "Optimizando…" : logoStatus === "uploading" ? `Subiendo ${logoProgress}%` : displayedLogo ? "Cambiar logo" : "Subir logo"}
                </button>
                {displayedLogo && !logoBusy ? (
                  <button type="button" onClick={discardLogo} className="flex h-10 items-center gap-1 text-sm font-semibold text-red-600">
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
            {errors.logoKey ? <p className="text-sm font-medium text-red-600">{errors.logoKey}</p> : null}
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
              <input value={color} onChange={(event) => setColor(event.target.value.trim())} maxLength={7} spellCheck={false} className={INPUT_CLASS} aria-label="Código de color" />
            </div>
            {errors.primaryColor ? <p className="text-sm font-medium text-red-600">{errors.primaryColor}</p> : null}
          </div>
        </Section>

        <Section title="Notificaciones">
          <button
            type="button"
            role="switch"
            aria-checked={notifyNewLeads}
            onClick={() => setNotifyNewLeads((value) => !value)}
            className={`flex h-12 w-full items-center justify-between border px-4 text-base font-semibold ${
              notifyNewLeads
                ? "border-transparent bg-neutral-900 text-white dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                : "border-neutral-200 dark:border-white/10"
            } rounded-xl`}
          >
            <span>Avisarme por email cuando entra una consulta</span>
            <span>{notifyNewLeads ? "Sí" : "No"}</span>
          </button>
          {notifyNewLeads ? (
            <Field label="Enviar a (opcional)" error={errors.notifyEmail} hint="Si lo dejás vacío, el aviso le llega a los dueños de la agencia.">
              <input value={notifyEmail} onChange={(event) => setNotifyEmail(event.target.value)} type="email" inputMode="email" className={INPUT_CLASS} placeholder="ventas@miagencia.com" />
            </Field>
          ) : null}
        </Section>

        {message ? (
          <p role={message.type === "error" ? "alert" : "status"} className={`text-sm font-semibold ${message.type === "error" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
            {message.text}
          </p>
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={pending || logoBusy || !colorValid || (slugChanged && slugState.status === "checking")}
          className="flex h-12 w-full items-center justify-center gap-2 border border-transparent bg-neutral-900 text-base font-semibold text-white disabled:opacity-50 dark:border-transparent dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-xl"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Guardar cambios
        </button>
      </div>

      <aside className="space-y-3" aria-label="Vista previa">
        <p className="text-sm font-semibold uppercase tracking-wider">Así se ve tu catálogo</p>
        <CatalogPreview name={name} logoUrl={displayedLogo} color={color} city={city} hasWhatsapp={normalizedWhatsapp !== null} />
      </aside>
    </div>
  );
}
