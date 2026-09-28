import type { CSSProperties } from "react";

/**
 * Paleta institucional configurable desde el panel de administración.
 *
 * Los valores por defecto son los mismos que declara `InstitutionConfig` en
 * `prisma/schema.prisma`. Antes cada pantalla repetía su propia paleta a mano,
 * así que cambiar un color en administración no se veía en ningún lado; ahora
 * todo el sitio lee estas variables CSS y la configuración manda de verdad.
 */
export const BRAND_DEFAULTS = {
  primaryColor: "#003b70",
  secondaryColor: "#35b8db",
  accentColor: "#10b981",
  navbarBgColor: "#ffffff",
  navbarTextColor: "#1e293b",
  pageBgColor: "#f8fafc",
  cardBgColor: "#ffffff",
  footerBgColor: "#003b70",
  footerTextColor: "#e2e8f0",
} as const;

export type BrandColors = typeof BRAND_DEFAULTS;
export type BrandField = keyof BrandColors;

/** Campos de color, para recorrerlos sin repetir la lista. */
export const BRAND_FIELDS = Object.keys(BRAND_DEFAULTS) as BrandField[];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** El valor guardado, o el de fábrica si viene vacío o con un formato raro. */
export const brandColor = (
  config: Partial<Record<BrandField, unknown>> | null | undefined,
  field: BrandField,
) => {
  const value = config?.[field];
  return typeof value === "string" && HEX.test(value)
    ? value
    : BRAND_DEFAULTS[field];
};

/** Luminancia relativa (WCAG 2.1) de un color `#rrggbb`. */
function luminance(hex: string) {
  const channels = [1, 3, 5].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Color de texto legible sobre un fondo de marca. El administrador elige los
 * fondos pero no el texto que va encima: con el blanco fijo, un amarillo o un
 * celeste claro dejaban los botones ilegibles.
 */
export const readableOn = (hex: string) =>
  HEX.test(hex) && luminance(hex) > 0.45 ? "#111827" : "#ffffff";

/**
 * Variables CSS de marca para el `<body>`. Las `-fg` acompañan a cada fondo
 * con el texto que sí se lee encima; las derivadas (`-dark`, mezclas) las
 * calcula `globals.css` con `color-mix`.
 */
export function brandStyle(
  config: Partial<Record<BrandField, unknown>> | null | undefined,
): CSSProperties {
  const color = (field: BrandField) => brandColor(config, field);
  const primary = color("primaryColor");
  const secondary = color("secondaryColor");
  const accent = color("accentColor");
  const card = color("cardBgColor");

  return {
    "--brand-primary": primary,
    "--brand-primary-fg": readableOn(primary),
    "--brand-secondary": secondary,
    "--brand-secondary-fg": readableOn(secondary),
    "--brand-accent": accent,
    "--brand-accent-fg": readableOn(accent),
    "--brand-navbar-bg": color("navbarBgColor"),
    "--brand-navbar-text": color("navbarTextColor"),
    "--brand-page-bg": color("pageBgColor"),
    "--brand-card-bg": card,
    "--brand-card-fg": readableOn(card),
    "--brand-footer-bg": color("footerBgColor"),
    "--brand-footer-text": color("footerTextColor"),
  } as CSSProperties;
}
