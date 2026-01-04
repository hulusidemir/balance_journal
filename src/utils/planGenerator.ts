import type { Withdrawal } from './storage';

export interface PlanSettings {
  startBalance: number;
  startDate: string; // YYYY-MM-DD
  dailyProfitTargetPercent: number;
  days: number;
}

export interface PlanDay {
  day: number;
  date: string;
  startBalance: number; // Expected
  targetProfit: number;
  expectedEndBalance: number;
  withdrawalAmount?: number;
  
  // User input fields (optional/nullable initially)
  actualBalance?: number;
  actualProfit?: number;
  isCompleted?: boolean;
}

export const generatePlan = (settings: PlanSettings, withdrawals: Withdrawal[] = []): PlanDay[] => {
  const plan: PlanDay[] = [];
  let currentBalance = settings.startBalance;
  const date = new Date(settings.startDate);

  for (let i = 1; i <= settings.days; i++) {
    // Check for withdrawals on this date
    const currentDateStr = date.toISOString().split('T')[0];
    let dailyWithdrawal = 0;

    withdrawals.forEach(w => {
      const wDate = new Date(w.date);
      const currentDate = new Date(currentDateStr);
      
      // Reset hours for accurate comparison
      wDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);

      if (currentDate.getTime() < wDate.getTime()) return;

      if (w.type === 'one-time') {
        if (currentDate.getTime() === wDate.getTime()) {
          dailyWithdrawal += w.amount;
        }
      } else if (w.type === 'periodic') {
        const diffTime = Math.abs(currentDate.getTime() - wDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (w.frequency === 'daily') {
          dailyWithdrawal += w.amount;
        } else if (w.frequency === 'weekly') {
          if (diffDays % 7 === 0) {
            dailyWithdrawal += w.amount;
          }
        } else if (w.frequency === 'monthly') {
          if (currentDate.getDate() === wDate.getDate()) {
            dailyWithdrawal += w.amount;
          }
        }
      }
    });

    // Apply withdrawal to start balance of the day? 
    // Or should it be subtracted at the end?
    // User said: "Subtract the money ... from the balance of the day we will make the withdrawal."
    // Usually you withdraw from what you have.
    // Let's assume: Start Balance -> Profit -> End Balance -> Withdrawal -> Next Day Start
    // But if I withdraw, I have less capital to trade with?
    // "Withdrawal from the balance of the day" implies it reduces the available balance.
    // Let's assume it reduces the *Start Balance* for the day if it happens before trading, 
    // or *End Balance* if after.
    // Most conservative: It reduces the capital available for the NEXT day.
    // But the user wants to see it on the day.
    // Let's subtract it from the *Expected End Balance* of that day, and thus the *Start Balance* of the next day.
    
    const targetProfit = currentBalance * (settings.dailyProfitTargetPercent / 100);
    let expectedEndBalance = currentBalance + targetProfit;
    
    if (dailyWithdrawal > 0) {
      expectedEndBalance -= dailyWithdrawal;
    }

    plan.push({
      day: i,
      date: date.toLocaleDateString('tr-TR'), // Turkish format as per screenshot
      startBalance: currentBalance,
      targetProfit: targetProfit,
      expectedEndBalance: expectedEndBalance,
      withdrawalAmount: dailyWithdrawal > 0 ? dailyWithdrawal : undefined
    });

    currentBalance = expectedEndBalance;
    date.setDate(date.getDate() + 1);
  }
  
  return plan;
};
