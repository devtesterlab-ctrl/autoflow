import "server-only";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { SYSTEM_STATUS_TAG } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createPresignedUpload, deleteObjects, getR2Bucket, getR2Client } from "@/lib/r2";
import {
  worstLight,
  type CheckResult,
  type Light,
  type SystemStatus,
  type UploadTestResult,
} from "@/lib/system-status-types";

const TIMEOUT_MS = 6000;
const GROUPS = ["Plataforma", "Datos", "Imágenes", "Emails", "Seguridad"];
// WebP válido de 1x1 píxel: sirve para probar la subida real sin dejar basura.
const TINY_WEBP_BASE64 = "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

const has = (name: string) => Boolean(process.env[name]?.trim());
const isProd = () => process.env.NODE_ENV === "production";

function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Sin respuesta en ${Math.round(ms / 1000)} s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Mensaje corto y sin datos sensibles (se quitan URLs de conexión). */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "Error desconocido";
  const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
  return `${name}${error.message}`.replace(/postgres(ql)?:\/\/\S+/gi, "[url]").replace(/\s+/g, " ").slice(0, 180);
}

function check(
  id: string,
  group: string,
  label: string,
  status: Light,
  summary: string,
  extra: Partial<CheckResult> = {},
): CheckResult {
  return { id, group, label, status, summary, ...extra };
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const started = Date.now();
  const value = await withTimeout(fn());
  return { value, ms: Date.now() - started };
}

// ---------------------------------------------------------------- Plataforma
function checkRuntime(): CheckResult {
  const onVercel = Boolean(process.env.VERCEL);
  if (!onVercel) {
    return check("vercel-runtime", "Plataforma", "Vercel (hosting)", "off", "Corriendo fuera de Vercel (modo local)", {
      hint: "Es lo esperado en tu computadora. En producción este indicador tiene que estar en verde.",
    });
  }
  const env = process.env.VERCEL_ENV ?? "desconocido";
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  return check(
    "vercel-runtime",
    "Plataforma",
    "Vercel (hosting)",
    env === "production" ? "ok" : "warn",
    `Entorno ${env} · región ${process.env.VERCEL_REGION ?? "—"}${sha ? ` · versión ${sha}` : ""}`,
    env === "production" ? {} : { hint: "Estás en un despliegue de prueba, no en el de producción." },
  );
}

async function checkVercelApi(): Promise<CheckResult[]> {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId) {
    return [
      check("vercel-api", "Plataforma", "Vercel: dominios y despliegues", "off", "Opcional: sin configurar", {
        hint: "Agregá VERCEL_API_TOKEN y VERCEL_PROJECT_ID para ver el estado de tus dominios y del último despliegue.",
      }),
    ];
  }

  const qs = (...parts: string[]) => {
    const joined = parts.filter(Boolean).join("&");
    return joined ? `?${joined}` : "";
  };
  const team = teamId ? `teamId=${encodeURIComponent(teamId)}` : "";
  const get = async (path: string) => {
    const response = await fetch(`https://api.vercel.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: response.status, body: response.ok ? ((await response.json()) as unknown) : null };
  };

  try {
    const id = encodeURIComponent(projectId);
    const [domainsRes, deployRes] = await Promise.all([
      get(`/v9/projects/${id}/domains${qs(team)}`),
      get(`/v6/deployments${qs(team, `projectId=${id}`, "target=production", "limit=1")}`),
    ]);

    if (domainsRes.status === 401 || domainsRes.status === 403) {
      return [
        check("vercel-api", "Plataforma", "Vercel: dominios y despliegues", "error", "Vercel rechazó el token", {
          hint: "Creá uno nuevo en Vercel > Account Settings > Tokens (con acceso a tu equipo) y actualizá VERCEL_API_TOKEN.",
        }),
      ];
    }
    if (domainsRes.status === 404) {
      return [
        check("vercel-api", "Plataforma", "Vercel: dominios y despliegues", "error", "No se encontró el proyecto", {
          hint: "Revisá VERCEL_PROJECT_ID (Project Settings > General) y, si usás un equipo, VERCEL_TEAM_ID.",
        }),
      ];
    }

    const domains =
      (domainsRes.body as { domains?: { name?: string; verified?: boolean }[] } | null)?.domains ?? [];
    const own = domains.filter((domain) => domain.name && !domain.name.startsWith("*") && !domain.name.endsWith(".vercel.app"));
    const unverified = domains.filter((domain) => domain.verified === false).map((domain) => domain.name);
    const configs = await Promise.all(
      own.slice(0, 4).map(async (domain) => {
        try {
          const response = await get(`/v6/domains/${encodeURIComponent(domain.name as string)}/config${qs(team)}`);
          return { name: domain.name as string, misconfigured: (response.body as { misconfigured?: boolean } | null)?.misconfigured };
        } catch {
          return { name: domain.name as string, misconfigured: undefined };
        }
      }),
    );
    const misconfigured = configs.filter((config) => config.misconfigured === true).map((config) => config.name);

    const domainCheck =
      unverified.length > 0
        ? check("vercel-domains", "Plataforma", "Dominios en Vercel", "warn", `Sin verificar: ${unverified.join(", ")}`, {
            hint: "Revisá los registros DNS que pide Vercel en Settings > Domains.",
          })
        : misconfigured.length > 0
          ? check("vercel-domains", "Plataforma", "Dominios en Vercel", "warn", `DNS mal apuntado: ${misconfigured.join(", ")}`, {
              hint: "El dominio no apunta a Vercel todavía (o los nameservers no propagaron).",
            })
          : check(
              "vercel-domains",
              "Plataforma",
              "Dominios en Vercel",
              "ok",
              own.length === 0 ? "Solo la dirección de Vercel (sin dominio propio)" : `${own.length} dominio(s) correctos: ${own.map((d) => d.name).join(", ")}`,
            );

    const deployment = (deployRes.body as { deployments?: { readyState?: string; state?: string }[] } | null)?.deployments?.[0];
    const state = (deployment?.readyState ?? deployment?.state ?? "").toUpperCase();
    const deployCheck =
      state === "READY"
        ? check("vercel-deploy", "Plataforma", "Último despliegue", "ok", "Publicado correctamente (READY)")
        : state === "ERROR" || state === "CANCELED"
          ? check("vercel-deploy", "Plataforma", "Último despliegue", "error", `Falló (${state})`, {
              hint: "Abrí Deployments en Vercel y revisá el log del build.",
            })
          : state
            ? check("vercel-deploy", "Plataforma", "Último despliegue", "warn", `En curso (${state})`)
            : check("vercel-deploy", "Plataforma", "Último despliegue", "warn", "No se pudo leer el estado");

    return [domainCheck, deployCheck];
  } catch (error) {
    return [
      check("vercel-api", "Plataforma", "Vercel: dominios y despliegues", "error", "No se pudo consultar la API de Vercel", {
        hint: describeError(error),
      }),
    ];
  }
}

function checkConfig(): CheckResult[] {
  const out: CheckResult[] = [];
  const core = ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "AUTH_TRUST_HOST", "NEXT_PUBLIC_ROOT_DOMAIN"];
  const missing = core.filter((name) => !has(name));
  const weakSecret = has("AUTH_SECRET") && (process.env.AUTH_SECRET ?? "").length < 32;

  if (missing.length > 0) {
    out.push(
      check("env-core", "Plataforma", "Variables esenciales", "error", `Faltan: ${missing.join(", ")}`, {
        hint: "Cargalas en Vercel > Settings > Environment Variables y volvé a desplegar.",
      }),
    );
  } else if (weakSecret) {
    out.push(
      check("env-core", "Plataforma", "Variables esenciales", "warn", "AUTH_SECRET es demasiado corto", {
        hint: "Generá uno de 32 bytes: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\".",
      }),
    );
  } else {
    out.push(check("env-core", "Plataforma", "Variables esenciales", "ok", "Todas cargadas"));
  }

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? "";
  const single = process.env.SINGLE_TENANT_HOSTS?.trim();
  if (single) {
    out.push(
      has("NEXT_PUBLIC_APP_ORIGIN")
        ? check("domain", "Plataforma", "Dirección del catálogo", "ok", `Modo una agencia: ${single}`)
        : check("domain", "Plataforma", "Dirección del catálogo", "warn", `Modo una agencia: ${single}`, {
            hint: "Falta NEXT_PUBLIC_APP_ORIGIN: los links de los emails apuntarían a una dirección que no existe.",
          }),
    );
  } else if (!root || root.includes("localhost")) {
    out.push(
      check(
        "domain",
        "Plataforma",
        "Dirección del catálogo",
        isProd() ? "error" : "off",
        isProd() ? "NEXT_PUBLIC_ROOT_DOMAIN apunta a localhost" : "Modo local (localhost)",
        isProd() ? { hint: "Poné tu dominio (sin https://) o usá SINGLE_TENANT_HOSTS con la dirección de Vercel, y volvé a desplegar." } : {},
      ),
    );
  } else {
    out.push(check("domain", "Plataforma", "Dirección del catálogo", "ok", `Catálogos en *.${root}`));
  }
  return out;
}

// --------------------------------------------------------------------- Datos
async function checkDatabase(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  try {
    const { ms } = await timed(() => prisma.$queryRaw`SELECT 1`);
    out.push(
      check(
        "db-connection",
        "Datos",
        "Base de datos (PostgreSQL)",
        ms > 2000 ? "warn" : "ok",
        ms > 2000 ? `Responde lento (${ms} ms)` : `Conectada · ${ms} ms`,
        { latencyMs: ms, ...(ms > 2000 ? { hint: "Revisá que la base y Vercel estén en la misma región (São Paulo)." } : {}) },
      ),
    );
  } catch (error) {
    return [
      check("db-connection", "Datos", "Base de datos (PostgreSQL)", "error", "No se puede conectar", {
        hint: `Revisá DATABASE_URL y que la base esté activa en Neon. Detalle: ${describeError(error)}`,
      }),
    ];
  }

  try {
    const columns = await withTimeout(
      prisma.$queryRaw<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'tenants' AND column_name IN ('notifyNewLeads','notifyEmail','onboardingCompleted')) OR (table_name = 'users' AND column_name = 'sessionVersion'))`,
    );
    const tables = await withTimeout(
      prisma.$queryRaw<{ a: boolean; b: boolean }[]>`SELECT to_regclass('public.password_reset_tokens') IS NOT NULL AS a, to_regclass('public.admin_audit_logs') IS NOT NULL AS b`,
    );

    const problems: string[] = [];
    if ((columns[0]?.c ?? 0) < 4) problems.push("columnas de las últimas versiones");
    if (!tables[0]?.a || !tables[0]?.b) problems.push("tablas nuevas");

    let migrations = "";
    let failed = 0;
    try {
      const rows = await withTimeout(
        prisma.$queryRaw<{ applied: number; failed: number; last: string | null }[]>`SELECT COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::int AS applied, COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS failed, MAX(migration_name) AS last FROM _prisma_migrations`,
      );
      failed = rows[0]?.failed ?? 0;
      migrations = ` · ${rows[0]?.applied ?? 0} migración(es), última ${rows[0]?.last ?? "—"}`;
    } catch {
      migrations = " · sin historial de migraciones";
    }

    if (problems.length > 0) {
      out.push(
        check("db-schema", "Datos", "Esquema de la base", "error", `Faltan ${problems.join(" y ")}`, {
          hint: "Aplicá las migraciones a esta base: npm run db:deploy (guía de producción, sección 5).",
        }),
      );
    } else if (failed > 0) {
      out.push(check("db-schema", "Datos", "Esquema de la base", "warn", `Hay migraciones fallidas${migrations}`));
    } else {
      out.push(check("db-schema", "Datos", "Esquema de la base", "ok", `Al día${migrations}`));
    }
  } catch (error) {
    out.push(check("db-schema", "Datos", "Esquema de la base", "warn", "No se pudo verificar", { hint: describeError(error) }));
  }
  return out;
}

// ------------------------------------------------------------------ Imágenes
const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"];

function r2ConfigProblems(): string[] {
  const problems = R2_VARS.filter((name) => !has(name)).map((name) => `falta ${name}`);
  const url = process.env.R2_PUBLIC_URL?.trim();
  if (url) {
    if (!/^https:\/\//.test(url)) problems.push("R2_PUBLIC_URL debe empezar con https://");
    if (url.endsWith("/")) problems.push("R2_PUBLIC_URL no debe terminar en /");
  }
  const account = process.env.R2_ACCOUNT_ID?.trim();
  if (account && !/^[a-f0-9]{32}$/i.test(account)) problems.push("R2_ACCOUNT_ID debería tener 32 caracteres hexadecimales");
  return problems;
}

function r2Hint(code: string): string {
  switch (code) {
    case "InvalidAccessKeyId":
      return "El Access Key ID es incorrecto: copiá de nuevo las credenciales del token de R2.";
    case "SignatureDoesNotMatch":
      return "La clave secreta no coincide (R2_SECRET_ACCESS_KEY). Si las credenciales están bien, quitá la línea ContentLength de lib/r2.ts.";
    case "AccessDenied":
      return "El token no tiene permiso sobre este bucket: creá uno con «Object Read & Write» limitado a este bucket.";
    case "NoSuchBucket":
      return "No existe un bucket con ese nombre: revisá R2_BUCKET y R2_ACCOUNT_ID.";
    default:
      return "Revisá R2_ACCOUNT_ID, las credenciales y el nombre del bucket.";
  }
}

async function checkR2(origin: string | null): Promise<CheckResult[]> {
  const problems = r2ConfigProblems();
  if (problems.length > 0) {
    return [
      check("r2-config", "Imágenes", "Cloudflare R2: configuración", "error", problems.join(" · "), {
        hint: "Cargá las variables R2_* en Vercel (Settings > Environment Variables) y volvé a desplegar.",
      }),
    ];
  }

  const out: CheckResult[] = [check("r2-config", "Imágenes", "Cloudflare R2: configuración", "ok", "Variables completas")];

  const [api, publicUrl, cors] = await Promise.all([
    (async (): Promise<CheckResult> => {
      try {
        const { ms } = await timed(() => getR2Client().send(new ListObjectsV2Command({ Bucket: getR2Bucket(), MaxKeys: 1 })));
        return check("r2-api", "Imágenes", "Cloudflare R2: acceso al bucket", "ok", `Credenciales válidas · ${ms} ms`, { latencyMs: ms });
      } catch (error) {
        const code = (error as { name?: string }).name ?? "";
        return check("r2-api", "Imágenes", "Cloudflare R2: acceso al bucket", "error", describeError(error), { hint: r2Hint(code) });
      }
    })(),
    (async (): Promise<CheckResult> => {
      try {
        const response = await fetch(`${process.env.R2_PUBLIC_URL?.trim()}/__estado`, {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return check("r2-public", "Imágenes", "Dirección pública de las fotos", "ok", `Responde (HTTP ${response.status}; 404 es normal sin archivo)`, {
          hint: "Para confirmar que las fotos se ven, usá «Probar subida de fotos».",
        });
      } catch {
        return check("r2-public", "Imágenes", "Dirección pública de las fotos", "error", "La dirección no responde", {
          hint: "Activá «Public Development URL» en el bucket (o conectá tu dominio) y revisá R2_PUBLIC_URL.",
        });
      }
    })(),
    checkCors(origin),
  ]);

  return [...out, api, publicUrl, cors];
}

/** Simula el "preflight" que hace el navegador antes de subir una foto: si R2 no lo autoriza, la subida falla. */
async function checkCors(origin: string | null): Promise<CheckResult> {
  const label = "Permiso del navegador para subir (CORS)";
  if (!origin) {
    return check("r2-cors", "Imágenes", label, "warn", "No se pudo determinar el origen de la página");
  }
  try {
    const { uploadUrl } = await createPresignedUpload({ tenantId: "_estado", vehicleId: "prueba", size: 1 });
    const response = await fetch(uploadUrl, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type,cache-control",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const allowOrigin = response.headers.get("access-control-allow-origin");
    const allowMethods = response.headers.get("access-control-allow-methods") ?? "";
    const allowHeaders = (response.headers.get("access-control-allow-headers") ?? "").toLowerCase();

    const originOk = allowOrigin === "*" || allowOrigin === origin;
    const methodOk = /PUT/i.test(allowMethods);
    const headersOk = allowHeaders === "*" || (allowHeaders.includes("content-type") && allowHeaders.includes("cache-control"));

    if (originOk && methodOk && headersOk) {
      return check("r2-cors", "Imágenes", label, "ok", `Autorizado desde ${origin}`);
    }
    const missing = [!originOk && `el origen ${origin}`, !methodOk && "el método PUT", !headersOk && "los encabezados content-type y cache-control"]
      .filter(Boolean)
      .join(", ");
    return check("r2-cors", "Imágenes", label, "error", `El bucket no permite ${missing}`, {
      hint: `En Cloudflare > R2 > tu bucket > Settings > CORS Policy: AllowedOrigins ["${origin}"], AllowedMethods ["PUT"], AllowedHeaders ["content-type","cache-control"].`,
    });
  } catch (error) {
    return check("r2-cors", "Imágenes", label, "warn", "No se pudo simular la prueba desde el servidor", {
      hint: `Probá subir una foto: si falla en el navegador, revisá el CORS del bucket. Detalle: ${describeError(error)}`,
    });
  }
}

// -------------------------------------------------------------------- Emails
async function checkEmail(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "";

  if (!key) {
    return check(
      "email",
      "Emails",
      "Emails (Resend)",
      isProd() ? "warn" : "off",
      isProd() ? "Sin RESEND_API_KEY: los emails no se envían" : "Modo desarrollo: los emails se imprimen en la terminal",
      isProd() ? { hint: "Sin esto no funcionan la recuperación de contraseña ni los avisos de leads." } : {},
    );
  }

  const fromDomain = (from.match(/@([^>\s]+)/)?.[1] ?? "").toLowerCase();
  if (!from) return check("email", "Emails", "Emails (Resend)", "warn", "Falta EMAIL_FROM", { hint: "Ejemplo: AutoFlow <no-reply@tudominio.com>" });
  if (fromDomain === "resend.dev") {
    return check("email", "Emails", "Emails (Resend)", "warn", "Remitente de prueba (resend.dev)", {
      hint: "Resend solo entrega al email dueño de tu cuenta. Verificá tu dominio y usalo en EMAIL_FROM.",
    });
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as { name?: string };
      return body.name === "restricted_api_key"
        ? check("email", "Emails", "Emails (Resend)", "ok", "Clave de solo envío (el dominio no se puede verificar desde acá)", {
            hint: "Usá «Enviar email de prueba» para confirmar que llega.",
          })
        : check("email", "Emails", "Emails (Resend)", "error", "Resend rechazó la clave", {
            hint: "Creá una nueva en resend.com > API Keys y actualizá RESEND_API_KEY.",
          });
    }
    if (!response.ok) return check("email", "Emails", "Emails (Resend)", "warn", `Resend respondió HTTP ${response.status}`);

    const data = ((await response.json()) as { data?: { name?: string; status?: string }[] }).data ?? [];
    const domain = data.find((item) => item.name?.toLowerCase() === fromDomain);
    if (!domain) {
      return check("email", "Emails", "Emails (Resend)", "warn", `El dominio ${fromDomain} no está en tu cuenta de Resend`, {
        hint: "Agregalo en resend.com > Domains y cargá los registros DNS.",
      });
    }
    return domain.status === "verified"
      ? check("email", "Emails", "Emails (Resend)", "ok", `Dominio ${fromDomain} verificado`)
      : check("email", "Emails", "Emails (Resend)", "warn", `Dominio ${fromDomain}: ${domain.status ?? "sin verificar"}`, {
          hint: "Cargá los registros DNS que indica Resend y apretá «Verify».",
        });
  } catch (error) {
    return check("email", "Emails", "Emails (Resend)", "warn", "No se pudo consultar Resend", { hint: describeError(error) });
  }
}

// ----------------------------------------------------------------- Seguridad
async function checkUpstash(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const label = "Límites de uso (Upstash)";

  if (!url || !token) {
    return check("upstash", "Seguridad", label, isProd() ? "warn" : "off", "Sin configurar: los límites funcionan por servidor", {
      hint: isProd() ? "En Vercel cada servidor cuenta por separado y el freno contra abusos es débil. Configurá UPSTASH_REDIS_REST_URL y _TOKEN." : "Opcional en desarrollo.",
    });
  }
  try {
    const { value, ms } = await timed(async () => {
      const response = await fetch(url.replace(/\/+$/, ""), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["PING"]),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return { status: response.status, body: (await response.json().catch(() => ({}))) as { result?: string } };
    });
    return value.body.result === "PONG"
      ? check("upstash", "Seguridad", label, "ok", `Responde · ${ms} ms`, { latencyMs: ms })
      : check("upstash", "Seguridad", label, "error", `Respuesta inesperada (HTTP ${value.status})`, {
          hint: "Revisá UPSTASH_REDIS_REST_URL y el token (pestaña REST API de tu base).",
        });
  } catch (error) {
    return check("upstash", "Seguridad", label, "error", "No responde", { hint: describeError(error) });
  }
}

function checkSecurityConfig(): CheckResult[] {
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim()).filter(Boolean).length;
  const out: CheckResult[] = [
    check("admins", "Seguridad", "Administradores de la plataforma", admins > 0 ? "ok" : "error", admins > 0 ? `${admins} configurado(s)` : "Ninguno configurado"),
  ];
  out.push(
    has("REGISTRATION_INVITE_CODE")
      ? check("registration", "Seguridad", "Registro de agencias", "ok", "Cerrado: se pide código de invitación")
      : check("registration", "Seguridad", "Registro de agencias", isProd() ? "warn" : "off", "Abierto: cualquiera puede crear una cuenta", {
          hint: isProd() ? "Definí REGISTRATION_INVITE_CODE para limitar el registro a tus invitados." : "Opcional en desarrollo.",
        }),
  );
  const legalMissing = ["NEXT_PUBLIC_LEGAL_ENTITY", "NEXT_PUBLIC_CONTACT_EMAIL"].filter((name) => !has(name));
  out.push(
    legalMissing.length === 0
      ? check("legal", "Seguridad", "Datos legales", "ok", "Titular y email de contacto cargados")
      : check("legal", "Seguridad", "Datos legales", isProd() ? "warn" : "off", `Faltan: ${legalMissing.join(", ")}`, {
          hint: "Aparecen en las páginas de términos y privacidad.",
        }),
  );
  return out;
}

// ------------------------------------------------------------------- Armado
async function requestOrigin(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (/^localhost|\.localhost/.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

async function runSystemChecks(origin: string | null): Promise<SystemStatus> {
  const settled = await Promise.all([
    Promise.resolve([checkRuntime(), ...checkConfig()]),
    checkVercelApi(),
    checkDatabase(),
    checkR2(origin),
    checkEmail().then((result) => [result]),
    checkUpstash().then((result) => [result, ...checkSecurityConfig()]),
  ]);

  const checks = settled.flat();
  const ordered = GROUPS.flatMap((group) => checks.filter((item) => item.group === group));
  return {
    checkedAt: new Date().toISOString(),
    overall: worstLight(ordered.map((item) => item.status)),
    groups: GROUPS,
    checks: ordered,
  };
}

/** Resultado guardado 5 minutos: abrir el panel muchas veces no consulta los servicios cada vez. */
export async function getSystemStatus(): Promise<SystemStatus> {
  const origin = await requestOrigin();
  return unstable_cache(() => runSystemChecks(origin), ["system-status", origin ?? "sin-origen"], {
    revalidate: 300,
    tags: [SYSTEM_STATUS_TAG],
  })();
}

/** Verificación inmediata (botón «Verificar ahora»). */
export async function runSystemChecksNow(): Promise<SystemStatus> {
  return runSystemChecks(await requestOrigin());
}

// ------------------------------------------------------------ Pruebas manuales
function uploadHint(code: string): string {
  switch (code) {
    case "SignatureDoesNotMatch":
      return "La firma no coincide. Revisá R2_SECRET_ACCESS_KEY; si está bien, en lib/r2.ts borrá la línea «ContentLength: params.size,».";
    case "AccessDenied":
    case "Unauthorized":
      return "El token de R2 no puede escribir en este bucket: creá uno con «Object Read & Write» sobre ese bucket.";
    case "InvalidAccessKeyId":
      return "El Access Key ID es incorrecto: copiá de nuevo las credenciales.";
    case "NoSuchBucket":
      return "No existe ese bucket: revisá R2_BUCKET y R2_ACCOUNT_ID.";
    default:
      return "Revisá las variables R2_* y los permisos del token.";
  }
}

/** Sube un WebP de 1x1 píxel como lo haría el navegador, lo lee por la dirección pública y lo borra. */
export async function runUploadTest(): Promise<UploadTestResult> {
  const problems = r2ConfigProblems();
  if (problems.length > 0) {
    return {
      ok: false,
      steps: [{ label: "Configuración", ok: false, detail: problems.join(" · ") }],
      hint: "Completá las variables R2_* en Vercel y volvé a desplegar.",
    };
  }

  const steps: UploadTestResult["steps"] = [];
  const bytes = new Uint8Array(Buffer.from(TINY_WEBP_BASE64, "base64"));
  let key: string | null = null;

  try {
    const presigned = await createPresignedUpload({ tenantId: "_estado", vehicleId: "prueba", size: bytes.length });
    key = presigned.key;
    steps.push({ label: "URL de subida firmada", ok: true, detail: "Generada correctamente" });

    const put = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: presigned.headers,
      body: bytes,
      signal: AbortSignal.timeout(10_000),
    });
    if (!put.ok) {
      const body = await put.text().catch(() => "");
      const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? `HTTP ${put.status}`;
      steps.push({ label: "Subida (PUT)", ok: false, detail: code });
      return { ok: false, steps, hint: uploadHint(code) };
    }
    steps.push({ label: "Subida (PUT)", ok: true, detail: "R2 aceptó el archivo" });

    const read = await fetch(presigned.publicUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!read.ok) {
      steps.push({ label: "Lectura por la dirección pública", ok: false, detail: `HTTP ${read.status}` });
      return {
        ok: false,
        steps,
        hint: "El archivo se sube, pero no se ve desde R2_PUBLIC_URL: activá «Public Development URL» en el bucket (o conectá tu dominio) y revisá la variable.",
      };
    }
    steps.push({ label: "Lectura por la dirección pública", ok: true, detail: "Las fotos se van a ver en el catálogo" });
    return { ok: true, steps };
  } catch (error) {
    steps.push({ label: "Error inesperado", ok: false, detail: describeError(error) });
    return { ok: false, steps, hint: "Revisá las variables R2_* y volvé a probar." };
  } finally {
    if (key) {
      await deleteObjects([key]);
      steps.push({ label: "Limpieza", ok: true, detail: "Archivo de prueba borrado" });
    }
  }
}

/** Envía un email real a quien lo pide: confirma de punta a punta que Resend funciona. */
export async function runEmailTest(to: string): Promise<{ ok: boolean; message: string }> {
  const sent = await sendEmail({
    to,
    subject: "Prueba de emails de AutoFlow",
    html: "<p>Si ves este mensaje, los emails de AutoFlow funcionan correctamente.</p>",
    text: "Si ves este mensaje, los emails de AutoFlow funcionan correctamente.",
  });
  if (!sent) {
    return {
      ok: false,
      message: "Resend rechazó el envío. Revisá RESEND_API_KEY, que el dominio de EMAIL_FROM esté verificado y los logs de Vercel.",
    };
  }
  return {
    ok: true,
    message: process.env.RESEND_API_KEY?.trim()
      ? `Enviado a ${to}. Revisá tu bandeja (y la carpeta de spam) en unos segundos.`
      : "Modo desarrollo: no hay RESEND_API_KEY, el email se imprimió en la terminal.",
  };
}
