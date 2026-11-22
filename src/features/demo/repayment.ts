import { simulateRepayment, type RepaymentRequest, type RepaymentResult } from '@/features/liabilities/repayment';
import { AppError } from '@/utils/errors/app-error';

const AMOUNT_MAX = 1_000_000_000;

function invalid(message: string): never {
    throw new AppError(message, 400);
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Simulation de remboursement de la démo : mêmes limites que l'API, même calcul que la page. */
export function demoRepaymentSimulation(request: RepaymentRequest): RepaymentResult {
    const principal = round2(Number(request.principal));
    const payment = round2(Number(request.monthlyPayment));
    const rate = round2(Number(request.annualRatePercent));
    if (!(principal > 0 && principal <= AMOUNT_MAX)) invalid('Le capital doit être compris entre 0,01 et 1 000 000 000.');
    if (!(payment > 0 && payment <= AMOUNT_MAX)) invalid('La mensualité doit être comprise entre 0,01 et 1 000 000 000.');
    if (!(rate >= 0 && rate <= 100)) invalid('Le taux annuel doit être compris entre 0 et 100 %.');
    return simulateRepayment({ principal, annualRatePercent: rate, monthlyPayment: payment });
}
