import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { calculateTrade, type TradeResult } from '../utils/tradeCalculator';
import { getActivePlanId } from '../utils/storage';
import { api } from '../services/api';
import { Calculator as CalcIcon, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

const Calculator: React.FC = () => {
  const [balance, setBalance] = useState<number>(1000);
  const [dailyProfitTargetPercent, setDailyProfitTargetPercent] = useState<number>(10);
  const [tradeCount, setTradeCount] = useState<number>(5);
  
  const [leverage, setLeverage] = useState<number>(2);
  const [entryPrice, setEntryPrice] = useState<number>(100);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  
  // Derived state for trade calculation
  const dailyTargetAmount = balance * (dailyProfitTargetPercent / 100);
  const targetProfitPerTradeAmount = dailyTargetAmount / tradeCount;
  const targetProfitPercent = (targetProfitPerTradeAmount / balance) * 100;
  
  const [result, setResult] = useState<TradeResult | null>(null);

  useEffect(() => {
    loadCalculatorDefaults();
  }, []);

  const loadCalculatorDefaults = async () => {
    try {
      const plans = await api.getPlans();
      const activeId = getActivePlanId();
      
      if (activeId) {
        const activePlan = plans.find(p => p.id === activeId);
        if (activePlan) {
          // Find last completed day
          const days = Object.keys(activePlan.progress).map(Number).sort((a, b) => b - a);
          const lastDay = days.length > 0 ? days[0] : null;
          const currentBalance = lastDay ? activePlan.progress[lastDay].actualBalance : activePlan.settings.startBalance;
          
          setBalance(currentBalance);
          setDailyProfitTargetPercent(activePlan.settings.dailyProfitTargetPercent);
        }
      }
    } catch (error) {
      console.error('Error loading calculator defaults:', error);
    }
  };

  useEffect(() => {
    const res = calculateTrade({
      balance,
      leverage,
      entryPrice,
      direction,
      targetProfitPercent
    });
    setResult(res);
  }, [balance, leverage, entryPrice, direction, targetProfitPercent]);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CalcIcon className="text-green-500" />
            İşlem Hesaplayıcı
          </h1>
          <p className="text-gray-400 mt-2">
            Günlük hedefinize göre işlem başına kar hedefini hesaplayın.
          </p>
        </div>

        {/* Daily Plan Section */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">
            Günlük Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Bakiye ($)
                </label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Günlük Hedef (%)
                </label>
                <input
                  type="number"
                  value={dailyProfitTargetPercent}
                  onChange={(e) => setDailyProfitTargetPercent(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  İşlem Sayısı
                </label>
                <input
                  type="number"
                  value={tradeCount}
                  onChange={(e) => setTradeCount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-700/50">
             <div className="bg-gray-700/30 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Günlük Hedef ($)</p>
                <p className="text-xl font-bold text-green-400">
                  ${dailyTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
             </div>
             <div className="bg-gray-700/30 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">İşlem Başına Hedef ($)</p>
                <p className="text-xl font-bold text-blue-400">
                  ${targetProfitPerTradeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
             </div>
             <div className="bg-gray-700/30 p-4 rounded-lg">
                <p className="text-gray-400 text-sm">İşlem Başına Hedef (%)</p>
                <p className="text-xl font-bold text-purple-400">
                  %{targetProfitPercent.toFixed(2)}
                </p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">
              İşlem Detayları
            </h2>
            
            <div className="space-y-6">
              {/* Balance input removed from here as it is in Daily Plan */}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Kaldıraç (x)
                </label>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}x
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Coine Giriş Fiyatı ($)
                </label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  İşlem Yönü
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDirection('long')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                      direction === 'long'
                        ? 'bg-green-600/20 border-green-500 text-green-400'
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <TrendingUp size={20} />
                    Long
                  </button>
                  <button
                    onClick={() => setDirection('short')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                      direction === 'short'
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <TrendingDown size={20} />
                    Short
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Hedef Kar Oranı (% Bakiye)
                </label>
                <div className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300">
                  %{targetProfitPercent.toFixed(2)} (Otomatik Hesaplandı)
                </div>
              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-center">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">
              Hesaplama Sonucu
            </h2>

            {result && (
              <div className="space-y-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">İşlem Değeri (Position Size)</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white">
                      ${result.positionSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-sm text-gray-400">
                      ({(result.positionSize / entryPrice).toLocaleString('en-US', { maximumFractionDigits: 4 })} adet)
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Kar Hedefi ($)</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${result.targetProfitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Bakiyenin %{targetProfitPercent}'si
                  </p>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Gerekli Fiyat Hareketi</p>
                  <p className="text-2xl font-bold text-blue-400">
                    %{result.requiredMovePercent.toFixed(2)}
                  </p>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg border border-green-500/30">
                  <p className="text-gray-400 text-sm mb-1">Coinden Çıkış Fiyatı</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xl text-gray-300">{entryPrice}</span>
                    <ArrowRight className="text-gray-500" />
                    <span className="text-3xl font-bold text-green-400">
                      {result.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Calculator;
