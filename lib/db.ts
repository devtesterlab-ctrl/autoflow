import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Modelos que pertenecen a un tenant y NUNCA se consultan sin filtro. */
const TENANT_SCOPED_MODELS = new Set<string>([
  "Vehicle",
  "VehicleImage",
  "Lead",
  "Activity",
]);

/** Operaciones que aceptan `where`: se les fuerza `tenantId`. */
const WHERE_OPERATIONS = new Set<string>([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

type Obj = Record<string, unknown>;

/**
 * Cliente Prisma acotado a un tenant. Inyecta `tenantId` en todos los
 * where/create de Vehicle, VehicleImage, Lead y Activity, y pisa cualquier
 * `tenantId` que venga en `data` para impedir escrituras cruzadas.
 *
 * Usar siempre escalares (`vehicleId`, `leadId`) en los create, no
 * `connect` anidados, para no mezclar input checked/unchecked de Prisma.
 */
export function tenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error("tenantDb: tenantId es obligatorio");
  }

  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const scoped = (args ?? {}) as Obj;

          if (WHERE_OPERATIONS.has(operation)) {
            scoped.where = { ...((scoped.where as Obj | undefined) ?? {}), tenantId };
          }

          if (operation === "create") {
            scoped.data = { ...((scoped.data as Obj | undefined) ?? {}), tenantId };
          }

          if (operation === "upsert") {
            scoped.create = { ...((scoped.create as Obj | undefined) ?? {}), tenantId };
          }

          if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = scoped.data;
            scoped.data = Array.isArray(data)
              ? (data as Obj[]).map((row) => ({ ...row, tenantId }))
              : { ...((data as Obj | undefined) ?? {}), tenantId };
          }

          return query(scoped as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof tenantDb>;
