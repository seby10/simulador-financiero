import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../common/auth.js';
import { ApiPdfResponse, pdfFile } from '../../common/http.js';
import { InstitutionService } from '../institution/institution.service.js';
import { PdfService } from '../pdf/pdf.service.js';
import {
  CreateInvestmentPlanDto,
  InvestmentPlanResponse,
  InvestmentSimulationResponse,
  SimulateInvestmentDto,
  UpdateInvestmentPlanDto,
} from './investment.dto.js';
import { InvestmentService } from './investment.service.js';

@ApiTags('Inversión')
@Controller('investment')
export class InvestmentController {
  constructor(
    private readonly investment: InvestmentService,
    private readonly institution: InstitutionService,
    private readonly pdf: PdfService,
  ) {}

  /** Lista las pólizas a plazo fijo (público). */
  @Get('plans')
  @ApiOkResponse({ type: [InvestmentPlanResponse] })
  list() {
    return this.investment.listPlans();
  }

  /** Obtiene una póliza (público). */
  @Get('plans/:id')
  @ApiOkResponse({ type: InvestmentPlanResponse })
  @ApiNotFoundResponse()
  get(@Param('id', ParseIntPipe) id: number) {
    return this.investment.getPlan(id);
  }

  /** Crea una póliza. */
  @Post('plans')
  @AdminOnly()
  @ApiCreatedResponse({ type: InvestmentPlanResponse })
  @ApiConflictResponse({ description: 'Nombre duplicado' })
  create(@Body() dto: CreateInvestmentPlanDto) {
    return this.investment.createPlan(dto);
  }

  /** Actualiza parcialmente una póliza. */
  @Patch('plans/:id')
  @AdminOnly()
  @ApiOkResponse({ type: InvestmentPlanResponse })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvestmentPlanDto,
  ) {
    return this.investment.updatePlan(id, dto);
  }

  /** Elimina una póliza sin solicitudes asociadas. */
  @Delete('plans/:id')
  @AdminOnly()
  @ApiOkResponse({ type: InvestmentPlanResponse })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'La póliza tiene solicitudes' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.investment.deletePlan(id);
  }

  /** Proyecta interés bruto, retención, pagos mensuales y total a recibir (base 360). */
  @Post('simulate')
  @HttpCode(200)
  @ApiOkResponse({ type: InvestmentSimulationResponse })
  @ApiBadRequestResponse({
    description: 'Monto/plazo fuera de rango o modalidad no permitida',
  })
  @ApiNotFoundResponse({ description: 'Póliza inexistente' })
  simulate(@Body() dto: SimulateInvestmentDto) {
    return this.investment.simulate(dto);
  }

  /** Certificado de simulación en PDF. */
  @Post('simulate/pdf')
  @HttpCode(200)
  @ApiPdfResponse()
  async simulatePdf(@Body() dto: SimulateInvestmentDto) {
    const [simulation, institution] = await Promise.all([
      this.investment.simulate(dto),
      this.institution.get(),
    ]);
    const buffer = await this.pdf.investmentCertificate(
      institution,
      simulation,
    );
    return pdfFile(buffer, 'certificado-inversion.pdf');
  }
}
