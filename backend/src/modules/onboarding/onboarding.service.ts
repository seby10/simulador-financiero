import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertFileKind,
  detectFileKind,
  type FileKind,
  MIME_TYPES,
  onboardingDocumentPath,
} from '../../common/http.js';
import { StorageService } from '../../common/storage.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ApplicationStatus,
  BiometricStatus,
} from '../../generated/prisma/enums.js';
import {
  REFERENCE_DOCUMENT,
  SELFIE_DOCUMENT,
} from '../biometrics/biometrics.service.js';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
} from '../investment/investment.dto.js';
import { InvestmentService } from '../investment/investment.service.js';
import { ApplyDto } from './onboarding.dto.js';

export type DocumentFiles = Partial<
  Record<DocumentKind, Express.Multer.File[]>
>;

const planSummary = { select: { id: true, name: true, tea: true } } as const;

/** Documentos descargables por un administrador: los cargados más la selfie verificada. */
const READABLE_DOCUMENTS: readonly string[] = [
  ...DOCUMENT_KINDS,
  SELFIE_DOCUMENT,
];

/** La cédula frontal es la referencia biométrica: tiene que ser una foto. */
const allowedKinds = (kind: DocumentKind): FileKind[] =>
  kind === REFERENCE_DOCUMENT ? ['png', 'jpg'] : ['png', 'jpg', 'pdf'];

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly investment: InvestmentService,
    private readonly storage: StorageService,
  ) {}

  async apply(dto: ApplyDto, userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { idNumber: true },
    });
    // La biometría compara contra la cédula que se cargue: una cuenta solo
    // puede solicitar a nombre de su propio titular.
    if (user.idNumber && user.idNumber !== dto.applicantIdNumber) {
      throw new BadRequestException(
        'La cédula del solicitante debe coincidir con la de tu cuenta',
      );
    }
    await this.investment.loadPlanFor({
      planId: dto.investmentPlanId,
      amount: dto.amount,
      termDays: dto.termDays,
      payoutMethod: dto.payoutMethod,
    });
    return this.prisma.investmentApplication.create({
      data: {
        userId,
        applicantFullName: dto.applicantFullName,
        applicantIdNumber: dto.applicantIdNumber,
        email: dto.email,
        phone: dto.phone,
        sourceOfFunds: dto.sourceOfFunds,
        investmentPlanId: dto.investmentPlanId,
        amount: dto.amount,
        termDays: dto.termDays,
        payoutMethod: dto.payoutMethod,
      },
      include: { investmentPlan: planSummary },
    });
  }

  list(status?: ApplicationStatus) {
    return this.prisma.investmentApplication.findMany({
      where: { status },
      include: { investmentPlan: planSummary },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMine(userId: string) {
    return this.prisma.investmentApplication.findMany({
      where: { userId },
      include: { investmentPlan: planSummary },
      orderBy: { createdAt: 'desc' },
    });
  }

  get(id: string) {
    return this.prisma.investmentApplication.findUniqueOrThrow({
      where: { id },
      include: {
        investmentPlan: {
          select: { ...planSummary.select, requiredDocuments: true },
        },
      },
    });
  }

  async uploadDocuments(id: string, userId: string, files: DocumentFiles = {}) {
    const application = await this.getOwnedPending(id, userId);
    // Cambiar la cédula después de verificar invalidaría la comparación facial.
    if (application.biometricStatus !== BiometricStatus.PENDING) {
      throw new ConflictException(
        'La identidad ya fue evaluada; los documentos no se pueden reemplazar',
      );
    }
    const uploads = DOCUMENT_KINDS.flatMap((kind) => {
      const file = files[kind]?.[0];
      return file ? [{ kind, file }] : [];
    });
    if (!uploads.length) {
      throw new BadRequestException(
        `Adjunte al menos uno de: ${DOCUMENT_KINDS.join(', ')}`,
      );
    }
    // Validar todo antes de escribir para no dejar cargas parciales.
    uploads.forEach(({ kind, file }) =>
      assertFileKind(file.buffer, allowedKinds(kind), kind),
    );
    await Promise.all(
      uploads.map(({ kind, file }) =>
        this.storage.save(onboardingDocumentPath(id, kind), file.buffer),
      ),
    );

    const patch = Object.fromEntries(
      uploads.map(({ kind }) => [
        kind,
        `/api/onboarding/applications/${id}/documents/${kind}`,
      ]),
    );
    // Merge atómico en Postgres (jsonb ||): cargas concurrentes no se pisan entre sí,
    // y el estado se verifica en la misma sentencia.
    const updated = await this.prisma.$executeRaw`
      UPDATE "InvestmentApplication"
      SET "documentUrls" = "documentUrls" || ${JSON.stringify(patch)}::jsonb,
          "updatedAt" = now()
      WHERE id = ${id} AND status = 'PENDING_REVIEW' AND "biometricStatus" = 'PENDING'`;
    if (updated === 0) {
      throw new ConflictException('La solicitud ya fue resuelta');
    }
    return this.prisma.investmentApplication.findUniqueOrThrow({
      where: { id },
    });
  }

  async readDocument(id: string, kind: string) {
    if (!READABLE_DOCUMENTS.includes(kind))
      throw new NotFoundException('Documento no válido');
    await this.get(id);
    const buffer = await this.storage.read(onboardingDocumentPath(id, kind));
    if (!buffer) throw new NotFoundException('Documento no cargado');
    const fileKind = detectFileKind(buffer) ?? 'pdf';
    return {
      buffer,
      mimeType: MIME_TYPES[fileKind],
      fileName: `${kind}.${fileKind}`,
    };
  }

  /**
   * Solo con la identidad resuelta: verificada por biometría, o agotados los
   * intentos (el administrador la revisó a mano con los documentos).
   */
  approve(id: string) {
    return this.resolve(id, ApplicationStatus.APPROVED, {
      biometricStatus: {
        in: [BiometricStatus.VERIFIED, BiometricStatus.FAILED],
      },
    });
  }

  reject(id: string) {
    return this.resolve(id, ApplicationStatus.REJECTED, {});
  }

  /** Condicionado al estado: dos administradores no resuelven la misma solicitud dos veces. */
  private async resolve(
    id: string,
    status: ApplicationStatus,
    guard: { biometricStatus?: { in: BiometricStatus[] } },
  ) {
    const application = await this.get(id);
    if (application.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `La solicitud ya fue resuelta (${application.status})`,
      );
    }
    if (
      guard.biometricStatus &&
      !guard.biometricStatus.in.includes(application.biometricStatus)
    ) {
      throw new ConflictException(
        'El solicitante aún no completa la verificación biométrica',
      );
    }
    const { count } = await this.prisma.investmentApplication.updateMany({
      where: { id, status: ApplicationStatus.PENDING_REVIEW, ...guard },
      data: { status },
    });
    if (count === 0) {
      throw new ConflictException('La solicitud ya fue resuelta');
    }
    return this.prisma.investmentApplication.findUniqueOrThrow({
      where: { id },
      include: { investmentPlan: planSummary },
    });
  }

  /** A quien no es dueño se le responde como si no existiera. */
  private async getOwnedPending(id: string, userId: string) {
    const application = await this.prisma.investmentApplication.findUnique({
      where: { id },
    });
    if (!application || application.userId !== userId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (application.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `La solicitud ya fue resuelta (${application.status})`,
      );
    }
    return application;
  }
}
