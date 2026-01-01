import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { generatePlan, type PlanDay } from '../utils/planGenerator';
import { getActivePlanId, type Plan } from '../utils/storage';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, X, Wallet, Calendar, Target, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { tr } from 'date-fns/locale/tr';
import { enUS } from 'date-fns/locale/en-US';

registerLocale('tr', tr);
registerLocale('en', enUS);

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showProjection, setShowProjection] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartRange, setChartRange] = useState<number | 'all'>(30);
  const [projectionMode, setProjectionMode] = useState<'balance' | 'date'>('balance');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [projectionCurrentBalance, setProjectionCurrentBalance] = useState<number>(0);
  const itemsPerPage = 15;

  useEffect(() => {
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const plans = await api.getPlans();
      const activeId = getActivePlanId();
      
      if (activeId) {
        const currentActivePlan = plans.find(p => p.id === activeId);
        if (currentActivePlan) {
          setActivePlan(currentActivePlan);
          loadPlanData(currentActivePlan);
        } else {
          navigate('/settings');
        }
      } else {
        navigate('/settings');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadPlanData = (currentPlan: Plan) => {
    const generatedPlan = generatePlan(currentPlan.settings);
    
    generatedPlan.forEach(day => {
      if (currentPlan.progress[day.day]) {
        day.actualBalance = currentPlan.progress[day.day].actualBalance;
      }
    });
    
    setPlan(generatedPlan);
  };

  const handleBalanceChange = async (dayIndex: number, value: string) => {
    if (!activePlan) return;

    const newPlan = [...plan];
    const numValue = value === '' ? undefined : Number(value);
    newPlan[dayIndex].actualBalance = numValue;
    setPlan(newPlan);
    
    try {
      await api.updateProgress(activePlan.id, newPlan[dayIndex].day, numValue);
      // Update local active plan state to reflect changes immediately if needed elsewhere
      const updatedProgress = { ...activePlan.progress };
      if (numValue === undefined) {
        delete updatedProgress[newPlan[dayIndex].day];
      } else {
        updatedProgress[newPlan[dayIndex].day] = { actualBalance: numValue };
      }
      setActivePlan({ ...activePlan, progress: updatedProgress });
    } catch (error) {
      console.error('Error updating progress:', error);
      // Revert optimistic update on error
      loadPlanData(activePlan);
      alert(t('common.error'));
    }
  };

  const settings = activePlan?.settings;

  const totalPages = Math.ceil(plan.length / itemsPerPage);
  const currentData = plan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val?: number) => {
    if (val === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatPercent = (val?: number) => {
    if (val === undefined) return '-';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  // --- Statistics Calculation ---
  const lastCompletedDay = [...plan].reverse().find(p => p.actualBalance !== undefined);
  const currentBalance = lastCompletedDay?.actualBalance ?? settings?.startBalance ?? 0;
  const startBalance = settings?.startBalance ?? 0;
  const totalProfit = currentBalance - startBalance;
  const totalProfitPercent = startBalance > 0 ? (totalProfit / startBalance) * 100 : 0;
  const currentDayNumber = lastCompletedDay?.day ?? 0;
  const progressPercent = settings?.days ? (currentDayNumber / settings.days) * 100 : 0;

  useEffect(() => {
    setProjectionCurrentBalance(currentBalance);
  }, [currentBalance]);

  // --- Chart Data Preparation ---
  const chartData = plan.map(p => ({
    name: `${t('dashboard.day')} ${p.day}`,
    day: p.day,
    date: p.date,
    [t('dashboard.chart.expected')]: p.expectedEndBalance,
    [t('dashboard.chart.actual')]: p.actualBalance,
  }));

  const filteredChartData = chartRange === 'all' 
    ? chartData 
    : chartData.filter(p => {
        const endDay = currentDayNumber > 0 ? currentDayNumber : 1;
        const startDay = Math.max(1, endDay - (chartRange as number) + 1);
        // Show range [Start, End + 5] to see a bit of future
        return p.day >= startDay && p.day <= (endDay + 5);
      });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Current Balance */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={64} className="text-blue-500" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{t('dashboard.currentBalance')}</h3>
            <div className="text-3xl font-bold text-white">{formatCurrency(currentBalance)}</div>
            <div className="mt-2 text-sm text-gray-400">
              {t('dashboard.startBalance')}: <span className="text-gray-300">{formatCurrency(startBalance)}</span>
            </div>
          </div>

          {/* Card 2: Total Profit */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={64} className="text-green-500" />
            </div>
            <div className="flex justify-between items-start">
              <h3 className="text-gray-400 text-sm font-medium mb-1">{t('dashboard.totalProfit')}</h3>
              <button 
                onClick={() => setShowChart(true)}
                className="text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 p-1.5 rounded-lg transition-colors z-10"
                title={t('dashboard.chart.all')}
              >
                <TrendingUp size={18} />
              </button>
            </div>
            <div className={clsx("text-3xl font-bold", totalProfit >= 0 ? "text-green-400" : "text-red-400")}>
              {formatCurrency(totalProfit)}
            </div>
            <div className={clsx("mt-2 text-sm font-medium", totalProfitPercent >= 0 ? "text-green-500" : "text-red-500")}>
              {totalProfitPercent > 0 ? '+' : ''}{totalProfitPercent.toFixed(2)}%
            </div>
          </div>

          {/* Card 3: Progress */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calendar size={64} className="text-purple-500" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{t('dashboard.progress')}</h3>
            <div className="text-3xl font-bold text-white">
              {currentDayNumber} <span className="text-lg text-gray-500">/ {settings?.days} {t('dashboard.day')}</span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Next Target */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Target size={64} className="text-orange-500" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{t('dashboard.table.expectedBalance')}</h3>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(plan[currentDayNumber]?.expectedEndBalance)}
            </div>
            <div className="mt-2 text-sm text-orange-400 flex items-center gap-1">
              <ArrowUpRight size={16} />
              {t('dashboard.dailyTarget')}: %{settings?.dailyProfitTargetPercent}
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {activePlan?.name || t('dashboard.title')}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowProjection(true)}
                className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors text-sm font-medium"
              >
                {t('dashboard.projectionCalc')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10">
                <tr>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.no')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.date')}</th>
                  <th className="p-4 border-b border-gray-700 bg-blue-900/20 text-blue-300">{t('dashboard.table.balanceInput')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.expectedBalance')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.expectedProfit')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.actualProfit')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.profitPercent')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.balanceDiff')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.distancePercent')}</th>
                  <th className="p-4 border-b border-gray-700">{t('dashboard.table.status')}</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {currentData.map((day, idx) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                  const prevDay = globalIndex > 0 ? plan[globalIndex - 1] : null;
                  const prevBalance = prevDay 
                    ? (prevDay.actualBalance ?? prevDay.expectedEndBalance) 
                    : settings?.startBalance || 0;

                  const actualProfit = day.actualBalance !== undefined 
                    ? day.actualBalance - prevBalance 
                    : undefined;
                  
                  const actualProfitPercent = actualProfit !== undefined && prevBalance !== 0
                    ? (actualProfit / prevBalance) * 100
                    : undefined;

                  const balanceDiff = day.actualBalance !== undefined
                    ? day.actualBalance - day.expectedEndBalance
                    : undefined;

                  const balanceDiffPercent = day.actualBalance !== undefined && day.expectedEndBalance !== 0
                    ? ((day.actualBalance - day.expectedEndBalance) / day.expectedEndBalance) * 100
                    : undefined;
                  
                  const isProfitPositive = actualProfit !== undefined && actualProfit >= 0;
                  const isTargetMet = day.actualBalance !== undefined && day.actualBalance >= day.expectedEndBalance;

                  return (
                    <tr key={day.day} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-4">{day.day}</td>
                      <td className="p-4">{day.date}</td>
                      <td className="p-4 bg-blue-900/10">
                        <input
                          type="number"
                          value={day.actualBalance ?? ''}
                          onChange={(e) => handleBalanceChange(globalIndex, e.target.value)}
                          className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-4 font-medium text-green-400">
                        {formatCurrency(day.expectedEndBalance)}
                      </td>
                      <td className="p-4 text-green-300/70">
                        {formatCurrency(day.targetProfit)}
                      </td>
                      <td className={clsx("p-4 font-bold", isProfitPositive ? "text-green-400" : "text-red-400")}>
                        {formatCurrency(actualProfit)}
                      </td>
                      <td className={clsx("p-4", isProfitPositive ? "text-green-400" : "text-red-400")}>
                        {formatPercent(actualProfitPercent)}
                      </td>
                      <td className={clsx("p-4", (balanceDiff || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                        {formatCurrency(balanceDiff)}
                      </td>
                      <td className={clsx("p-4", (balanceDiffPercent || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                        {formatPercent(balanceDiffPercent)}
                      </td>
                      <td className="p-4">
                        {day.actualBalance !== undefined && (
                          <span className={clsx(
                            "px-2 py-1 rounded text-xs font-bold",
                            isTargetMet ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                          )}>
                            {isTargetMet ? t('dashboard.table.targetMet') : t('dashboard.table.targetMissed')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-700 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-gray-400">
              {t('common.page')} {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Chart Modal */}
        {showChart && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-5xl w-full p-6 h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="text-blue-500" />
                    {t('dashboard.chart.expected')} / {t('dashboard.chart.actual')}
                  </h2>
                  <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
                    {[30, 60, 90].map(days => (
                      <button
                        key={days}
                        onClick={() => setChartRange(days)}
                        className={clsx(
                          "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                          chartRange === days 
                            ? "bg-blue-600 text-white shadow-sm" 
                            : "text-gray-400 hover:text-white hover:bg-gray-600"
                        )}
                      >
                        {days} {t('dashboard.chart.days')}
                      </button>
                    ))}
                    <button
                      onClick={() => setChartRange('all')}
                      className={clsx(
                        "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                        chartRange === 'all' 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-gray-400 hover:text-white hover:bg-gray-600"
                      )}
                    >
                      {t('dashboard.chart.all')}
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowChart(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      tick={{ fill: '#9ca3af' }}
                      tickFormatter={(value, index) => {
                        // Show fewer labels if range is large
                        const interval = chartRange === 'all' ? 10 : 5;
                        return index % interval === 0 ? value : '';
                      }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      tick={{ fill: '#9ca3af' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '']}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={t('dashboard.chart.expected')} 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorExpected)" 
                      strokeWidth={2}
                      name={t('dashboard.chart.expected')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={t('dashboard.chart.actual')} 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorActual)" 
                      strokeWidth={2}
                      connectNulls
                      name={t('dashboard.chart.actual')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Projection Modal */}
        {showProjection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{t('dashboard.projection.title')}</h3>
                <button onClick={() => setShowProjection(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex bg-gray-700 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setProjectionMode('balance')}
                  className={clsx(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                    projectionMode === 'balance' ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
                  )}
                >
                  {t('dashboard.projection.modeBalance')}
                </button>
                <button
                  onClick={() => setProjectionMode('date')}
                  className={clsx(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                    projectionMode === 'date' ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
                  )}
                >
                  {t('dashboard.projection.modeDate')}
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('dashboard.currentBalance')}</label>
                  <input 
                    type="number" 
                    value={projectionCurrentBalance}
                    onChange={(e) => setProjectionCurrentBalance(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {projectionMode === 'balance' ? (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('dashboard.projection.targetBalance')}</label>
                    <input 
                      type="number" 
                      id="target-balance-input"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="10000"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('dashboard.projection.targetDate')}</label>
                    <div className="w-full">
                      <DatePicker
                        selected={targetDate}
                        onChange={(date: Date | null) => setTargetDate(date)}
                        dateFormat="d MMMM yyyy"
                        locale={i18n.language === 'tr' ? 'tr' : 'en'}
                        minDate={new Date()}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        wrapperClassName="w-full"
                        placeholderText={t('common.date')}
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => {
                    const dailyRate = (settings?.dailyProfitTargetPercent || 10) / 100;
                    
                    // Calculate Base Date (Start of projection)
                    let baseDate = new Date();
                    if (settings?.startDate) {
                      const [y, m, d] = settings.startDate.split('-').map(Number);
                      const startDate = new Date(y, m - 1, d);
                      
                      if (lastCompletedDay) {
                        // If plan is in progress, project from the last completed day
                        baseDate = new Date(startDate);
                        baseDate.setDate(baseDate.getDate() + (lastCompletedDay.day - 1));
                      } else {
                        // If plan hasn't started or no progress, project from start date
                        baseDate = startDate;
                      }
                    }
                    baseDate.setHours(0, 0, 0, 0);

                    if (projectionMode === 'balance') {
                      const target = Number((document.getElementById('target-balance-input') as HTMLInputElement).value);
                      if (!target || target <= projectionCurrentBalance) {
                        alert(t('dashboard.projection.errorTarget'));
                        return;
                      }
                      
                      // days = log(Target/Current) / log(1 + daily%)
                      const daysNeeded = Math.ceil(Math.log(target / projectionCurrentBalance) / Math.log(1 + dailyRate));
                      
                      const tDate = new Date(baseDate);
                      tDate.setDate(tDate.getDate() + daysNeeded);
                      
                      alert(t('dashboard.projection.resultDays', { days: daysNeeded }) + '\n' + t('dashboard.projection.resultDate', { date: tDate.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US') }));
                    } else {
                      if (!targetDate) {
                        alert(t('dashboard.projection.errorDate'));
                        return;
                      }

                      const tDate = new Date(targetDate);
                      tDate.setHours(0,0,0,0);

                      const diffTime = tDate.getTime() - baseDate.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays <= 0) {
                        alert(t('dashboard.projection.errorFutureDate'));
                        return;
                      }

                      // Future = Current * (1 + rate)^days
                      const futureBalance = projectionCurrentBalance * Math.pow(1 + dailyRate, diffDays);
                      
                      alert(t('dashboard.projection.resultFutureBalance', { 
                        date: tDate.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US'), 
                        days: diffDays, 
                        balance: formatCurrency(futureBalance) 
                      }));
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  {t('dashboard.projection.calculate')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
