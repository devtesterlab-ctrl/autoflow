/**
 * Verifica contra la base real (con el seed cargado) que un tenant no puede leer ni mutar datos de otro.
 * Uso: npm run test:isolation   (sale con código 1 si algún chequeo falla)
 */
import { prisma, tenantDb } from "../lib/db";

let failures = 0;

function check(name: string, passed: boolean): void {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  if (!passed) failures += 1;
}

async function expectReject(name: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
    check(name, false);
  } catch {
    check(name, true);
  }
}

async function main(): Promise<void> {
  const [tenantA, tenantB] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug: "palermo-autos" } }),
    prisma.tenant.findUnique({ where: { slug: "sur-motors" } }),
  ]);
  if (!tenantA || !tenantB) throw new Error("Faltan las agencias de prueba. Corré primero: npm run db:seed");

  const dbA = tenantDb(tenantA.id);
  const vehicleB = await prisma.vehicle.findFirstOrThrow({ where: { tenantId: tenantB.id } });
  const leadB = await prisma.lead.findFirstOrThrow({ where: { tenantId: tenantB.id } });
  const imageB = await prisma.vehicleImage.findFirstOrThrow({ where: { tenantId: tenantB.id } });

  console.log(`Contexto: ${tenantA.slug}  ->  objetivo: ${tenantB.slug}\n`);

  check("findUnique de un vehículo ajeno devuelve null", (await dbA.vehicle.findUnique({ where: { id: vehicleB.id } })) === null);
  check("findFirst por id ajeno devuelve null", (await dbA.vehicle.findFirst({ where: { id: vehicleB.id } })) === null);
  check("findMany solo devuelve vehículos propios", (await dbA.vehicle.findMany()).every((vehicle) => vehicle.tenantId === tenantA.id));
  check("findMany de leads solo devuelve leads propios", (await dbA.lead.findMany()).every((lead) => lead.tenantId === tenantA.id));
  check(
    "count no incluye otras agencias",
    (await dbA.vehicle.count()) === (await prisma.vehicle.count({ where: { tenantId: tenantA.id } })),
  );

  await expectReject("update de un vehículo ajeno falla", () =>
    dbA.vehicle.update({ where: { id: vehicleB.id }, data: { brand: "HACK" } }),
  );
  await expectReject("delete de un lead ajeno falla", () => dbA.lead.delete({ where: { id: leadB.id } }));

  const deletedImages = await dbA.vehicleImage.deleteMany({ where: { id: imageB.id } });
  check("deleteMany de una foto ajena borra 0 filas", deletedImages.count === 0);

  const updatedLeads = await dbA.lead.updateMany({ where: { id: leadB.id }, data: { clientName: "HACK" } });
  check("updateMany de un lead ajeno modifica 0 filas", updatedLeads.count === 0);

  const forged = await dbA.lead.create({
    data: { tenantId: tenantB.id, clientName: "Isolation check", source: "MANUAL" },
  });
  check("create ignora un tenantId ajeno y usa el del contexto", forged.tenantId === tenantA.id);
  await prisma.lead.delete({ where: { id: forged.id } });

  const vehicleAfter = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleB.id } });
  const leadAfter = await prisma.lead.findUniqueOrThrow({ where: { id: leadB.id } });
  const imageAfter = await prisma.vehicleImage.findUnique({ where: { id: imageB.id } });
  check("el vehículo ajeno quedó intacto", vehicleAfter.brand === vehicleB.brand);
  check("el lead ajeno quedó intacto", leadAfter.clientName === leadB.clientName);
  check("la foto ajena sigue existiendo", imageAfter !== null);

  console.log(failures === 0 ? "\nAislamiento OK" : `\n${failures} chequeo(s) fallaron`);
}

main()
  .catch((error) => {
    console.error(error);
    failures += 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(failures === 0 ? 0 : 1);
  });
