import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from 'react-i18next';
import { journalService, type TradeNote } from '../services/journal';
import { Loader2, Save, Calendar, AlertCircle } from 'lucide-react';

// Define local interface replacing BybitExecution
interface TradeExecution {
    symbol: string;
    execId: string;
    orderId: string;
    side: 'Buy' | 'Sell';
    orderQty: string;
    execPrice: string;
    execValue: string;
    execFee: string;
    execTime: string;
    execType: string;
}

const TradeJournal: React.FC = () => {
    const { t } = useTranslation();
    const [executions, setExecutions] = useState<TradeExecution[]>([]);
    const [category, setCategory] = useState<'linear' | 'inverse'>('linear');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, TradeNote>>({});
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');



    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Mock empty data or fetch from manual entry source in future
            const mockExecutions: TradeExecution[] = [];

            setExecutions(mockExecutions);

            if (mockExecutions.length > 0) {
                const tradeIds = mockExecutions.map(e => e.execId);
                const fetchedNotes = await journalService.getNotes(tradeIds);
                setNotes(prev => {
                    const next = { ...prev };
                    fetchedNotes.forEach(n => {
                        next[n.trade_id] = n;
                    });
                    return next;
                });
            }
        } catch (err) {
            console.error(err);
            setError(t('journal.errorLoading'));
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => {
        loadData();
    };



    const handleSaveNote = async (execution: TradeExecution) => {
        try {
            const note: TradeNote = {
                trade_id: execution.execId,
                symbol: execution.symbol,
                side: execution.side,
                note: noteText
            };

            const savedNote = await journalService.saveNote(note);
            if (savedNote) {
                setNotes(prev => ({
                    ...prev,
                    [savedNote.trade_id]: savedNote
                }));
                setEditingNoteId(null);
                setNoteText('');
            }
        } catch (err) {
            console.error('Error saving note:', err);
            alert(t('journal.saveError'));
        }
    };

    const startEditing = (tradeId: string, currentNote?: string) => {
        setEditingNoteId(tradeId);
        setNoteText(currentNote || '');
    };

    const formatTime = (ts: string) => {
        return new Date(parseInt(ts)).toLocaleString();
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Calendar className="text-blue-500" />
                        {t('journal.title')}
                    </h1>
                    <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                        <button
                            onClick={() => setCategory('linear')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${category === 'linear' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            USDT Perp (Linear)
                        </button>
                        <button
                            onClick={() => setCategory('inverse')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${category === 'inverse' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Inverse
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle className="shrink-0" />
                        <p>{error}</p>
                    </div>
                )}





                {/* Recent Executions Section */}
                < div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden" >
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="font-semibold text-white">{t('journal.recentExecutions')}</h2>
                        <button
                            onClick={handleFilter}
                            disabled={loading}
                            className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1"
                        >
                            {loading ? (
                                <><Loader2 size={14} className="animate-spin" /> {t('journal.refreshing')}</>
                            ) : (
                                t('journal.refresh')
                            )}
                        </button>
                    </div>

                    {
                        loading && executions.length === 0 ? (
                            <div className="p-12 flex justify-center">
                                <Loader2 className="animate-spin text-blue-500" size={32} />
                            </div>
                        ) : executions.length === 0 && !error ? (
                            <div className="p-12 text-center text-gray-500">
                                {t('journal.noTrades')}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-900/50 text-gray-400 text-sm">
                                            <tr>
                                                <th className="p-4 font-medium">{t('journal.timeSymbol')}</th>
                                                <th className="p-4 font-medium">{t('journal.side')}</th>
                                                <th className="p-4 font-medium">{t('journal.price')}</th>
                                                <th className="p-4 font-medium">{t('journal.qty')}</th>
                                                <th className="p-4 font-medium">{t('journal.fee')}</th>
                                                <th className="p-4 font-medium w-1/3">{t('journal.notes')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 text-sm">
                                            {executions.map((exec) => {
                                                const note = notes[exec.execId];
                                                const isEditing = editingNoteId === exec.execId;
                                                const isBuy = exec.side === 'Buy';

                                                return (
                                                    <tr key={exec.execId} className="hover:bg-gray-700/30 transition-colors">
                                                        <td className="p-4 align-top">
                                                            <div className="text-white font-medium">{exec.symbol}</div>
                                                            <div className="text-xs text-gray-500">{formatTime(exec.execTime)}</div>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${isBuy ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                                                }`}>
                                                                {exec.side}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 align-top text-gray-300 font-mono">
                                                            {exec.execPrice}
                                                        </td>
                                                        <td className="p-4 align-top text-gray-300 font-mono">
                                                            {exec.orderQty}
                                                        </td>
                                                        <td className="p-4 align-top text-gray-400 text-sm font-mono">
                                                            {exec.execFee}
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            {isEditing ? (
                                                                <div className="space-y-2">
                                                                    <textarea
                                                                        value={noteText}
                                                                        onChange={(e) => setNoteText(e.target.value)}
                                                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                                                                        rows={2}
                                                                        placeholder={t('journal.writeNote')}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleSaveNote(exec)}
                                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1"
                                                                        >
                                                                            <Save size={12} /> {t('journal.save')}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingNoteId(null)}
                                                                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                                                                        >
                                                                            {t('journal.cancel')}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    onClick={() => startEditing(exec.execId, note?.note)}
                                                                    className="group cursor-pointer min-h-[40px] rounded p-2 hover:bg-gray-700/50 border border-transparent hover:border-gray-600/50 transition-all"
                                                                >
                                                                    {note?.note ? (
                                                                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.note}</p>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-600 italic group-hover:text-gray-400">{t('journal.clickToAddNote')}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )
                    }
                </div >
            </div >
        </MainLayout >
    );
};

export default TradeJournal;
