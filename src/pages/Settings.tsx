import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Save, Settings as SettingsIcon, Trash2, CheckCircle, Plus, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setActivePlanId, getActivePlanId, type Plan } from '../utils/storage';
import { api } from '../services/api';
import { generatePlan, type PlanDay } from '../utils/planGenerator';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { tr } from 'date-fns/locale/tr';

registerLocale('tr', tr);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);

  // New Plan Form State
  const [planName, setPlanName] = useState('');
  const [startBalance, setStartBalance] = useState(1000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyProfitTargetPercent, setDailyProfitTargetPercent] = useState(10);
  const [days, setDays] = useState(365);

  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<PlanDay[]>([]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const loadedPlans = await api.getPlans();
      setPlans(loadedPlans);
      
      const currentActiveId = getActivePlanId();
      setActivePlanIdState(currentActiveId);

      // Set defaults from active plan
      if (currentActiveId) {
        const activePlan = loadedPlans.find(p => p.id === currentActiveId);
        if (activePlan) {
          // Find last completed day
          const days = Object.keys(activePlan.progress).map(Number).sort((a, b) => b - a);
          const lastDay = days.length > 0 ? days[0] : null;
          const currentBalance = lastDay ? activePlan.progress[lastDay].actualBalance : activePlan.settings.startBalance;
          
          setStartBalance(currentBalance);
          setDailyProfitTargetPercent(activePlan.settings.dailyProfitTargetPercent);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      alert('Planlar yüklenirken bir hata oluştu.');
    }
  };

  const handlePreview = () => {
    if (!planName) {
      alert('Lütfen bir plan adı girin.');
      return;
    }

    const settings = {
      startBalance: Number(startBalance),
      startDate,
      dailyProfitTargetPercent: Number(dailyProfitTargetPercent),
      days: Number(days)
    };

    const generated = generatePlan(settings);
    setPreviewPlan(generated);
    setShowPreview(true);
  };

  const handleCreatePlan = async () => {
    const settings = {
      startBalance: Number(startBalance),
      startDate,
      dailyProfitTargetPercent: Number(dailyProfitTargetPercent),
      days: Number(days)
    };

    try {
      const newPlan = await api.createPlan(planName, settings);
      setActivePlanId(newPlan.id); // Automatically activate new plan
      
      // Reset form
      setPlanName('');
      setShowPreview(false);
      await loadPlans();
      alert('Yeni plan oluşturuldu ve aktif edildi.');
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Plan oluşturulurken bir hata oluştu.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (window.confirm('Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        await api.deletePlan(id);
        // If deleted plan was active, clear active plan
        if (getActivePlanId() === id) {
          setActivePlanId(''); // Clear active plan
        }
        await loadPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
        alert('Plan silinirken bir hata oluştu.');
      }
    }
  };

  const handleActivatePlan = (id: string) => {
    setActivePlanId(id);
    loadPlans();
    navigate('/dashboard');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <MainLayout>
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Eye className="text-blue-500" />
                Plan Önizlemesi: {planName}
              </h2>
              <button 
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700/30 p-3 rounded-lg">
                  <span className="text-gray-400 text-sm block">Başlangıç</span>
                  <span className="text-white font-bold">{formatCurrency(startBalance)}</span>
                </div>
                <div className="bg-gray-700/30 p-3 rounded-lg">
                  <span className="text-gray-400 text-sm block">Günlük Hedef</span>
                  <span className="text-green-400 font-bold">%{dailyProfitTargetPercent}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">Önemli Kilometre Taşları</h3>
              <div className="space-y-2">
                {[15, 30, 60, 90, 180, 365].filter(d => d <= days).map(day => {
                  const dayData = previewPlan.find(p => p.day === day);
                  if (!dayData) return null;
                  return (
                    <div key={day} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg border border-gray-700">
                      <div>
                        <span className="text-gray-300 font-medium">{day}. Gün</span>
                        <span className="text-xs text-gray-500 ml-2">({dayData.date})</span>
                      </div>
                      <span className="text-green-400 font-bold">
                        {formatCurrency(dayData.expectedEndBalance)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-4">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Düzenlemeye Dön
              </button>
              <button
                onClick={handleCreatePlan}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Onayla ve Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="text-green-500" />
            Ayarlar ve Planlar
          </h1>
          <p className="text-gray-400 mt-2">
            Yeni bir plan oluşturun veya mevcut planlarınızı yönetin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Plan */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-fit">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2 flex items-center gap-2">
              <Plus className="text-green-500" />
              Yeni Plan Oluştur
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Plan Adı
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Örn: 2026 Hedefleri"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Başlangıç Bakiyesi ($)
                  </label>
                  <input
                    type="number"
                    value={startBalance}
                    onChange={(e) => setStartBalance(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <div className="w-full">
                    <DatePicker
                      selected={startDate ? new Date(startDate) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          setStartDate(date.toLocaleDateString('en-CA'));
                        }
                      }}
                      dateFormat="d MMMM yyyy"
                      locale="tr"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Günlük Hedef (%)
                  </label>
                  <input
                    type="number"
                    value={dailyProfitTargetPercent}
                    onChange={(e) => setDailyProfitTargetPercent(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Süre (Gün)
                  </label>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <button
                onClick={handlePreview}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-4"
              >
                <Eye size={20} />
                Planı Önizle
              </button>
            </div>
          </div>

          {/* Existing Plans */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">
              Kayıtlı Planlar
            </h2>

            {plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz kayıtlı bir planınız yok.
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`p-4 rounded-lg border transition-all ${
                      activePlanId === plan.id 
                        ? 'bg-green-900/20 border-green-500' 
                        : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                        <p className="text-sm text-gray-400">
                          {plan.settings.startDate} • {plan.settings.days} Gün • %{plan.settings.dailyProfitTargetPercent} Hedef
                        </p>
                      </div>
                      {activePlanId === plan.id && (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Aktif
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      {activePlanId !== plan.id && (
                        <button
                          onClick={() => handleActivatePlan(plan.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium transition-colors"
                        >
                          Seç ve Git
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="px-4 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 py-2 rounded text-sm font-medium transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
