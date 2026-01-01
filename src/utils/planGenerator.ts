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
  
  // User input fields (optional/nullable initially)
  actualBalance?: number;
  actualProfit?: number;
  isCompleted?: boolean;
}

export const generatePlan = (settings: PlanSettings): PlanDay[] => {
  const plan: PlanDay[] = [];
  let currentBalance = settings.startBalance;
  const date = new Date(settings.startDate);

  for (let i = 1; i <= settings.days; i++) {
    const targetProfit = currentBalance * (settings.dailyProfitTargetPercent / 100);
    const expectedEndBalance = currentBalance + targetProfit;
    
    plan.push({
      day: i,
      date: date.toLocaleDateString('tr-TR'), // Turkish format as per screenshot
      startBalance: currentBalance,
      targetProfit: targetProfit,
      expectedEndBalance: expectedEndBalance
    });

    currentBalance = expectedEndBalance;
    date.setDate(date.getDate() + 1);
  }
  
  return plan;
};
