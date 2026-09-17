import { createPrismaClient } from '../src/database/prisma.service.js';
import { hashPassword } from '../src/modules/auth/password.js';

try {
  process.loadEnvFile();
} catch {
  // variables provistas por el entorno
}

const prisma = createPrismaClient();

// Parámetros referenciales de cooperativas / banca ecuatoriana. Tasas en %.
const creditTypes = [
  {
    name: 'Consumo',
    description: 'Crédito de consumo ordinario',
    minAmount: '500',
    maxAmount: '30000',
    minTermMonths: 3,
    maxTermMonths: 60,
    annualInterestRate: '16',
  },
  {
    name: 'Microcrédito',
    description: 'Microcrédito de acumulación simple',
    minAmount: '300',
    maxAmount: '20000',
    minTermMonths: 3,
    maxTermMonths: 48,
    annualInterestRate: '21',
  },
  {
    name: 'Hipotecario',
    description: 'Vivienda de interés público y comercial',
    minAmount: '20000',
    maxAmount: '250000',
    minTermMonths: 60,
    maxTermMonths: 300,
    annualInterestRate: '9.5',
  },
  {
    name: 'Educativo',
    description: 'Financiamiento de estudios superiores',
    minAmount: '1000',
    maxAmount: '50000',
    minTermMonths: 6,
    maxTermMonths: 120,
    annualInterestRate: '9',
  },
];

const indirectFees = [
  {
    name: 'Seguro de Desgravamen',
    feeType: 'PERCENTAGE_REMAINING_BALANCE',
    value: '0.06',
    isMandatory: true,
  },
  {
    name: 'Gastos Administrativos',
    feeType: 'FIXED_PER_INSTALLMENT',
    value: '1.50',
    isMandatory: false,
  },
  {
    name: 'Contribución Solca',
    feeType: 'PERCENTAGE_INITIAL_AMOUNT',
    value: '0.5',
    isMandatory: true,
  },
] as const;

// Claves = campos multipart de POST /api/onboarding/:id/documents
const requiredDocuments = ['idFront', 'idBack', 'utilityBill'];
const investmentPlans = [
  {
    name: 'Póliza Corto Plazo',
    minAmount: '500',
    maxAmount: '500000',
    termMinDays: 30,
    termMaxDays: 90,
    tea: '7',
    allowsMonthlyPayout: false,
  },
  {
    name: 'Póliza Estándar',
    minAmount: '1000',
    maxAmount: '500000',
    termMinDays: 91,
    termMaxDays: 180,
    tea: '7.75',
    allowsMonthlyPayout: false,
  },
  {
    name: 'Póliza Rendimiento',
    minAmount: '1000',
    maxAmount: '1000000',
    termMinDays: 181,
    termMaxDays: 359,
    tea: '8.5',
    allowsMonthlyPayout: true,
  },
  {
    name: 'Póliza Largo Plazo',
    minAmount: '5000',
    maxAmount: '1000000',
    termMinDays: 360,
    termMaxDays: 1080,
    tea: '9.5',
    allowsMonthlyPayout: true,
  },
];

const institution = {
  institutionName: 'Cooperativa de Ahorro y Crédito Andina',
  ruc: '1790000000001',
  legalRepresentative: 'María Fernanda Salazar',
  address: 'Av. Amazonas N34-120 y Av. Naciones Unidas, Quito',
  phone: '+593 2 250 0000',
  email: 'atencion@coopandina.ec',
  disclaimerText:
    'Simulación referencial sin valor contractual. Los valores definitivos se establecen al momento de la aprobación y están sujetos a las políticas de la institución y a la normativa de la Superintendencia de Economía Popular y Solidaria.',
};

/**
 * Administrador inicial. La contraseña nunca se codifica en el repositorio: si
 * ADMIN_SEED_PASSWORD no está definida, el seed simplemente no crea la cuenta.
 */
async function seedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.log(
      'Sin ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD: no se creó usuario administrador',
    );
    return;
  }
  // update vacío: re-ejecutar el seed no pisa la contraseña de un admin existente.
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: process.env.ADMIN_SEED_NAME ?? 'Administrador',
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  });
  console.log(`Administrador listo: ${email}`);
}

async function main() {
  await prisma.institutionConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...institution },
  });
  for (const data of creditTypes) {
    await prisma.creditType.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
  }
  for (const data of indirectFees) {
    await prisma.indirectFee.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
  }
  for (const plan of investmentPlans) {
    const data = { ...plan, requiredDocuments };
    await prisma.investmentPlan.upsert({
      where: { name: plan.name },
      update: data,
      create: data,
    });
  }
  await seedAdmin();
  console.log('Seed completado');
}

await main().finally(() => prisma.$disconnect());
