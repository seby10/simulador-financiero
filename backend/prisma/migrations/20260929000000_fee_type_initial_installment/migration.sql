-- % del monto repartido en las cuotas, separado del cobro único al desembolsar.
ALTER TYPE "FeeType" ADD VALUE IF NOT EXISTS 'PERCENTAGE_INITIAL_INSTALLMENT';
