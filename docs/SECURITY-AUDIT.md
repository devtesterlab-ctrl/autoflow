# Auditoría de seguridad y performance (Etapas 1 a 5)

## Aislamiento entre agencias (IDOR)
| Control | Dónde | Estado |
|---|---|---|
| El `tenantId` sale de la sesión firmada, nunca de body, params, query ni headers | `lib/session.ts` | OK |
| Revalidación en cada request: usuario existe, pertenece al tenant y la agencia está activa | `getAuthenticatedTenant()` | Reforzado en Etapa 5 |
| Rol leído de la base, no del JWT | `getAuthenticatedTenant()` / `getOwnerTenant()` | Nuevo |
| `tenantId` forzado en todo where/create de Vehicle, VehicleImage, Lead, Activity | `tenantDb()` | OK |
| `x-tenant-id` entrante siempre se descarta | `middleware.ts` | OK |
| Keys de R2 validadas contra el prefijo del tenant (fotos y logo) | `saveVehicle`, `completeOnboarding`, `deleteUploadedObject` | OK |
| Prueba automática de aislamiento contra la base | `npm run test:isolation` | Nuevo |

Límites conocidos de `tenantDb`: las lecturas anidadas (`include`/`select` de relaciones) heredan el filtro del padre pero no se filtran solas, y `$queryRaw` no pasa por la extensión. Regla del proyecto: no usar SQL crudo sin filtrar por tenant.

Usos de `prisma` directo permitidos (modelos sin scope o con verificación explícita): `auth.ts` (login), `lib/tenant.ts` (resolución pública), `register`, `onboarding` (siempre `where: { id: tenantId de la sesión }`), `/api/upload/presigned` (chequea que el vehículo no sea de otra agencia) y `lib/plan-limits.ts` (conteo de usuarios). Para auditarlo:

```bash
grep -rn "prisma\." app lib components --include=*.ts --include=*.tsx | grep -v "tenantDb"
```

## Abuso y fuerza bruta
- Login: 8 intentos cada 15 min por IP + email (nuevo).
- Registro: 5 por hora por IP, y código de invitación opcional (`REGISTRATION_INVITE_CODE`) para el lanzamiento cerrado (nuevo).
- Lead público del catálogo: honeypot + 5 consultas cada 10 min por IP y agencia.
- Verificación de slug: 40 por minuto por usuario.
- Los límites viven en memoria de cada instancia. Con varias instancias (Vercel) migrar `lib/rate-limit.ts` a Upstash/Redis.

## Entrada y salida
- Zod en todos los formularios y server actions; los endpoints validan tipo, tamaño y expiración (2 min) de las URLs firmadas.
- Color de marca validado como `#RRGGBB` antes de inyectarlo en CSS; slug con lista de reservados.
- Proxy de imágenes y OG: solo orígenes permitidos (R2 público; picsum fuera de producción) para evitar SSRF.
- `getTenantByDomain` ya no rompe con `%` mal formado en el host.
- Cabeceras de seguridad en `next.config.ts` (nosniff, frame deny, referrer, permissions, HSTS). Pendiente: Content-Security-Policy con nonces.

## Performance y caché
- Catálogo y fichas: datos cacheados con `unstable_cache` y tags `tenant:{id}` y `domain:{host}`; el HTML se sirve estático hasta que cambia algo.
- Se regenera con `invalidateTenantCatalog()` al guardar, borrar o cambiar el estado de un auto, al cerrar un lead como ganado y al completar el onboarding. Cambios de plan o baja de una agencia hechos a mano en la base: llamar a la misma función o esperar el TTL (1 h para el tenant, 24 h para el inventario).
- Filtros del catálogo en el cliente sobre la lista completa: la página no depende de `searchParams`.
- Dominio propio solo resuelve si el plan lo habilita.

## Riesgos aceptados
- Condición de carrera mínima en el tope de autos activos (dos publicaciones simultáneas en el último cupo).
- Sin verificación de email, sin 2FA y sin chequeo de contraseñas filtradas.
- Hosts desconocidos generan una entrada de caché negativa (TTL 1 h).

## Etapa 6
- Recuperar contraseña: token de 256 bits, solo se guarda su hash (SHA-256), vence en 60 min, se usa una vez (se reclama de forma atómica) y la respuesta es idéntica exista o no el email. Límite por IP y por email.
- `User.sessionVersion`: cambiar o recuperar la contraseña cierra todas las sesiones abiertas. Una sesión inválida pasa por `/logout`, que borra la cookie (evita el bucle de redirecciones entre middleware y panel).
- Panel `/admin`: acceso solo para `PLATFORM_ADMIN_EMAILS`; los demás reciben 404. Se verifica en cada página y en cada acción (no solo en el layout). Todo cambio queda en `AdminAuditLog`.
- `app/admin/**` y `lib/notifications.ts` usan `prisma` directo a propósito (operan entre agencias); es el único lugar donde corresponde.
- Emails: el contenido que viene de usuarios (nombre del lead) se escapa en el HTML; el aviso de lead tiene tope de 10 por agencia cada 10 min.

## Etapa 7
- Límites de uso (login, registro, recuperar contraseña, leads, cambio de clave): ahora globales con Upstash Redis cuando hay credenciales; sin ellas, memoria por instancia (solo aceptable en desarrollo).
- Conexión a la base: `DATABASE_URL` con pooler para la app y `DIRECT_URL` directa para migraciones.
- `/api/health` para monitoreo externo; `robots.txt` y `sitemap.xml` por agencia; el panel (`/dashboard`, `/admin`, etc.) queda fuera de los buscadores.
- Las vistas previas de Vercel (`*.vercel.app`) se tratan como panel, nunca como catálogo de una agencia.
- Registro con aceptación explícita de términos y política de privacidad (borrador a revisar por un abogado).
