import {
  applyDecorators,
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  StreamableFile,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiProduces,
  ApiProperty,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Prisma } from '../generated/prisma/client.js';
import { D, DecimalInput } from './math/decimal.util.js';

/**
 * Monto/tasa positiva como string decimal. Acepta number JSON y lo convierte a string
 * antes de validar, para que nunca viaje como float hacia el motor financiero.
 * `integerDigits` + `decimals` deben coincidir con la columna Decimal(p, s) de Prisma.
 */
export const IsDecimalString = ({
  decimals = 2,
  integerDigits = 12,
  example = '10000.00',
} = {}) => {
  const pattern = `^\\d{1,${integerDigits}}(\\.\\d{1,${decimals}})?$`;
  const rule = `número positivo con hasta ${integerDigits} enteros y ${decimals} decimales`;
  return applyDecorators(
    ApiProperty({
      type: String,
      pattern,
      example,
      description: `Decimal: ${rule} (se acepta también number JSON).`,
    }),
    Transform(({ value }) =>
      typeof value === 'number' ? value.toString() : value,
    ),
    Matches(new RegExp(pattern), { message: `$property debe ser un ${rule}` }),
  );
};

export function assertRange(
  label: string,
  value: DecimalInput,
  min: DecimalInput,
  max: DecimalInput,
) {
  if (D(value).lt(D(min)) || D(value).gt(D(max))) {
    throw new BadRequestException(
      `${label} debe estar entre ${min.toString()} y ${max.toString()}`,
    );
  }
}

export function assertMinMax(
  label: string,
  min: DecimalInput,
  max: DecimalInput,
) {
  if (D(min).lte(0)) {
    throw new BadRequestException(`${label}: el mínimo debe ser mayor a 0`);
  }
  if (D(min).gt(D(max))) {
    throw new BadRequestException(
      `${label}: el mínimo no puede superar al máximo`,
    );
  }
}

/** Traduce errores de Prisma, Multer y del motor financiero a respuestas HTTP. */
@Catch()
export class DomainExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(error: unknown, host: ArgumentsHost) {
    super.catch(toHttp(error), host);
  }
}

function toHttp(error: unknown): unknown {
  if (error instanceof HttpException) return error;
  if (error instanceof RangeError)
    return new BadRequestException(error.message);
  // Nest 12 compara mensajes de multer 1.x; multer 2.x los cambió → se mapea por nombre/código.
  if (error instanceof Error && error.name === 'MulterError') {
    const { code, field } = error as Error & { code: string; field?: string };
    const message = field ? `${error.message} - ${field}` : error.message;
    return code === 'LIMIT_FILE_SIZE'
      ? new PayloadTooLargeException(message)
      : new BadRequestException(message);
  }
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;
  switch (error.code) {
    case 'P2025':
      return new NotFoundException('Registro no encontrado');
    case 'P2002':
      return new ConflictException('Ya existe un registro con ese valor único');
    case 'P2003':
      return new ConflictException(
        'El registro está referenciado por otros datos',
      );
    default:
      return error;
  }
}

// ───────────────────────── Archivos subidos ─────────────────────────

// ponytail: disco local; migrar a S3/R2 si se despliega en más de una instancia.
const UPLOADS_ROOT = join(process.cwd(), 'uploads');
/** Servido estáticamente en /uploads (logo institucional). */
export const PUBLIC_UPLOADS = join(UPLOADS_ROOT, 'public');
/** Nunca servido estáticamente (documentos con datos personales). */
export const PRIVATE_UPLOADS = join(UPLOADS_ROOT, 'private');
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES = { png: '89504e47', jpg: 'ffd8ff', pdf: '25504446' } as const;
export type FileKind = keyof typeof SIGNATURES;
export const MIME_TYPES: Record<FileKind, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
};

/** Tipo real por magic bytes; el mimetype del cliente no es confiable. */
export function detectFileKind(buffer: Buffer): FileKind | null {
  const head = buffer.subarray(0, 4).toString('hex');
  return (
    (Object.keys(SIGNATURES) as FileKind[]).find((k) =>
      head.startsWith(SIGNATURES[k]),
    ) ?? null
  );
}

export function assertFileKind(
  buffer: Buffer,
  allowed: FileKind[],
  field: string,
): FileKind {
  const kind = detectFileKind(buffer);
  if (!kind || !allowed.includes(kind)) {
    throw new BadRequestException(`${field} debe ser ${allowed.join(', ')}`);
  }
  return kind;
}

/** Imagen JPEG/PNG en base64, con o sin prefijo data URL, validada por su contenido. */
export function decodeImageBase64(value: string, field: string): Buffer {
  const buffer = Buffer.from(
    value.replace(/^data:image\/[a-z]+;base64,/i, ''),
    'base64',
  );
  assertFileKind(buffer, ['png', 'jpg'], field);
  return buffer;
}

/**
 * Ruta en disco de un documento de onboarding. `id` llega validado como UUID en
 * los controladores, así que no hay path traversal posible.
 */
export const onboardingDocumentPath = (id: string, kind: string) =>
  join(PRIVATE_UPLOADS, 'onboarding', id, kind);

/** Ruta en disco de un archivo de identidad de la cuenta (cédula, selfie de referencia). */
export const userDocumentPath = (userId: string, kind: string) =>
  join(PRIVATE_UPLOADS, 'users', userId, kind);

export async function saveFile(path: string, buffer: Buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}

// ───────────────────────── PDF ─────────────────────────

export const pdfFile = (buffer: Buffer, fileName: string) =>
  new StreamableFile(buffer, {
    type: 'application/pdf',
    disposition: `attachment; filename="${fileName}"`,
  });

export const ApiPdfResponse = () =>
  applyDecorators(
    ApiProduces('application/pdf'),
    ApiOkResponse({
      description: 'Documento PDF',
      schema: { type: 'string', format: 'binary' },
    }),
    ApiBadRequestResponse({
      description: 'Parámetros fuera de rango del producto',
    }),
  );
