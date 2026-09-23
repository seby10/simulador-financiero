import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';

/**
 * Color CSS `#rrggbb`. Estos valores se inyectan como variables CSS en el
 * layout: aceptar texto libre permitiría colar reglas arbitrarias.
 */
export const IsHexColor = () =>
  applyDecorators(
    ApiProperty({ pattern: '^#[0-9a-fA-F]{6}$', example: '#003b70' }),
    Matches(/^#[0-9a-f]{6}$/i, {
      message: '$property debe ser un color hexadecimal #rrggbb',
    }),
  );

/**
 * Imagen opcional: URL https externa o ruta de un archivo ya subido (`/uploads/...`).
 * Descarta esquemas como `javascript:` o `data:`; la cadena vacía borra la imagen.
 */
export const IsOptionalImageUrl = () =>
  applyDecorators(
    ApiProperty({
      type: String,
      required: false,
      nullable: true,
      example: '/uploads/institution/hero-3f1c.jpg',
    }),
    Transform(({ value }: { value: unknown }) => (value === '' ? null : value)),
    IsOptional(),
    Matches(/^(https:\/\/[^\s"'<>]+|\/uploads\/[\w\-./]+)$/, {
      message: '$property debe ser una URL https o una ruta /uploads/',
    }),
  );
