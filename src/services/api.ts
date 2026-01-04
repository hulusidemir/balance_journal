import { supabase } from '../lib/supabase';
import type { PlanSettings } from '../utils/planGenerator';
import type { Plan } from '../utils/storage';

// Map database rows to application types
const mapPlanFromDb = (row: any): Plan => ({
  id: row.id,
  name: row.name,
  settings: row.settings,
  progress: {}, // Will be populated separately
  withdrawals: [], // Initialize empty, will be populated if available or merged
  createdAt: row.created_at
});

export const api = {
  // Plans
  async getPlans(): Promise<Plan[]> {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!plans) return [];

    // Fetch progress for all plans
    const { data: progress, error: progressError } = await supabase
      .from('plan_progress')
      .select('*');

    if (progressError) throw progressError;

    const mappedPlans = plans.map(mapPlanFromDb);

    // Attach progress to plans
    progress?.forEach((p: any) => {
      const plan = mappedPlans.find(mp => mp.id === p.plan_id);
      if (plan) {
        plan.progress[p.day_number] = { actualBalance: Number(p.actual_balance) };
      }
    });

    return mappedPlans;
  },

  async createPlan(name: string, settings: PlanSettings): Promise<Plan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        name,
        settings
      })
      .select()
      .single();

    if (error) throw error;
    return mapPlanFromDb(data);
  },

  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },

  // Progress
  async updateProgress(planId: string, day: number, actualBalance: number | undefined): Promise<void> {
    if (actualBalance === undefined) {
      // Delete progress
      const { error } = await supabase
        .from('plan_progress')
        .delete()
        .match({ plan_id: planId, day_number: day });
      
      if (error) throw error;
    } else {
      // Upsert progress
      const { error } = await supabase
        .from('plan_progress')
        .upsert({
          plan_id: planId,
          day_number: day,
          actual_balance: actualBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'plan_id,day_number' });

      if (error) throw error;
    }
  }
};
