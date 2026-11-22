import {
  ActivityType,
  Currency,
  FuelType,
  LeadSource,
  LeadStatus,
  Plan,
  Prisma,
  PrismaClient,
  Role,
  Transmission,
  VehicleStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type VehicleSeed = Omit<Prisma.VehicleUncheckedCreateInput, "tenantId" | "order">;

interface LeadSeed {
  vehicleIndex: number | null;
  clientName: string;
  clientPhone: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  followUpInDays: number | null;
  createdHoursAgo: number;
}

interface TenantSeed {
  tenant: Prisma.TenantCreateInput;
  owner: { email: string; name: string };
  vehicles: VehicleSeed[];
  leads: LeadSeed[];
}

const seeds: TenantSeed[] = [
  {
    tenant: {
      name: "Palermo Autos",
      slug: "palermo-autos",
      primaryColor: "#E11D48",
      whatsappNumber: "+5491155550101",
      address: "Av. Juan B. Justo 1850",
      city: "Buenos Aires",
      instagramHandle: "palermoautos",
      plan: Plan.STARTER,
      onboardingCompleted: true,
    },
    owner: { email: "owner@palermoautos.demo", name: "Martín Gómez" },
    vehicles: [
      {
        brand: "Toyota", model: "Corolla", version: "XEI 2.0 CVT", year: 2021, mileage: 48500,
        price: 22900, currency: Currency.USD, transmission: Transmission.AUTOMATIC, fuelType: FuelType.NAFTA,
        color: "Gris Plata", description: "Único dueño, service oficial al día. Excelente estado.",
        features: ["Control de crucero", "Cámara de retroceso", "Climatizador", "Apple CarPlay"],
        status: VehicleStatus.AVAILABLE, isFeatured: true,
      },
      {
        brand: "Volkswagen", model: "Polo", version: "Highline 1.6 MSI", year: 2019, mileage: 62000,
        price: 17800000, currency: Currency.ARS, transmission: Transmission.MANUAL, fuelType: FuelType.NAFTA,
        color: "Blanco", description: "Muy cuidado, cubiertas nuevas.",
        features: ["Aire acondicionado", "Pantalla multimedia", "Sensores traseros"],
        status: VehicleStatus.AVAILABLE, isFeatured: false,
      },
      {
        brand: "Ford", model: "Ranger", version: "XLT 3.2 4x4", year: 2018, mileage: 112000,
        price: 28500, currency: Currency.USD, transmission: Transmission.MANUAL, fuelType: FuelType.DIESEL,
        color: "Negro", description: "Con cubre caja y estribos. Papeles al día.",
        features: ["4x4", "Control de tracción", "Bluetooth"],
        status: VehicleStatus.RESERVED, isFeatured: false,
      },
      {
        brand: "Renault", model: "Sandero", version: "Stepway 1.6", year: 2017, mileage: 91000,
        price: 11900000, currency: Currency.ARS, transmission: Transmission.MANUAL, fuelType: FuelType.GNC,
        color: "Rojo", description: "En preparación: pulido y service.",
        features: ["Equipo de GNC 5ta generación", "Aire acondicionado"],
        status: VehicleStatus.PREPARATION, isFeatured: false,
      },
    ],
    leads: [
      { vehicleIndex: 0, clientName: "Lucas Fernández", clientPhone: "+5491166660001", source: LeadSource.WHATSAPP_CATALOG, status: LeadStatus.NEW, notes: "Consultó por financiación.", followUpInDays: null, createdHoursAgo: 3 },
      { vehicleIndex: 2, clientName: "Camila Rossi", clientPhone: "+5491166660002", source: LeadSource.INSTAGRAM, status: LeadStatus.NEGOTIATING, notes: "Dejó seña, define el viernes.", followUpInDays: -1, createdHoursAgo: 96 },
      { vehicleIndex: null, clientName: "Don Roberto", clientPhone: "+5491166660003", source: LeadSource.MANUAL, status: LeadStatus.VISIT_SCHEDULED, notes: "Pasó por el local, busca algo hasta USD 20.000.", followUpInDays: 2, createdHoursAgo: 30 },
    ],
  },
  {
    tenant: {
      name: "Sur Motors",
      slug: "sur-motors",
      customDomain: "sur-motors.test",
      primaryColor: "#0F766E",
      whatsappNumber: "+5491155550202",
      address: "Av. Hipólito Yrigoyen 4200",
      city: "Lanús",
      instagramHandle: "surmotors.ok",
      plan: Plan.PRO,
      onboardingCompleted: true,
    },
    owner: { email: "owner@sursmotors.demo", name: "Valeria Núñez" },
    vehicles: [
      {
        brand: "Fiat", model: "Cronos", version: "Drive 1.3", year: 2022, mileage: 34000,
        price: 19500000, currency: Currency.ARS, transmission: Transmission.MANUAL, fuelType: FuelType.NAFTA,
        color: "Blanco", description: "Impecable, ideal para uso diario o app.",
        features: ["Aire acondicionado", "Dirección asistida", "Multimedia 7\""],
        status: VehicleStatus.AVAILABLE, isFeatured: false,
      },
      {
        brand: "Chevrolet", model: "Cruze", version: "LTZ 1.4T AT", year: 2018, mileage: 77000,
        price: 15900, currency: Currency.USD, transmission: Transmission.AUTOMATIC, fuelType: FuelType.NAFTA,
        color: "Azul", description: "Full, con cuero y techo solar.",
        features: ["Techo solar", "Asientos de cuero", "Control de crucero", "Sensores"],
        status: VehicleStatus.AVAILABLE, isFeatured: true,
      },
      {
        brand: "Peugeot", model: "208", version: "Allure 1.6", year: 2020, mileage: 56000,
        price: 16200000, currency: Currency.ARS, transmission: Transmission.MANUAL, fuelType: FuelType.NAFTA,
        color: "Gris", description: "Vendido la semana pasada.",
        features: ["i-Cockpit", "Aire acondicionado"],
        status: VehicleStatus.SOLD, isFeatured: false,
      },
      {
        brand: "Toyota", model: "Corolla Cross", version: "XEI Hybrid", year: 2023, mileage: 21000,
        price: 31500, currency: Currency.USD, transmission: Transmission.AUTOMATIC, fuelType: FuelType.HYBRID,
        color: "Negro", description: "Híbrido, consumo mínimo. Garantía oficial vigente.",
        features: ["Híbrido", "Cámara 360", "Control de crucero adaptativo", "Carga inalámbrica"],
        status: VehicleStatus.AVAILABLE, isFeatured: true,
      },
    ],
    leads: [
      { vehicleIndex: 3, clientName: "Nicolás Pereyra", clientPhone: "+5491177770001", source: LeadSource.WHATSAPP_CATALOG, status: LeadStatus.NEW, notes: null, followUpInDays: null, createdHoursAgo: 1 },
      { vehicleIndex: 1, clientName: "Sofía Benítez", clientPhone: "+5491177770002", source: LeadSource.WHATSAPP_CATALOG, status: LeadStatus.CONTACTED, notes: "Quiere probarlo el sábado.", followUpInDays: -2, createdHoursAgo: 72 },
      { vehicleIndex: 0, clientName: "Jorge Salinas", clientPhone: "+5491177770003", source: LeadSource.MANUAL, status: LeadStatus.WON, notes: "Cerrado. Pagó contado.", followUpInDays: null, createdHoursAgo: 200 },
    ],
  },
];

async function seedTenant(seed: TenantSeed, passwordHash: string): Promise<void> {
  const tenant = await prisma.tenant.create({ data: seed.tenant });

  const owner = await prisma.user.create({
    data: { email: seed.owner.email, name: seed.owner.name, passwordHash, role: Role.OWNER, tenantId: tenant.id },
  });

  const vehicleIds: string[] = [];
  for (const [index, vehicle] of seed.vehicles.entries()) {
    const created = await prisma.vehicle.create({
      data: { ...vehicle, tenantId: tenant.id, order: index },
    });
    vehicleIds.push(created.id);

    await prisma.vehicleImage.createMany({
      data: [0, 1].map((n) => ({
        vehicleId: created.id,
        tenantId: tenant.id,
        url: `https://picsum.photos/seed/${tenant.slug}-${index}-${n}/1200/800`,
        key: `tenants/${tenant.id}/vehicles/${created.id}/seed-${n}.webp`,
        isCover: n === 0,
        order: n,
      })),
    });
  }

  for (const lead of seed.leads) {
    const createdAt = new Date(Date.now() - lead.createdHoursAgo * HOUR);
    const createdLead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        vehicleId: lead.vehicleIndex === null ? null : vehicleIds[lead.vehicleIndex],
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        source: lead.source,
        status: lead.status,
        notes: lead.notes,
        nextFollowUp: lead.followUpInDays === null ? null : new Date(Date.now() + lead.followUpInDays * DAY),
        createdAt,
      },
    });

    await prisma.activity.create({
      data: { tenantId: tenant.id, leadId: createdLead.id, userId: owner.id, type: ActivityType.CREATED, content: "Lead creado", createdAt },
    });
    if (lead.notes) {
      await prisma.activity.create({
        data: { tenantId: tenant.id, leadId: createdLead.id, userId: owner.id, type: ActivityType.NOTE, content: lead.notes },
      });
    }
  }
}

async function main(): Promise<void> {
  const slugs = seeds.map((s) => s.tenant.slug);
  await prisma.tenant.deleteMany({ where: { slug: { in: slugs } } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const seed of seeds) {
    await seedTenant(seed, passwordHash);
  }

  console.log("Seed OK");
  for (const seed of seeds) {
    console.log(`- ${seed.tenant.name}: ${seed.owner.email} / ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
