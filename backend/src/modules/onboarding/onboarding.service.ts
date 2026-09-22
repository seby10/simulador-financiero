import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import {
  assertFileKind,
  detectFileKind,
  MIME_TYPES,
  onboardingDocumentPath,
  saveFile,
} from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ApplicationStatus } from '../../generated/prisma/enums.js';
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

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly investment: InvestmentService,
  ) {}

  async apply(dto: ApplyDto) {
    await this.investment.loadPlanFor({
      planId: dto.investmentPlanId,
      amount: dto.amount,
      termDays: dto.termDays,
      payoutMethod: dto.payoutMethod,
    });
    return this.prisma.investmentApplication.create({
      data: dto,
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

  /** Consulta pública: busca la solicitud más reciente de un solicitante por cédula. */
  async lookupByIdNumber(idNumber: string) {
    const application = await this.prisma.investmentApplication.findFirst({
      where: { applicantIdNumber: idNumber },
      orderBy: { createdAt: 'desc' },
      include: { investmentPlan: planSummary },
    });
    if (!application) throw new NotFoundException('No se encontraron solicitudes para esa cédula');
    // Solo devolvemos campos no sensibles al cliente
    const { applicantFullName, status, biometricScore, amount, termDays, payoutMethod, createdAt, investmentPlan, id } = application;
    return { id, applicantFullName, status, biometricScore, amount, termDays, payoutMethod, createdAt, investmentPlan };
  }

  async uploadDocuments(id: string, files: DocumentFiles = {}) {
    await this.getPending(id);
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
      assertFileKind(file.buffer, ['png', 'jpg', 'pdf'], kind),
    );
    await Promise.all(
      uploads.map(({ kind, file }) =>
        saveFile(onboardingDocumentPath(id, kind), file.buffer),
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
      WHERE id = ${id} AND status = 'PENDING_REVIEW'`;
    if (updated === 0) {
      throw new ConflictException('La solicitud ya fue resuelta');
    }
    return this.prisma.investmentApplication.findUniqueOrThrow({
      where: { id },
    });
  }

  async readDocument(id: string, kind: string) {
    if (!DOCUMENT_KINDS.includes(kind as DocumentKind) && kind !== 'selfie')
      throw new NotFoundException('Documento no válido');
    await this.get(id);
    const buffer = await readFile(
      onboardingDocumentPath(id, kind as DocumentKind),
    ).catch(() => {
      throw new NotFoundException('Documento no cargado');
    });
    const fileKind = detectFileKind(buffer) ?? 'pdf';
    return {
      buffer,
      mimeType: MIME_TYPES[fileKind],
      fileName: `${kind}.${fileKind}`,
    };
  }

  async approve(id: string) {
    const application = await this.getPending(id);
    return this.prisma.investmentApplication.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.APPROVED },
      include: { investmentPlan: planSummary },
    });
  }

  async reject(id: string) {
    const application = await this.getPending(id);
    return this.prisma.investmentApplication.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.REJECTED },
      include: { investmentPlan: planSummary },
    });
  }

  private async getPending(id: string) {
    const application = await this.get(id);
    if (application.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `La solicitud ya fue resuelta (${application.status})`,
      );
    }
    return application;
  }
}
