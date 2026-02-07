import type { Debt, Withdrawal } from './storage';
import { formatLocalDate } from './dateUtils';

export const generateDebtWithdrawals = (debts: Debt[]): Withdrawal[] => {
    const withdrawals: Withdrawal[] = [];

    debts.forEach(debt => {
        // Determine the first valid payment date
        let currentDate = new Date(debt.startDate);

        // Reset time to avoid timezone/time issues
        currentDate.setHours(0, 0, 0, 0);

        if (debt.frequency === 'monthly') {
            // Check if startDate matches the payment day strictly?
            // User says: Start Jan 1, Payment Day 15. First payment Jan 15.
            // User says: Start Jan 20, Payment Day 15. First payment Feb 15.

            const targetDay = debt.paymentDay;
            // Create a candidate date for the current month of the Start Date
            let candidate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);

            // If candidate is before startDate, we must move to next month
            if (candidate < currentDate) {
                candidate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, targetDay);
            }
            currentDate = candidate;
        } else if (debt.frequency === 'weekly') {
            const targetDay = debt.paymentDay === 7 ? 0 : debt.paymentDay; // 0=Sun, 1=Mon...
            const currentDay = currentDate.getDay();

            let diff = targetDay - currentDay;
            if (diff < 0) diff += 7;

            currentDate.setDate(currentDate.getDate() + diff);
        }

        // Generate N installments
        for (let i = 0; i < debt.totalInstallments; i++) {
            withdrawals.push({
                id: `debt-${debt.id}-${i}`,
                amount: debt.amount,
                date: formatLocalDate(currentDate),
                type: 'one-time', // Treated as one-time specific dates
                description: `${debt.description} (${i + 1}/${debt.totalInstallments})`,
                frequency: undefined
            });

            // Advance date
            if (debt.frequency === 'monthly') {
                // Advance 1 month, trying to keep the paymentDay
                // Using the loop index to calculate from *base* would be cleaner to avoid drift if we cared about strictness,
                // but re-instantiating using the original paymentDay ensures we return to 30/31 if a month pushed us to Mar 2.
                // e.g. Feb 31 -> Mar 3. Next: Mar 31 -> Mar 31.
                // So we always construct from year/month but FORCE the original paymentDay.

                // Get month/year of the *next* logical month
                // Note: currentDate is already the valid payment date for iter i. 
                // We need date for iter i+1.
                // Actually, simply adding 1 to month of *current payment date* works.

                const nextMonth = currentDate.getMonth() + 1;
                const year = currentDate.getFullYear();

                // Construct new date
                currentDate = new Date(year, nextMonth, debt.paymentDay);
            } else {
                currentDate.setDate(currentDate.getDate() + 7);
            }
        }
    });

    return withdrawals;
};
