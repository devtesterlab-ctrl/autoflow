"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";
import { saveVehicle } from "@/app/dashboard/vehicles/actions";
import { ImageUploader, type ImageItem } from "@/components/dashboard/ImageUploader";
import { Segmented } from "@/components/ui/segmented";
import {
  COMMON_BRANDS,
  CURRENCY_OPTIONS,
  FEATURE_SUGGESTIONS,
  FUEL_OPTIONS,
  STATUS_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "@/lib/vehicle-ui";
import {
  firstErrors,
  vehicleFormSchema,
  type CurrencyValue,
  type FuelValue,
  type StatusValue,
  type TransmissionValue,
} from "@/lib/validators/vehicle";

export interface VehicleFormInitial {
  brand: string;
  model: string;
  version: string;
  year: number;
  mileage: number;
  price: number;
  currency: CurrencyValue;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  color: string;
  description: string;
  features: string[];
  status: StatusValue;
  isFeatured: boolean;
  images: ImageItem[];
}

interface VehicleFormProps {
  vehicleId: string;
  mode: "create" | "edit";
  initial?: VehicleFormInitial;
  defaultStatus?: StatusValue;
}

interface FormValues {
  brand: string;
  model: string;
  version: string;
  year: string;
  mileage: string;
  price: string;
  currency: CurrencyValue;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  color: string;
  description: string;
  features: string[];
  status: StatusValue;
  isFeatured: boolean;
}

type SectionKey = "basic" | "price" | "specs" | "photos" | "detail";

const SECTION_OF_FIELD: Record<string, SectionKey> = {
  brand: "basic",
  model: "basic",
  version: "basic",
  year: "basic",
  mileage: "basic",
  price: "price",
  currency: "price",
  status: "price",
  isFeatured: "price",
  transmission: "specs",
  fuelType: "specs",
  color: "specs",
  images: "photos",
  description: "detail",
  features: "detail",
};

const INPUT_CLASS =
  "h-14 w-full border-2 border-black bg-transparent px-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30";

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const formatThousands = (value: string) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("es-AR") : "";
};
const toNumber = (value: string) => Number(digitsOnly(value) || "0");

function toFormValues(initial?: VehicleFormInitial, defaultStatus: StatusValue = "AVAILABLE"): FormValues {
  return {
    brand: initial?.brand ?? "",
    model: initial?.model ?? "",
    version: initial?.version ?? "",
    year: initial?.year ? String(initial.year) : "",
    mileage: initial ? formatThousands(String(initial.mileage)) : "",
    price: initial ? formatThousands(String(initial.price)) : "",
    currency: initial?.currency ?? "ARS",
    transmission: initial?.transmission ?? "MANUAL",
    fuelType: initial?.fuelType ?? "NAFTA",
    color: initial?.color ?? "",
    description: initial?.description ?? "",
    features: initial?.features ?? [],
    status: initial?.status ?? defaultStatus,
    isFeatured: initial?.isFeatured ?? false,
  };
}

function Section(props: {
  title: string;
  open: boolean;
  hasError: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-2 border-black dark:border-white">
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={props.open}
        className="flex h-14 w-full items-center justify-between px-4 text-left"
      >
        <span className="text-base font-extrabold">
          {props.title}
          {props.hasError ? <span className="ml-2 text-red-600">●</span> : null}
        </span>
        <ChevronDown className={`h-5 w-5 transition-transform ${props.open ? "rotate-180" : ""}`} />
      </button>
      {props.open ? (
        <div className="space-y-5 border-t-2 border-black p-4 dark:border-white">{props.children}</div>
      ) : null}
    </section>
  );
}

function Field(props: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{props.label}</span>
      {props.children}
      {props.error ? <span className="block text-sm font-semibold text-red-600">{props.error}</span> : null}
    </label>
  );
}

export function VehicleForm({ vehicleId, mode, initial, defaultStatus }: VehicleFormProps) {
  const router = useRouter();
  const [stableId] = useState(vehicleId);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial, defaultStatus));
  const [images, setImages] = useState<ImageItem[]>(initial?.images ?? []);
  const [featureDraft, setFeatureDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    basic: true,
    price: true,
    specs: false,
    photos: true,
    detail: false,
  });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const uploading = images.some((item) => item.status === "compressing" || item.status === "uploading");
  const sectionHasError = (section: SectionKey) =>
    Object.keys(errors).some((field) => SECTION_OF_FIELD[field] === section);

  function addFeature(raw: string) {
    const text = raw.trim();
    if (!text || values.features.length >= 30) return;
    if (values.features.some((feature) => feature.toLowerCase() === text.toLowerCase())) return;
    set("features", [...values.features, text.slice(0, 40)]);
    setFeatureDraft("");
  }

  function showErrors(found: Record<string, string>) {
    setErrors(found);
    setOpen((previous) => {
      const next = { ...previous };
      for (const field of Object.keys(found)) {
        const section = SECTION_OF_FIELD[field];
        if (section) next[section] = true;
      }
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      id: stableId,
      brand: values.brand,
      model: values.model,
      version: values.version,
      year: toNumber(values.year),
      mileage: toNumber(values.mileage),
      price: toNumber(values.price),
      currency: values.currency,
      transmission: values.transmission,
      fuelType: values.fuelType,
      color: values.color,
      description: values.description,
      features: values.features,
      status: values.status,
      isFeatured: values.isFeatured,
      images: images
        .filter((item) => item.status === "done" && item.key)
        .map((item) => ({ key: item.key as string, isCover: item.isCover })),
    };

    const parsed = vehicleFormSchema.safeParse(payload);
    if (!parsed.success) {
      showErrors(firstErrors(parsed.error));
      setFormError("Revisá los campos marcados.");
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await saveVehicle(parsed.data);
      if (!result.ok) {
        showErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      router.push("/dashboard/vehicles");
      router.refresh();
    });
  }

  const unusedSuggestions = FEATURE_SUGGESTIONS.filter(
    (suggestion) => !values.features.some((feature) => feature.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Section
        title="1. Datos del auto"
        open={open.basic}
        hasError={sectionHasError("basic")}
        onToggle={() => setOpen((previous) => ({ ...previous, basic: !previous.basic }))}
      >
        <Field label="Marca" error={errors.brand}>
          <input
            list="brand-options"
            value={values.brand}
            onChange={(event) => set("brand", event.target.value)}
            autoComplete="off"
            className={INPUT_CLASS}
            placeholder="Toyota"
          />
          <datalist id="brand-options">
            {COMMON_BRANDS.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </Field>
        <Field label="Modelo" error={errors.model}>
          <input
            value={values.model}
            onChange={(event) => set("model", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Corolla"
          />
        </Field>
        <Field label="Versión (opcional)" error={errors.version}>
          <input
            value={values.version}
            onChange={(event) => set("version", event.target.value)}
            className={INPUT_CLASS}
            placeholder="XEI 2.0 CVT"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Año" error={errors.year}>
            <input
              value={values.year}
              onChange={(event) => set("year", digitsOnly(event.target.value).slice(0, 4))}
              inputMode="numeric"
              className={INPUT_CLASS}
              placeholder="2021"
            />
          </Field>
          <Field label="Kilómetros" error={errors.mileage}>
            <input
              value={values.mileage}
              onChange={(event) => set("mileage", formatThousands(event.target.value))}
              inputMode="numeric"
              className={INPUT_CLASS}
              placeholder="48.500"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="2. Precio y estado"
        open={open.price}
        hasError={sectionHasError("price")}
        onToggle={() => setOpen((previous) => ({ ...previous, price: !previous.price }))}
      >
        <Segmented
          label="Moneda"
          value={values.currency}
          options={CURRENCY_OPTIONS}
          onChange={(value) => set("currency", value)}
        />
        <Field label="Precio" error={errors.price}>
          <input
            value={values.price}
            onChange={(event) => set("price", formatThousands(event.target.value))}
            inputMode="numeric"
            className={INPUT_CLASS}
            placeholder={values.currency === "USD" ? "22.900" : "18.500.000"}
          />
        </Field>
        <Segmented
          label="Estado"
          value={values.status}
          options={STATUS_OPTIONS}
          columns={4}
          onChange={(value) => set("status", value)}
        />
        <button
          type="button"
          aria-pressed={values.isFeatured}
          onClick={() => set("isFeatured", !values.isFeatured)}
          className={`flex h-14 w-full items-center justify-between border-2 px-4 text-base font-bold ${
            values.isFeatured
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-black/30 dark:border-white/30"
          }`}
        >
          <span>Destacar en el catálogo</span>
          <span>{values.isFeatured ? "Sí" : "No"}</span>
        </button>
      </Section>

      <Section
        title="3. Ficha técnica"
        open={open.specs}
        hasError={sectionHasError("specs")}
        onToggle={() => setOpen((previous) => ({ ...previous, specs: !previous.specs }))}
      >
        <Segmented
          label="Transmisión"
          value={values.transmission}
          options={TRANSMISSION_OPTIONS}
          onChange={(value) => set("transmission", value)}
        />
        <Segmented
          label="Combustible"
          value={values.fuelType}
          options={FUEL_OPTIONS}
          columns={3}
          onChange={(value) => set("fuelType", value)}
        />
        <Field label="Color (opcional)" error={errors.color}>
          <input
            value={values.color}
            onChange={(event) => set("color", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Gris plata"
          />
        </Field>
      </Section>

      <Section
        title="4. Fotos"
        open={open.photos}
        hasError={sectionHasError("photos")}
        onToggle={() => setOpen((previous) => ({ ...previous, photos: !previous.photos }))}
      >
        <ImageUploader vehicleId={stableId} images={images} onChange={setImages} disabled={pending} />
        {errors.images ? <p className="text-sm font-semibold text-red-600">{errors.images}</p> : null}
      </Section>

      <Section
        title="5. Equipamiento y descripción"
        open={open.detail}
        hasError={sectionHasError("detail")}
        onToggle={() => setOpen((previous) => ({ ...previous, detail: !previous.detail }))}
      >
        <div className="space-y-2">
          <span className="block text-sm font-semibold">Equipamiento</span>
          {values.features.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {values.features.map((feature) => (
                <li key={feature}>
                  <button
                    type="button"
                    onClick={() => set("features", values.features.filter((item) => item !== feature))}
                    className="flex h-10 items-center gap-1 border-2 border-black bg-black px-3 text-sm font-bold text-white dark:border-white dark:bg-white dark:text-black"
                  >
                    {feature} <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <input
              value={featureDraft}
              onChange={(event) => setFeatureDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addFeature(featureDraft);
                }
              }}
              className={INPUT_CLASS}
              placeholder="Escribí y tocá +"
            />
            <button
              type="button"
              aria-label="Agregar equipamiento"
              onClick={() => addFeature(featureDraft)}
              className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-black dark:border-white"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {unusedSuggestions.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {unusedSuggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => addFeature(suggestion)}
                    className="h-10 border-2 border-black/30 px-3 text-sm font-semibold dark:border-white/30"
                  >
                    + {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {errors.features ? <p className="text-sm font-semibold text-red-600">{errors.features}</p> : null}
        </div>

        <Field label="Descripción (opcional)" error={errors.description}>
          <textarea
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            rows={4}
            className="w-full border-2 border-black bg-transparent p-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30"
            placeholder="Único dueño, service oficial al día…"
          />
        </Field>
      </Section>

      <div className="sticky bottom-20 z-10 space-y-2 border-2 border-black bg-white p-3 md:bottom-4 dark:border-white dark:bg-neutral-950">
        {formError ? (
          <p role="alert" className="text-sm font-bold text-red-600">
            {formError}
          </p>
        ) : null}
        {uploading ? <p className="text-sm font-semibold">Esperá a que terminen de subir las fotos…</p> : null}
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Link
            href="/dashboard/vehicles"
            className="flex h-14 items-center justify-center border-2 border-black text-base font-bold dark:border-white"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={pending || uploading}
            className="flex h-14 items-center justify-center gap-2 border-2 border-black bg-black text-lg font-extrabold text-white disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {mode === "create" ? "Publicar auto" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
