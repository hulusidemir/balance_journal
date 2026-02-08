import { supabase } from '../lib/supabase';

export interface TradeNote {
    id?: string;
    user_id?: string;
    trade_id: string;
    symbol?: string;
    side?: string;
    note: string;
    created_at?: string;
    updated_at?: string;
}

export const journalService = {
    async getNotes(tradeIds: string[]): Promise<TradeNote[]> {
        if (tradeIds.length === 0) return [];

        const { data, error } = await supabase
            .from('trade_notes')
            .select('*')
            .in('trade_id', tradeIds);

        if (error) {
            console.error('Error fetching trade notes:', error);
            return [];
        }

        return data || [];
    },

    async saveNote(note: TradeNote): Promise<TradeNote | null> {
        const user = await supabase.auth.getUser();
        if (!user.data.user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('trade_notes')
            .upsert({
                user_id: user.data.user.id,
                trade_id: note.trade_id,
                symbol: note.symbol,
                side: note.side,
                note: note.note,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, trade_id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving trade note:', error);
            throw error;
        }

        return data;
    }
};
