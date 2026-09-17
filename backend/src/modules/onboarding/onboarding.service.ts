import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  assertFileKind,
  detectFileKind,
  MIME_TYPES,
  PRIVATE_UPLOADS,
  saveFile,
} from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ApplicationStatus } from '../../generated/prisma/enums.js';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
} from '../investment/investment.dto.js';
import { InvestmentService } from '../investment/investment.service.js';
import { ApplyDto, BiometricsDto } from './onboarding.dto.js';

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

  async uploadDocuments(id: string, files: DocumentFiles = {}) {
    const application = await this.getPending(id);
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
        saveFile(this.documentPath(id, kind), file.buffer),
      ),
    );

    const documentUrls = {
      ...(application.documentUrls as Record<string, string>),
      ...Object.fromEntries(
        uploads.map(({ kind }) => [
          kind,
          `/api/onboarding/applications/${id}/documents/${kind}`,
        ]),
      ),
    };
    return this.prisma.investmentApplication.update({
      where: { id },
      data: { documentUrls },
    });
  }

  async readDocument(id: string, kind: string) {
    if (!DOCUMENT_KINDS.includes(kind as DocumentKind))
      throw new NotFoundException('Documento no válido');
    await this.get(id);
    const buffer = await readFile(
      this.documentPath(id, kind as DocumentKind),
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

  /**
   * Verificación biométrica simulada: valida que la captura sea una imagen real,
   * simula liveness + face match contra la cédula y asigna un puntaje de 90–99.99 %.
   */
  async verifyBiometrics(id: string, dto: BiometricsDto) {
    const application = await this.getPending(id);
    const uploaded = application.documentUrls as Record<string, string>;
    const missing = (
      application.investmentPlan.requiredDocuments as string[]
    ).filter((k) => !uploaded[k]);
    if (missing.length) {
      throw new BadRequestException(`Faltan documentos: ${missing.join(', ')}`);
    }

    const base64 = dto.selfieBase64.replace(/^data:image\/[a-z]+;base64,/i, '');
    assertFileKind(
      Buffer.from(base64, 'base64'),
      ['png', 'jpg'],
      'selfieBase64',
    );

    // ponytail: mock sin proveedor biométrico; reemplazar por SDK real (liveness + matching).
    const biometricScore = `${90 + randomInt(10)}.${randomInt(100).toString().padStart(2, '0')}`;
    const updated = await this.prisma.investmentApplication.update({
      where: { id },
      data: { biometricScore, status: ApplicationStatus.APPROVED },
    });
    return {
      applicationId: updated.id,
      status: updated.status,
      biometricScore: updated.biometricScore,
      checks: { liveness: 'PASSED', faceMatch: 'MATCH' },
    };
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

  private documentPath(id: string, kind: DocumentKind) {
    // id validado como UUID en el controlador → sin path traversal.
    return join(PRIVATE_UPLOADS, 'onboarding', id, kind);
  }
}
