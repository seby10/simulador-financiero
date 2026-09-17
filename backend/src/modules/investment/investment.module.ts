import { Module } from '@nestjs/common';
import { InstitutionModule } from '../institution/institution.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { InvestmentController } from './investment.controller.js';
import { InvestmentService } from './investment.service.js';

@Module({
  imports: [InstitutionModule, PdfModule],
  controllers: [InvestmentController],
  providers: [InvestmentService],
  exports: [InvestmentService],
})
export class InvestmentModule {}
