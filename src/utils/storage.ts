import type { PlanSettings } from './planGenerator';

export interface Debt {
  id: string;
  description: string;
  amount: number;
  totalInstallments: number; // Duration (count of weeks or months)
  frequency: 'weekly' | 'monthly';
  paymentDay: number; // Day of month (1-31) or Day of week (1=Monday...7=Sunday)
  startDate: string; // YYYY-MM-DD
}

export interface Withdrawal {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'one-time' | 'periodic';
  frequency?: 'daily' | 'weekly' | 'monthly';
  description?: string;
}

export interface PlanProgress {
  actualBalance: number;
}

export interface Plan {
  id: string;
  name: string;
  settings: PlanSettings;
  progress: Record<number, PlanProgress>;
  withdrawals: Withdrawal[];
  createdAt: string;
}

const PLANS_KEY = 'trade_wallet_plans';
const ACTIVE_PLAN_KEY = 'trade_wallet_active_plan_id';
const WITHDRAWALS_KEY = 'trade_wallet_withdrawals';
const DEBTS_KEY = 'trade_wallet_debts';

export const getDebts = (planId: string): Debt[] => {
  const allDebts = JSON.parse(localStorage.getItem(DEBTS_KEY) || '{}');
  return allDebts[planId] || [];
};

export const saveDebts = (planId: string, debts: Debt[]) => {
  const allDebts = JSON.parse(localStorage.getItem(DEBTS_KEY) || '{}');
  allDebts[planId] = debts;
  localStorage.setItem(DEBTS_KEY, JSON.stringify(allDebts));
};

export const addDebt = (planId: string, debt: Omit<Debt, 'id'>) => {
  const debts = getDebts(planId);
  const newDebt: Debt = {
    ...debt,
    id: crypto.randomUUID()
  };
  debts.push(newDebt);
  saveDebts(planId, debts);
  return newDebt;
};

export const removeDebt = (planId: string, debtId: string) => {
  const debts = getDebts(planId);
  const newDebts = debts.filter(d => d.id !== debtId);
  saveDebts(planId, newDebts);
};

export const updateDebt = (planId: string, debtId: string, updatedDebt: Omit<Debt, 'id'>) => {
  const debts = getDebts(planId);
  const debtIndex = debts.findIndex(d => d.id === debtId);
  if (debtIndex === -1) return;
  debts[debtIndex] = { ...updatedDebt, id: debtId };
  saveDebts(planId, debts);
};


export const getWithdrawals = (planId: string): Withdrawal[] => {
  const allWithdrawals = JSON.parse(localStorage.getItem(WITHDRAWALS_KEY) || '{}');
  return allWithdrawals[planId] || [];
};

export const saveWithdrawals = (planId: string, withdrawals: Withdrawal[]) => {
  const allWithdrawals = JSON.parse(localStorage.getItem(WITHDRAWALS_KEY) || '{}');
  allWithdrawals[planId] = withdrawals;
  localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(allWithdrawals));
};

export const getPlans = (): Plan[] => {
  const plansJson = localStorage.getItem(PLANS_KEY);
  const plans = plansJson ? JSON.parse(plansJson) : [];
  return plans.map((p: any) => ({
    ...p,
    withdrawals: getWithdrawals(p.id)
  }));
};

export const savePlans = (plans: Plan[]) => {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
};

export const createPlan = (name: string, settings: PlanSettings): Plan => {
  const newPlan: Plan = {
    id: crypto.randomUUID(),
    name,
    settings,
    progress: {},
    withdrawals: [],
    createdAt: new Date().toISOString(),
  };
  const plans = getPlans();
  // We don't want to save the withdrawals inside the plan object in localStorage if we are separating them,
  // but for consistency with getPlans, we can. 
  // However, savePlans just dumps the array.
  // Let's strip withdrawals before saving to avoid duplication/confusion?
  // Or just ignore them in savePlans.
  // Actually, getPlans adds them dynamically.
  // So when we save, we should probably save the "raw" plan without withdrawals, or it doesn't matter.
  // But wait, if I save plans with withdrawals, then getPlans will have them in the object AND add them again?
  // No, getPlans maps and overwrites `withdrawals`.

  plans.push(newPlan);
  // Strip withdrawals for saving to keep it clean
  const plansToSave = plans.map(({ withdrawals, ...rest }) => rest);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plansToSave));
  return newPlan;
};

export const addWithdrawal = (planId: string, withdrawal: Omit<Withdrawal, 'id'>) => {
  const withdrawals = getWithdrawals(planId);
  const newWithdrawal: Withdrawal = {
    ...withdrawal,
    id: crypto.randomUUID()
  };
  withdrawals.push(newWithdrawal);
  saveWithdrawals(planId, withdrawals);
  return newWithdrawal;
};

export const removeWithdrawal = (planId: string, withdrawalId: string) => {
  const withdrawals = getWithdrawals(planId);
  const newWithdrawals = withdrawals.filter(w => w.id !== withdrawalId);
  saveWithdrawals(planId, newWithdrawals);
};

export const updatePlanProgress = (planId: string, day: number, actualBalance: number | undefined) => {
  const plans = getPlans();
  const planIndex = plans.findIndex(p => p.id === planId);
  if (planIndex === -1) return;

  if (actualBalance === undefined) {
    delete plans[planIndex].progress[day];
  } else {
    plans[planIndex].progress[day] = { actualBalance };
  }

  // Strip withdrawals
  const plansToSave = plans.map(({ withdrawals, ...rest }) => rest);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plansToSave));
};

export const deletePlan = (planId: string) => {
  const plans = getPlans();
  const newPlans = plans.filter(p => p.id !== planId);
  const plansToSave = newPlans.map(({ withdrawals, ...rest }) => rest);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plansToSave));

  // Also delete withdrawals
  const allWithdrawals = JSON.parse(localStorage.getItem(WITHDRAWALS_KEY) || '{}');
  delete allWithdrawals[planId];
  localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(allWithdrawals));

  // If deleted plan was active, clear active plan
  if (getActivePlanId() === planId) {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
  }
};

export const getActivePlanId = (): string | null => {
  return localStorage.getItem(ACTIVE_PLAN_KEY);
};

export const setActivePlanId = (planId: string) => {
  localStorage.setItem(ACTIVE_PLAN_KEY, planId);
};

export const getActivePlan = (): Plan | null => {
  const activeId = getActivePlanId();
  if (!activeId) return null;
  const plans = getPlans();
  return plans.find(p => p.id === activeId) || null;
};

// Bybit Credentials
const BYBIT_API_KEY = 'BYBIT_API_KEY';
const BYBIT_API_SECRET = 'BYBIT_API_SECRET';

export const saveBybitCredentials = (key: string, secret: string) => {
  localStorage.setItem(BYBIT_API_KEY, key);
  localStorage.setItem(BYBIT_API_SECRET, secret);
};

export const getBybitCredentials = () => {
  return {
    apiKey: localStorage.getItem(BYBIT_API_KEY) || '',
    apiSecret: localStorage.getItem(BYBIT_API_SECRET) || ''
  };
};
