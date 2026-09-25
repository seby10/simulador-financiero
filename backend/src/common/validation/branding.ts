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
 * Imagen opcional: URL https externa, imagen de marca guardada en la base
 * (`/api/institution/logo|hero?v=...`) o archivo antiguo en disco (`/uploads/...`).
 * Descarta esquemas como `javascript:` o `data:`; la cadena vacía borra la imagen.
 */
export const IsOptionalImageUrl = () =>
  applyDecorators(
    ApiProperty({
      type: String,
      required: false,
      nullable: true,
      example: '/api/institution/hero?v=1727222400000',
    }),
    Transform(({ value }: { value: unknown }) => (value === '' ? null : value)),
    IsOptional(),
    Matches(
      /^(https:\/\/[^\s"'<>]+|\/api\/institution\/(logo|hero)\?v=\d+|\/uploads\/[\w\-./]+)$/,
      {
        message:
          '$property debe ser una URL https, una imagen subida desde el panel o una ruta /uploads/',
      },
    ),
  );
