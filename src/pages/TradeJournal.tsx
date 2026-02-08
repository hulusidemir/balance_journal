import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from 'react-i18next';
import { bybitService } from '../services/bybit';
import { journalService, type TradeNote } from '../services/journal';
import { Loader2, AlertCircle, Save, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { enUS } from 'date-fns/locale/en-US';

const TradeJournal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [executions, setExecutions] = useState<any[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [notes, setNotes] = useState<Record<string, TradeNote>>({});
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [category, setCategory] = useState<'linear' | 'inverse'>('linear');
    const [limit] = useState(50);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [nextPageCursor, setNextPageCursor] = useState('');

    useEffect(() => {
        // Initial load
        loadData(true);
    }, [category]); // Only reload on category change automatically. Date changes differ.

    const loadData = async (reset: boolean = false) => {
        setLoading(true);
        setError(null);
        try {
            // Convert dates to timestamps if present
            const startTs = startDate ? new Date(startDate).getTime() : undefined;
            // For end date, we might want end of day? Or just the date. 
            // Usually valid to end of day if user picks a day. 
            // Let's assume user picks a date and we want up to that day (inclusive).
            // But HTML date input gives YYYY-MM-DD which is 00:00.
            // Let's add 1 day minus 1ms if endDate is set to cover the full day.
            const endTs = endDate ? new Date(endDate).getTime() + 86400000 - 1 : undefined;

            const cursor = reset ? undefined : nextPageCursor;

            const [execData, orders] = await Promise.all([
                bybitService.getExecutions(category, limit, startTs, endTs, cursor),
                reset ? bybitService.getOpenOrders(category, limit) : Promise.resolve([])
                // Only fetch orders on reset/initial, or maybe always? 
                // Orders are "realtime" snapshot, not paginated history. Let's fetch always on reset or manual refresh.
            ]);

            if (reset) {
                setExecutions(execData.list);
                setActiveOrders(orders as any[]);
            } else {
                setExecutions(prev => [...prev, ...execData.list]);
                // Don't append orders, they are a current snapshot.
            }

            setNextPageCursor(execData.nextPageCursor);

            const tradeIds = execData.list.map(e => e.execId);
            if (tradeIds.length > 0) {
                const fetchedNotes = await journalService.getNotes(tradeIds);
                setNotes(prev => {
                    const next = { ...prev };
                    fetchedNotes.forEach(n => {
                        next[n.trade_id] = n;
                    });
                    return next;
                });
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || t('journal.noTrades'));
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => {
        loadData(true);
    };

    const handleLoadMore = () => {
        loadData(false);
    };

    const handleSaveNote = async (execution: any) => {
        try {
            const note: TradeNote = {
                trade_id: execution.execId,
                symbol: execution.symbol,
                side: execution.side,
                note: noteText
            };

            const saved = await journalService.saveNote(note);
            if (saved) {
                setNotes(prev => ({
                    ...prev,
                    [saved.trade_id]: saved
                }));
            }
            setEditingNoteId(null);
            setNoteText('');
        } catch (err) {
            alert(t('common.error'));
        }
    };

    const startEditing = (execId: string, currentNote: string = '') => {
        setEditingNoteId(execId);
        setNoteText(currentNote);
    };

    const formatTime = (timestamp: string) => {
        return format(new Date(parseInt(timestamp)), 'dd MMM yyyy HH:mm', {
            locale: i18n.language === 'tr' ? tr : enUS
        });
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

                {/* Active Orders Section */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            {t('journal.activeOrders')}
                        </h2>
                    </div>

                    {activeOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            {t('journal.noOrders')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-900/50 text-gray-400 text-sm">
                                    <tr>
                                        <th className="p-4 font-medium">{t('journal.timeSymbol')}</th>
                                        <th className="p-4 font-medium">{t('journal.side')}</th>
                                        <th className="p-4 font-medium">{t('journal.orderType')}</th>
                                        <th className="p-4 font-medium">{t('journal.price')}</th>
                                        <th className="p-4 font-medium">{t('journal.qty')} / {t('journal.filled')}</th>
                                        <th className="p-4 font-medium">{t('journal.triggerPrice')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700 text-sm">
                                    {activeOrders.map((order) => {
                                        const isBuy = order.side === 'Buy';
                                        return (
                                            <tr key={order.orderId} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="text-white font-bold">{order.symbol}</div>
                                                    <div className="text-xs text-gray-500">{formatTime(order.createdTime)}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${isBuy ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                                        }`}>
                                                        {order.side}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-300">{order.orderType}</td>
                                                <td className="p-4 text-white font-mono">{order.price}</td>
                                                <td className="p-4 text-gray-300">
                                                    <div>{order.qty}</div>
                                                    <div className="text-xs text-green-400">{t('journal.filled')}: {order.cumExecQty}</div>
                                                </td>
                                                <td className="p-4 text-gray-400 font-mono">
                                                    {order.triggerPrice || '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Date Filters */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 shadow-lg flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('journal.startDate')}</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('journal.endDate')}</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleFilter}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        {t('journal.filter')}
                    </button>
                    <button
                        onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            // Immediate reload or wait for filter click? 
                            // Usually reset clears and maybe reloads default
                            // Let's just clear for now, user clicks filter to apply "no date" (all recent)
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm font-medium transition-colors"
                    >
                        Clear
                    </button>
                </div>

                {/* Recent Executions Section */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
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

                    {loading && executions.length === 0 ? (
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
                            {nextPageCursor && (
                                <div className="p-4 border-t border-gray-700 flex justify-center">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loading}
                                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : t('journal.loadMore')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default TradeJournal;
