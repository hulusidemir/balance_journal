import type { PlanSettings } from './planGenerator';

export interface PlanProgress {
  actualBalance: number;
}

export interface Plan {
  id: string;
  name: string;
  settings: PlanSettings;
  progress: Record<number, PlanProgress>;
  createdAt: string;
}

const PLANS_KEY = 'trade_wallet_plans';
const ACTIVE_PLAN_KEY = 'trade_wallet_active_plan_id';

export const getPlans = (): Plan[] => {
  const plansJson = localStorage.getItem(PLANS_KEY);
  return plansJson ? JSON.parse(plansJson) : [];
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
    createdAt: new Date().toISOString(),
  };
  const plans = getPlans();
  plans.push(newPlan);
  savePlans(plans);
  return newPlan;
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
  
  savePlans(plans);
};

export const deletePlan = (planId: string) => {
  const plans = getPlans();
  const newPlans = plans.filter(p => p.id !== planId);
  savePlans(newPlans);
  
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
