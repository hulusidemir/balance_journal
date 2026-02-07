import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { getActivePlanId, getDebts, addDebt, removeDebt, updateDebt, type Debt } from '../utils/storage';
import { formatLocalDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, CreditCard, X, Edit2 } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { tr } from 'date-fns/locale/tr';
import { enUS } from 'date-fns/locale/en-US';

registerLocale('tr', tr);
registerLocale('en', enUS);


const Debts: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'TRY'>('USD');
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(34);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'TRY'>('TRY');
  const [exchangeRate, setExchangeRate] = useState<string>('34');
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateLastUpdated, setRateLastUpdated] = useState<Date | null>(null);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [installments, setInstallments] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const id = getActivePlanId();
    if (id) {
      setActivePlanId(id);
      loadDebts(id);
    }
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setLoadingRate(true);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (data.rates && data.rates.TRY) {
        const rate = parseFloat(data.rates.TRY.toFixed(2));
        setExchangeRate(rate.toString());
        setCurrentExchangeRate(rate);
        setRateLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  const loadDebts = (planId: string) => {
    const loadedDebts = getDebts(planId);
    setDebts(loadedDebts);
  };

  const handleAddDebt = () => {
    if (!activePlanId || !amount || !installments || !startDate) return;
    if (currency === 'TRY' && (!exchangeRate || parseFloat(exchangeRate) <= 0)) return;

    const amountValue = parseFloat(amount);
    const finalAmount = currency === 'TRY' ? amountValue / parseFloat(exchangeRate) : amountValue;

    const newDebt: Omit<Debt, 'id'> = {
      description,
      amount: finalAmount,
      frequency,
      totalInstallments: parseInt(installments),
      startDate: formatLocalDate(startDate),
      paymentDay: frequency === 'monthly' ? startDate.getDate() : (startDate.getDay() === 0 ? 7 : startDate.getDay()),
    };

    addDebt(activePlanId, newDebt);
    loadDebts(activePlanId);
    setShowAddModal(false);
    resetForm();
  };

  const handleEditDebt = () => {
    if (!activePlanId || !editingDebt || !amount || !installments || !startDate) return;
    if (currency === 'TRY' && (!exchangeRate || parseFloat(exchangeRate) <= 0)) return;

    const amountValue = parseFloat(amount);
    const finalAmount = currency === 'TRY' ? amountValue / parseFloat(exchangeRate) : amountValue;

    const updatedDebt: Omit<Debt, 'id'> = {
      description,
      amount: finalAmount,
      frequency,
      totalInstallments: parseInt(installments),
      startDate: formatLocalDate(startDate),
      paymentDay: frequency === 'monthly' ? startDate.getDate() : (startDate.getDay() === 0 ? 7 : startDate.getDay()),
    };

    updateDebt(activePlanId, editingDebt.id, updatedDebt);
    loadDebts(activePlanId);
    setShowEditModal(false);
    resetForm();
    setEditingDebt(null);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setDescription(debt.description);
    setAmount(debt.amount.toString());
    setCurrency('USD');
    setExchangeRate('34');
    setFrequency(debt.frequency);
    setInstallments(debt.totalInstallments.toString());
    const [y, m, d] = debt.startDate.split('-').map(Number);
    setStartDate(new Date(y, m - 1, d));
    setShowEditModal(true);
  };

  const handleDeleteDebt = (id: string) => {
    if (!activePlanId) return;
    if (window.confirm(t('common.confirmDelete'))) {
      removeDebt(activePlanId, id);
      loadDebts(activePlanId);
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCurrency('TRY');
    setExchangeRate('34');
    setFrequency('monthly');
    setInstallments('');
    setStartDate(new Date());
    setEditingDebt(null);
  };

  const getDayName = (dayIndex: number) => {
    const days = [
      t('debts.sunday'),
      t('debts.monday'),
      t('debts.tuesday'),
      t('debts.wednesday'),
      t('debts.thursday'),
      t('debts.friday'),
      t('debts.saturday'),
    ];
    // getDay() returns 0 for Sunday, 1 for Monday...
    // My storage (and form logic below) uses 1 for Monday..7 for Sunday usually for weekly logic but let's stick to standard Date.getDay() for display if we can easily map.
    // Actually let's just stick to 1-7 for weekly where 1=Monday...7=Sunday for easier user selection often, but Date.getDay() results 0=Sunday.

    // Let's use the index passed. If we saved 1=Monday...7=Sunday:
    const adjustedIndex = dayIndex === 7 ? 0 : dayIndex;
    return days[adjustedIndex];
  };

  const formatAmount = (usdAmount: number) => {
    if (displayCurrency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdAmount);
    } else {
      return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(usdAmount * currentExchangeRate);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('debts.title')}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDisplayCurrency(displayCurrency === 'USD' ? 'TRY' : 'USD')}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              {displayCurrency === 'USD' ? '$ → ₺' : '₺ → $'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
              {t('debts.addDebt')}
            </button>
          </div>
        </div>

        {debts.length > 0 && (
          <div className="bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t('debts.totalDebt')}</p>
                <p className="text-3xl font-bold text-red-400">
                  {formatAmount(debts.reduce((sum, debt) => sum + (debt.amount * debt.totalInstallments), 0))}
                </p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <CreditCard className="text-red-500" size={32} />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map((debt) => (
            <div key={debt.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditModal(debt)}
                  className="text-gray-500 hover:text-blue-500"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteDebt(debt.id)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <CreditCard className="text-red-500" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">{t('debts.amount')}</p>
                  <p className="text-xl font-bold text-white">{formatAmount(debt.amount)}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{debt.description || t('debts.title')}</h3>

              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>{t('debts.frequency')}:</span>
                  <span className="text-white capitalize">
                    {debt.frequency === 'weekly' ? t('debts.weekly') : t('debts.monthly')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('debts.installments')}:</span>
                  <span className="text-white">{debt.totalInstallments}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('debts.paymentDay')}:</span>
                  <span className="text-white">
                    {debt.frequency === 'monthly'
                      ? `${debt.paymentDay}. ${t('debts.dayOfMonth')}`
                      : getDayName(debt.paymentDay)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('debts.startDate')}:</span>
                  <span className="text-white">{debt.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('debts.endDate')}:</span>
                  <span className="text-white">
                    {(() => {
                      const [y, m, d] = debt.startDate.split('-').map(Number);
                      const start = new Date(y, m - 1, d);
                      if (debt.frequency === 'monthly') {
                        start.setMonth(start.getMonth() + debt.totalInstallments);
                      } else {
                        start.setDate(start.getDate() + (debt.totalInstallments * 7));
                      }
                      return formatLocalDate(start);
                    })()}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">{t('debts.totalAmount')}:</span>
                  <span className="text-lg font-bold text-red-400">
                    {formatAmount(debt.amount * debt.totalInstallments)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {debts.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-gray-800/50 rounded-xl border border-gray-700/50 border-dashed">
              <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t('debts.activeDebts')} 0</p>
            </div>
          )}
        </div>

        {/* Add Debt Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 relative">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">{t('debts.addDebt')}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.description')}</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                    placeholder="e.g. Car Loan"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.currency')}</label>
                  <div className="flex bg-gray-900 rounded-lg border border-gray-700">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`flex-1 py-2 rounded-l-lg text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('TRY')}
                      className={`flex-1 py-2 rounded-r-lg text-sm font-medium transition-colors ${currency === 'TRY' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      TRY (₺)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.amount')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">{currency === 'USD' ? '$' : '₺'}</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {currency === 'TRY' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                      <span>{t('debts.exchangeRate')}</span>
                      <button
                        type="button"
                        onClick={fetchExchangeRate}
                        disabled={loadingRate}
                        className="text-xs text-green-500 hover:text-green-400 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {loadingRate ? t('common.loading') : t('debts.refreshRate')}
                      </button>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₺/$</span>
                      <input
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-3 py-2 text-white focus:outline-none focus:border-green-500"
                        placeholder="34.00"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {amount && exchangeRate && parseFloat(exchangeRate) > 0
                        ? `≈ $${(parseFloat(amount) / parseFloat(exchangeRate)).toFixed(2)} USD`
                        : t('debts.exchangeRateHelper')}
                      {rateLastUpdated && ` • ${t('debts.lastUpdated')}: ${rateLastUpdated.toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('debts.frequency')}</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="monthly">{t('debts.monthly')}</option>
                      <option value="weekly">{t('debts.weekly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('debts.installments')}</label>
                    <input
                      type="number"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                      placeholder="12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.startDate')}</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => setStartDate(date)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                    dateFormat="yyyy-MM-dd"
                    locale={i18n.language === 'tr' ? 'tr' : 'en'}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleAddDebt}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Debt Modal */}
        {showEditModal && editingDebt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 relative">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-4">{t('debts.editDebt')}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.description')}</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                    placeholder="e.g. Car Loan"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.currency')}</label>
                  <div className="flex bg-gray-900 rounded-lg border border-gray-700">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`flex-1 py-2 rounded-l-lg text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('TRY')}
                      className={`flex-1 py-2 rounded-r-lg text-sm font-medium transition-colors ${currency === 'TRY' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      TRY (₺)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.amount')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">{currency === 'USD' ? '$' : '₺'}</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {currency === 'TRY' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                      <span>{t('debts.exchangeRate')}</span>
                      <button
                        type="button"
                        onClick={fetchExchangeRate}
                        disabled={loadingRate}
                        className="text-xs text-green-500 hover:text-green-400 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {loadingRate ? t('common.loading') : t('debts.refreshRate')}
                      </button>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₺/$</span>
                      <input
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-3 py-2 text-white focus:outline-none focus:border-green-500"
                        placeholder="34.00"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {amount && exchangeRate && parseFloat(exchangeRate) > 0
                        ? `≈ $${(parseFloat(amount) / parseFloat(exchangeRate)).toFixed(2)} USD`
                        : t('debts.exchangeRateHelper')}
                      {rateLastUpdated && ` • ${t('debts.lastUpdated')}: ${rateLastUpdated.toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('debts.frequency')}</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="monthly">{t('debts.monthly')}</option>
                      <option value="weekly">{t('debts.weekly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('debts.installments')}</label>
                    <input
                      type="number"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                      placeholder="12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('debts.startDate')}</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => setStartDate(date)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                    dateFormat="yyyy-MM-dd"
                    locale={i18n.language === 'tr' ? 'tr' : 'en'}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => { setShowEditModal(false); resetForm(); }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleEditDebt}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Debts;
