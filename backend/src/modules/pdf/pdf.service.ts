import { Injectable, Logger } from '@nestjs/common';
import pdfmake from 'pdfmake';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces.js';
import { money, sum } from '../../common/math/decimal.util.js';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  AmortizationResult,
  InvestmentResult,
} from '../../common/math/financial-math.js';
import type { InstitutionConfig } from '../../generated/prisma/client.js';

// Fuentes estándar PDF: no requieren archivos .ttf en el servidor.
const HELVETICA = {
  normal: 'Helvetica',
  bold: 'Helvetica-Bold',
  italics: 'Helvetica-Oblique',
  bolditalics: 'Helvetica-BoldOblique',
};
pdfmake.setFonts({ Helvetica: HELVETICA });
// Sin descargas remotas ni lectura de disco (salvo fuentes estándar): el logo va como data URL.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((path) => Object.values(HELVETICA).includes(path));

export type CreditSimulation = AmortizationResult & {
  creditType: { id: number; name: string };
};
export type InvestmentSimulation = InvestmentResult & {
  plan: { id: number; name: string };
};

const PRIMARY = '#1F3A5F';
const METHOD_LABEL = {
  FRENCH: 'Francés (cuota fija)',
  GERMAN: 'Alemán (amortización constante)',
};
const PAYOUT_LABEL = {
  AT_MATURITY: 'Al vencimiento',
  MONTHLY: 'Pago mensual de intereses',
};

/** "12345.60" → "$ 12,345.60" sin pasar por number. */
const usd = (value: string) => {
  const [int, dec] = value.split('.');
  return `$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
};

const dateEc = (date: Date) =>
  date.toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'long',
  });

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly prisma: PrismaService) {}

  async amortizationTable(
    institution: InstitutionConfig,
    sim: CreditSimulation,
  ): Promise<Buffer> {
    const { summary, schedule } = sim;
    const feeNames = schedule[0].fees.map((f) => f.name);
    const header = [
      'N°',
      'Saldo inicial',
      'Capital',
      'Interés',
      ...feeNames,
      'Cuota total',
      'Saldo final',
    ];
    const totalsRow: TableCell[] = [
      { text: 'Totales', bold: true, colSpan: 2 },
      '',
      usd(summary.totalPrincipal),
      usd(summary.totalInterest),
      ...feeNames.map((_, idx) =>
        usd(sumColumn(schedule.map((r) => r.fees[idx].amount))),
      ),
      usd(sumColumn(schedule.map((r) => r.totalPayment))),
      '',
    ];

    const body: TableCell[][] = [
      header.map((text) => ({ text, style: 'th', alignment: 'center' })),
      ...schedule.map((r) => [
        r.period.toString(),
        usd(r.openingBalance),
        usd(r.principal),
        usd(r.interest),
        ...r.fees.map((f) => usd(f.amount)),
        usd(r.totalPayment),
        usd(r.closingBalance),
      ]),
      totalsRow.map((c) =>
        typeof c === 'string' ? { text: c, bold: true } : c,
      ),
    ];

    return this.render(
      institution,
      'TABLA DE AMORTIZACIÓN',
      [
        keyValueGrid([
          ['Tipo de crédito', sim.creditType.name],
          ['Sistema', METHOD_LABEL[summary.method]],
          ['Monto solicitado', usd(summary.principal)],
          ['Plazo', `${summary.termMonths} meses`],
          ['Tasa nominal anual', `${summary.nominalAnnualRatePct} %`],
          ['Tasa efectiva anual', `${summary.effectiveAnnualRatePct} %`],
          ['Primera cuota', usd(summary.firstPayment)],
          ['Última cuota', usd(summary.lastPayment)],
          ['Total intereses', usd(summary.totalInterest)],
          [
            'Total cargos indirectos',
            usd(
              sumColumn([summary.totalPeriodicFees, summary.totalUpfrontFees]),
            ),
          ],
          ...summary.upfrontFees.map((f): [string, string] => [
            `${f.name} (descontado)`,
            usd(f.amount),
          ]),
          ['Monto líquido a recibir', usd(summary.netDisbursement)],
          ['Costo total del crédito', usd(summary.totalCreditCost)],
          ['Total a pagar', usd(summary.totalPaid)],
        ]),
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: [22, ...Array(header.length - 1).fill('*')],
            body,
          },
          layout: zebra,
          fontSize: 7.5,
          alignment: 'right',
          margin: [0, 12, 0, 0],
        },
      ],
      'landscape',
      [
        'Firma del solicitante',
        `Asesor de crédito — ${institution.institutionName}`,
      ],
    );
  }

  async investmentCertificate(
    institution: InstitutionConfig,
    sim: InvestmentSimulation,
  ): Promise<Buffer> {
    const start = new Date();
    const maturity = new Date(start.getTime() + sim.termDays * 86_400_000);

    return this.render(
      institution,
      'CERTIFICADO DE SIMULACIÓN — PÓLIZA A PLAZO FIJO',
      [
        keyValueGrid([
          ['Producto', sim.plan.name],
          ['Capital', usd(sim.amount)],
          ['Tasa efectiva anual (TEA)', `${sim.teaPct} %`],
          ['Plazo', `${sim.termDays} días (base 360)`],
          ['Fecha de emisión', dateEc(start)],
          ['Fecha de vencimiento', dateEc(maturity)],
          ['Liquidación', PAYOUT_LABEL[sim.payoutMethod]],
          ['Interés bruto', usd(sim.grossInterest)],
          [
            `Retención en la fuente (${sim.withholdingRatePct} %)`,
            usd(sim.withholding),
          ],
          ['Interés neto', usd(sim.netInterest)],
          ...(sim.monthlyPayment
            ? [
                ['Pago mensual neto', usd(sim.monthlyPayment)] as [
                  string,
                  string,
                ],
              ]
            : []),
          ['Total a recibir', usd(sim.totalToReceive)],
        ]),
        { text: 'Cronograma de pagos', style: 'h2' },
        {
          table: {
            headerRows: 1,
            widths: [25, 45, '*', '*', '*', '*', '*'],
            body: [
              [
                'N°',
                'Día',
                'Interés bruto',
                'Retención',
                'Interés neto',
                'Capital',
                'Total',
              ].map((text) => ({ text, style: 'th', alignment: 'center' })),
              ...sim.payoutSchedule.map((r) => [
                r.period.toString(),
                r.day.toString(),
                usd(r.grossInterest),
                usd(r.withholding),
                usd(r.netInterest),
                usd(r.capitalReturned),
                usd(r.totalPayment),
              ]),
            ],
          },
          layout: zebra,
          fontSize: 9,
          alignment: 'right',
        },
      ],
      'portrait',
      [
        'Firma del inversionista',
        `Representante legal — ${institution.legalRepresentative}`,
      ],
    );
  }

  private async render(
    institution: InstitutionConfig,
    title: string,
    content: Content[],
    pageOrientation: 'portrait' | 'landscape',
    signatures: [string, string],
  ): Promise<Buffer> {
    const build = (logo: string | null): TDocumentDefinitions => ({
      pageSize: 'A4',
      pageOrientation,
      pageMargins: [36, 36, 36, 48],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      styles: {
        institution: { fontSize: 14, bold: true, color: PRIMARY },
        title: {
          fontSize: 12,
          bold: true,
          alignment: 'center',
          margin: [0, 14, 0, 10],
          color: PRIMARY,
        },
        h2: { fontSize: 10, bold: true, margin: [0, 14, 0, 6], color: PRIMARY },
        th: {
          bold: true,
          color: 'white',
          fillColor: PRIMARY,
          alignment: 'center',
        },
        muted: { fontSize: 8, color: '#555555' },
      },
      footer: (page, pages) => ({
        columns: [
          { text: `Generado el ${dateEc(new Date())}`, style: 'muted' },
          {
            text: `Página ${page} de ${pages}`,
            style: 'muted',
            alignment: 'right',
          },
        ],
        margin: [36, 16, 36, 0],
      }),
      content: [
        {
          columns: [
            ...(logo
              ? [{ image: logo, fit: [90, 60] as [number, number], width: 100 }]
              : []),
            {
              stack: [
                { text: institution.institutionName, style: 'institution' },
                { text: `RUC: ${institution.ruc}`, style: 'muted' },
                { text: institution.address, style: 'muted' },
                {
                  text: `${institution.phone} · ${institution.email}`,
                  style: 'muted',
                },
              ],
            },
          ],
          columnGap: 12,
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 8,
              x2: pageOrientation === 'landscape' ? 770 : 523,
              y2: 8,
              lineColor: PRIMARY,
            },
          ],
        },
        { text: title, style: 'title' },
        ...content,
        {
          text: institution.disclaimerText,
          style: 'muted',
          italics: true,
          margin: [0, 16, 0, 0],
        },
        {
          columns: signatures.map((label) => ({
            stack: [
              { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 220, y2: 0 }] },
              { text: label, alignment: 'center', margin: [0, 4, 0, 0] },
            ],
          })),
          margin: [0, 60, 0, 0],
          unbreakable: true,
        },
      ],
    });
    const logo = await this.logoDataUrl(institution.logoUrl);
    try {
      return await pdfmake.createPdf(build(logo)).getBuffer();
    } catch (error) {
      if (!logo) throw error;
      // Un logo corrupto no debe bloquear la emisión de documentos.
      this.logger.warn(
        `Logo inválido, se genera PDF sin logo: ${String(error)}`,
      );
      return pdfmake.createPdf(build(null)).getBuffer();
    }
  }

  /**
   * El logo se incrusta como data URL: pdfmake tiene prohibido salir a la red o
   * al disco. Vive en la base (InstitutionAsset), igual que lo sirve la API.
   */
  private async logoDataUrl(logoUrl: string | null): Promise<string | null> {
    if (!logoUrl) return null;
    const asset = await this.prisma.institutionAsset.findUnique({
      where: { kind: 'logo' },
    });
    if (!asset) {
      this.logger.warn('Logo no cargado: el PDF sale sin marca');
      return null;
    }
    return `data:${asset.mimeType};base64,${Buffer.from(asset.data).toString('base64')}`;
  }
}

function keyValueGrid(rows: [string, string][]): Content {
  return {
    table: {
      widths: ['auto', '*'],
      body: rows.map(([k, v]) => [
        { text: k, bold: true },
        { text: v, alignment: 'right' },
      ]),
    },
    layout: 'lightHorizontalLines',
  };
}

const zebra = {
  fillColor: (row: number) => (row > 0 && row % 2 === 0 ? '#F2F5F9' : null),
  hLineWidth: () => 0.5,
  vLineWidth: () => 0,
  hLineColor: () => '#CCCCCC',
};

const sumColumn = (values: string[]) => money(sum(values));
