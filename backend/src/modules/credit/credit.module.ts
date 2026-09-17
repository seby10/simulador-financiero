import { Module } from '@nestjs/common';
import { InstitutionModule } from '../institution/institution.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { CreditController } from './credit.controller.js';
import { CreditService } from './credit.service.js';

@Module({
  imports: [InstitutionModule, PdfModule],
  controllers: [CreditController],
  providers: [CreditService],
})
export class CreditModule {}
