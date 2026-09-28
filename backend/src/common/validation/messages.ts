import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Nombre legible de cada campo que el usuario puede enviar. Sin esto los errores
 * salen con el nombre de la propiedad ("termDays debe estar entre 30 y 90"), que
 * no significa nada para quien llena el formulario.
 *
 * Se guardan en minúscula y con artículo para que sirvan tanto al inicio de la
 * frase ("El plazo...") como dentro de ella ("Debes completar el plazo...").
 */
const FIELD_LABELS: Record<string, string> = {
  // Cuenta e identidad
  email: 'el correo electrónico',
  password: 'la contraseña',
  currentPassword: 'la contraseña actual',
  newPassword: 'la contraseña nueva',
  firstName: 'el nombre',
  lastName: 'el apellido',
  fullName: 'el nombre completo',
  idNumber: 'la cédula',
  phone: 'el teléfono',
  role: 'el rol',
  isActive: 'el estado de la cuenta',
  resetToken: 'el código de recuperación',

  // Crédito
  creditTypeId: 'el tipo de crédito',
  amount: 'el monto',
  termMonths: 'el plazo en meses',
  method: 'el sistema de amortización',
  optionalFeeIds: 'los cargos opcionales',
  annualInterestRate: 'la tasa de interés anual',
  minTermMonths: 'el plazo mínimo en meses',
  maxTermMonths: 'el plazo máximo en meses',
  feeType: 'el tipo de cargo',
  value: 'el valor del cargo',
  isMandatory: 'la obligatoriedad del cargo',

  // Inversión
  planId: 'la póliza',
  investmentPlanId: 'la póliza',
  termDays: 'el plazo en días',
  termMinDays: 'el plazo mínimo en días',
  termMaxDays: 'el plazo máximo en días',
  tea: 'la tasa efectiva anual',
  payoutMethod: 'la modalidad de pago de intereses',
  allowsMonthlyPayout: 'el pago mensual de intereses',
  requiredDocuments: 'los documentos requeridos',
  minAmount: 'el monto mínimo',
  maxAmount: 'el monto máximo',

  // Solicitud y documentos
  applicationId: 'la solicitud',
  applicantFullName: 'el nombre del solicitante',
  applicantIdNumber: 'la cédula del solicitante',
  sourceOfFunds: 'el origen de los fondos',
  status: 'el estado',
  idFront: 'la cédula (parte frontal)',
  idBack: 'la cédula (parte posterior)',
  utilityBill: 'la planilla de servicio básico',
  selfie: 'la selfie de verificación',

  // Institución y marca
  institutionName: 'el nombre de la institución',
  ruc: 'el RUC',
  legalRepresentative: 'el representante legal',
  address: 'la dirección',
  disclaimerText: 'el texto legal',
  name: 'el nombre',
  description: 'la descripción',
  imageUrl: 'la imagen',
  logo: 'el logo',
  hero: 'la imagen de portada',
  heroImageUrl: 'la imagen de portada',
  heroTitle: 'el título de la portada',
  heroSubtitle: 'el subtítulo de la portada',
  primaryColor: 'el color primario',
  secondaryColor: 'el color secundario',
  accentColor: 'el color de acento',
  navbarBgColor: 'el color de fondo de la barra',
  navbarTextColor: 'el color del texto de la barra',
  pageBgColor: 'el color de fondo de la página',
  cardBgColor: 'el color de fondo de las tarjetas',
  footerBgColor: 'el color de fondo del pie de página',
  footerTextColor: 'el color del texto del pie de página',

  // Verificación biométrica
  frames: 'las fotos de la verificación facial',
  livenessSessionId: 'la sesión de verificación',
  consent: 'el consentimiento de datos biométricos',
  purpose: 'el motivo de la verificación',
  handoffId: 'el enlace de verificación',
  mobileToken: 'el enlace de verificación',
  pollToken: 'el enlace de verificación',
  sessionId: 'la sesión de verificación',
};

/** Etiqueta legible de un campo; si no está en el diccionario, su propio nombre. */
export const fieldLabel = (property: string) =>
  FIELD_LABELS[property] ?? property;

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** Etiqueta para iniciar una frase: "El monto...". */
export const Field = (property: string) => capitalize(fieldLabel(property));

/** "png, jpg" → "PNG o JPG"; "png, jpg, pdf" → "PNG, JPG o PDF". */
export function fileKindList(kinds: readonly string[]) {
  const upper = kinds.map((k) => k.toUpperCase());
  if (upper.length <= 1) return upper.join('');
  return `${upper.slice(0, -1).join(', ')} o ${upper[upper.length - 1]}`;
}

const firstNumber = (message: string) =>
  /-?\d+(?:\.\d+)?/.exec(message)?.[0] ?? '';
const listedValues = (message: string) =>
  /values:\s*(.+)$/.exec(message)?.[1] ?? '';

/**
 * Plantillas en español por tipo de validación de class-validator. Reciben la
 * etiqueta ya capitalizada y el mensaje original, del que se extraen los
 * parámetros (mínimos, máximos, valores permitidos) porque `ValidationError`
 * no los expone aparte.
 */
const TEMPLATES: Record<string, (label: string, message: string) => string> = {
  isDefined: (l) => `Debes completar ${l.toLowerCase()}`,
  isNotEmpty: (l) => `Debes completar ${l.toLowerCase()}`,
  isString: (l) => `${l} debe ser texto`,
  isInt: (l) => `${l} debe ser un número entero`,
  isNumber: (l) => `${l} debe ser un número`,
  isBoolean: (l) => `${l} debe ser verdadero o falso`,
  isArray: (l) => `${l} debe ser una lista`,
  isEmail: (l) => `${l} no tiene un formato válido`,
  isUuid: (l) => `${l} no tiene un formato válido`,
  matches: (l) => `${l} no tiene el formato correcto`,
  arrayUnique: (l) => `${l} no puede tener elementos repetidos`,
  min: (l, m) => `${l} no puede ser menor que ${firstNumber(m)}`,
  max: (l, m) => `${l} no puede ser mayor que ${firstNumber(m)}`,
  minLength: (l, m) => `${l} debe tener al menos ${firstNumber(m)} caracteres`,
  maxLength: (l, m) => `${l} no puede superar los ${firstNumber(m)} caracteres`,
  isEnum: (l, m) => `${l} debe ser uno de estos valores: ${listedValues(m)}`,
  isIn: (l, m) => `${l} debe ser uno de estos valores: ${listedValues(m)}`,
  whitelistValidation: (_l, m) =>
    `No se reconoce el campo "${m.replace(/^property\s+|\s+should not exist$/g, '')}"`,
};

/**
 * Distingue el texto por defecto de class-validator (siempre en inglés) de un
 * mensaje propio. Importa porque varias reglas nuestras usan `matches` con un
 * mensaje mucho más útil que el genérico: traducirlas lo echaría a perder.
 */
const isDefaultMessage = (message: string) =>
  / must | should /.test(message) || message.startsWith('All ');

/**
 * Un mensaje propio (los que escribimos en español con `$property`) llega con
 * el nombre crudo delante; se cambia por la etiqueta y se deja intacto el
 * resto, que ya está redactado para el usuario.
 */
function translate(property: string, key: string, message: string) {
  const label = Field(property);
  const template = TEMPLATES[key];
  if (template && isDefaultMessage(message)) return template(label, message);
  return message.startsWith(`${property} `)
    ? `${label}${message.slice(property.length)}`
    : message;
}

/** Aplana los errores anidados (objetos y listas) a una lista de mensajes. */
function collect(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.entries(error.constraints ?? {}).map(([key, message]) =>
      translate(error.property, key, message),
    ),
    ...collect(error.children ?? []),
  ]);
}

/**
 * Convierte los errores de class-validator en mensajes que puede leer quien
 * llena el formulario. Se conecta al ValidationPipe global en main.ts.
 */
export const validationExceptionFactory = (errors: ValidationError[]) =>
  new BadRequestException(collect(errors));
