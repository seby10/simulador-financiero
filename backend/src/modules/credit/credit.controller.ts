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
  CreateCreditTypeDto,
  CreateIndirectFeeDto,
  CreditSimulationResponse,
  CreditTypeResponse,
  IndirectFeeResponse,
  SimulateCreditDto,
  UpdateCreditTypeDto,
  UpdateIndirectFeeDto,
} from './credit.dto.js';
import { CreditService } from './credit.service.js';

@ApiTags('Crédito')
@Controller('credit')
export class CreditController {
  constructor(
    private readonly credit: CreditService,
    private readonly institution: InstitutionService,
    private readonly pdf: PdfService,
  ) {}

  /** Lista los tipos de crédito (público). */
  @Get('types')
  @ApiOkResponse({ type: [CreditTypeResponse] })
  listTypes() {
    return this.credit.listTypes();
  }

  /** Obtiene un tipo de crédito (público). */
  @Get('types/:id')
  @ApiOkResponse({ type: CreditTypeResponse })
  @ApiNotFoundResponse()
  getType(@Param('id', ParseIntPipe) id: number) {
    return this.credit.getType(id);
  }

  /** Crea un tipo de crédito. */
  @Post('types')
  @AdminOnly()
  @ApiCreatedResponse({ type: CreditTypeResponse })
  @ApiConflictResponse({ description: 'Nombre duplicado' })
  createType(@Body() dto: CreateCreditTypeDto) {
    return this.credit.createType(dto);
  }

  /** Actualiza parcialmente un tipo de crédito. */
  @Patch('types/:id')
  @AdminOnly()
  @ApiOkResponse({ type: CreditTypeResponse })
  @ApiNotFoundResponse()
  updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCreditTypeDto,
  ) {
    return this.credit.updateType(id, dto);
  }

  /** Elimina un tipo de crédito. */
  @Delete('types/:id')
  @AdminOnly()
  @ApiOkResponse({ type: CreditTypeResponse })
  @ApiNotFoundResponse()
  deleteType(@Param('id', ParseIntPipe) id: number) {
    return this.credit.deleteType(id);
  }

  /** Lista los cargos indirectos (público, para elegir opcionales). */
  @Get('fees')
  @ApiOkResponse({ type: [IndirectFeeResponse] })
  listFees() {
    return this.credit.listFees();
  }

  /** Obtiene un cargo indirecto (público). */
  @Get('fees/:id')
  @ApiOkResponse({ type: IndirectFeeResponse })
  @ApiNotFoundResponse()
  getFee(@Param('id', ParseIntPipe) id: number) {
    return this.credit.getFee(id);
  }

  /** Crea un cargo indirecto. */
  @Post('fees')
  @AdminOnly()
  @ApiCreatedResponse({ type: IndirectFeeResponse })
  @ApiConflictResponse({ description: 'Nombre duplicado' })
  createFee(@Body() dto: CreateIndirectFeeDto) {
    return this.credit.createFee(dto);
  }

  /** Actualiza parcialmente un cargo indirecto. */
  @Patch('fees/:id')
  @AdminOnly()
  @ApiOkResponse({ type: IndirectFeeResponse })
  @ApiNotFoundResponse()
  updateFee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIndirectFeeDto,
  ) {
    return this.credit.updateFee(id, dto);
  }

  /** Elimina un cargo indirecto. */
  @Delete('fees/:id')
  @AdminOnly()
  @ApiOkResponse({ type: IndirectFeeResponse })
  @ApiNotFoundResponse()
  deleteFee(@Param('id', ParseIntPipe) id: number) {
    return this.credit.deleteFee(id);
  }

  /** Genera la tabla de amortización (Francés o Alemán) con cargos y resumen. */
  @Post('simulate')
  @HttpCode(200)
  @ApiOkResponse({ type: CreditSimulationResponse })
  @ApiBadRequestResponse({
    description: 'Monto/plazo fuera de rango o cargos inexistentes',
  })
  @ApiNotFoundResponse({ description: 'Tipo de crédito inexistente' })
  simulate(@Body() dto: SimulateCreditDto) {
    return this.credit.simulate(dto);
  }

  /** Tabla de amortización en PDF con membrete institucional y firmas. */
  @Post('simulate/pdf')
  @HttpCode(200)
  @ApiPdfResponse()
  async simulatePdf(@Body() dto: SimulateCreditDto) {
    const [simulation, institution] = await Promise.all([
      this.credit.simulate(dto),
      this.institution.get(),
    ]);
    const buffer = await this.pdf.amortizationTable(institution, simulation);
    return pdfFile(buffer, 'tabla-amortizacion.pdf');
  }
}
