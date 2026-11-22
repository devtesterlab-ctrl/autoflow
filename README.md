# AutoFlow

SaaS multi-tenant para agencias de autos usados: catálogo web propio por agencia (subdominio o dominio propio) + mini-CRM de interesados, placa para historias de Instagram, planes con límites y panel de administración de la plataforma.

**Stack:** Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS 4 · Prisma 6 + PostgreSQL · Auth.js v5 · Cloudflare R2 · Resend · Upstash Redis.

## Requisitos
- Node.js 20 o superior
- Una base PostgreSQL (por ejemplo, un proyecto gratuito en neon.tech)

## Primeros pasos (desarrollo)
```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```
Completá en `.env` como mínimo:
- `DATABASE_URL` y `DIRECT_URL`: la cadena de conexión de tu base (en desarrollo, la misma en las dos)
- `AUTH_SECRET`: generalo con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Después:
```bash
npx prisma migrate dev --name init
npm run db:seed             # agencias de demostración
npm run test:isolation      # verifica el aislamiento entre agencias
npx tsc --noEmit            # chequeo de tipos
npm run dev
```

## Probar en local
Usá Chrome, Edge o Firefox (resuelven `*.localhost`):

| URL | Qué ves |
|---|---|
| `http://localhost:3000` | Portada |
| `http://app.localhost:3000` | Panel (login: `owner@palermoautos.demo` / `demo1234`) |
| `http://palermo-autos.localhost:3000` | Catálogo de Palermo Autos |
| `http://sur-motors.localhost:3000` | Catálogo de Sur Motors |

Para subir fotos hace falta Cloudflare R2 configurado (variables `R2_*`). Sin `RESEND_API_KEY`, los emails (recuperar contraseña, aviso de lead) se imprimen en la terminal.

Para entrar a `/admin`, poné tu email en `PLATFORM_ADMIN_EMAILS`.

## Producción
Antes de subir: `npm run build` tiene que terminar sin errores. La guía completa (Vercel, Neon, R2, Upstash, Resend, dominios) está en el documento «AutoFlow — Guía de puesta en producción».

Las migraciones de producción se aplican con `npm run db:deploy` (nunca `db:seed` ni `migrate dev` contra producción).

## Estructura
- `app/` rutas: panel (`dashboard`), catálogo público (`sites/[domain]`), administración (`admin`), autenticación y APIs
- `components/` interfaz del panel, del catálogo, ajustes y administración
- `lib/` lógica compartida: sesión, aislamiento por agencia (`db.ts`), planes, caché, emails, límites de uso
- `prisma/` esquema y datos de demostración
- `scripts/` verificación de aislamiento entre agencias
- `docs/` auditoría de seguridad
