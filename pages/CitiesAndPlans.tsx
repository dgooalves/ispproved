import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { City, Plan } from '../types';

const CitiesAndPlans: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form states
  const [cityForm, setCityForm] = useState({ name: '', state: 'AM', technicians: '' });
  const [planForm, setPlanForm] = useState({ name: '', download: '', upload: '', price: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [citiesRes, plansRes] = await Promise.all([
      supabase.from('cities').select('*').order('name'),
      supabase.from('plans').select('*').order('name'),
    ]);

    if (citiesRes.data) setCities(citiesRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    setIsLoading(false);
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cityData = {
      name: cityForm.name,
      state: cityForm.state,
      technicians: cityForm.technicians.split(',').map(t => t.trim()).filter(t => t),
    };

    let error;
    if (editingCity) {
      const response = await supabase.from('cities').update(cityData).eq('id', editingCity.id);
      error = response.error;
    } else {
      const response = await supabase.from('cities').insert([cityData]);
      error = response.error;
    }

    if (error) {
      alert('Erro ao salvar cidade: ' + error.message);
    } else {
      setIsCityModalOpen(false);
      setEditingCity(null);
      setCityForm({ name: '', state: 'AM', technicians: '' });
      fetchData();
    }
    setIsLoading(false);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const planData = {
      name: planForm.name,
      download: planForm.download,
      upload: planForm.upload,
      price: parseFloat(planForm.price),
    };

    let error;
    if (editingPlan) {
      const response = await supabase.from('plans').update(planData).eq('id', editingPlan.id);
      error = response.error;
    } else {
      const response = await supabase.from('plans').insert([planData]);
      error = response.error;
    }

    if (error) {
      alert('Erro ao salvar plano: ' + error.message);
    } else {
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      setPlanForm({ name: '', download: '', upload: '', price: '' });
      fetchData();
    }
    setIsLoading(false);
  };

  const handleDelete = async (table: 'cities' | 'plans', id: string, name: string) => {
    if (!window.confirm(`Deseja excluir ${name}?`)) return;

    setIsLoading(true);
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchData();
    setIsLoading(false);
  };

  const openCityModal = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setCityForm({ name: city.name, state: city.state, technicians: city.technicians.join(', ') });
    } else {
      setEditingCity(null);
      setCityForm({ name: '', state: 'AM', technicians: '' });
    }
    setIsCityModalOpen(true);
  };

  const openPlanModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({ name: plan.name, download: plan.download, upload: plan.upload, price: plan.price.toString() });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: '', download: '', upload: '', price: '' });
    }
    setIsPlanModalOpen(true);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">Cidades e Planos</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Gerencie as cidades atendidas e planos disponíveis para seus clientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cidades Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-primary">
                <span className="material-icons-round">location_city</span>
              </div>
              <h2 className="text-xl font-bold dark:text-white">Cidades</h2>
            </div>
            <button
              onClick={() => openCityModal()}
              className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-sm"
            >
              <span className="material-icons-round text-lg">add</span> Nova Cidade
            </button>
          </div>

          <div className="space-y-4">
            {cities.map(city => (
              <div key={city.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex space-x-4">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full h-fit">
                      <span className="material-icons-round">location_on</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold dark:text-white">{city.name} - {city.state}</h3>
                      <p className="text-sm text-slate-500">Amazonas</p>
                      <div className="mt-3">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">Técnicos:</span>
                        <div className="flex flex-wrap gap-2">
                          {city.technicians.map((tech, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md dark:text-slate-300">{tech}</span>
                          ))}
                          {city.technicians.length === 0 && <span className="text-xs italic text-slate-400">Nenhum técnico</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openCityModal(city)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-icons-round text-sm">edit</span> Editar
                    </button>
                    <button
                      onClick={() => handleDelete('cities', city.id, city.name)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <span className="material-icons-round text-sm">delete</span> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cities.length === 0 && !isLoading && (
              <p className="text-center py-8 text-slate-500">Nenhuma cidade cadastrada.</p>
            )}
          </div>
        </section>

        {/* Planos Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-primary">
                <span className="material-icons-round">wifi</span>
              </div>
              <h2 className="text-xl font-bold dark:text-white">Planos</h2>
            </div>
            <button
              onClick={() => openPlanModal()}
              className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-sm"
            >
              <span className="material-icons-round text-lg">add</span> Novo Plano
            </button>
          </div>

          <div className="space-y-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex space-x-4">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full h-fit">
                      <span className="material-icons-round">wifi_tethering</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold dark:text-white">{plan.name}</h3>
                      <p className="text-sm text-slate-500">{plan.download} / {plan.upload} Upload</p>
                      <p className="mt-1 text-lg font-bold text-primary dark:text-emerald-400">R$ {plan.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openPlanModal(plan)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-icons-round text-sm">edit</span> Editar
                    </button>
                    <button
                      onClick={() => handleDelete('plans', plan.id, plan.name)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <span className="material-icons-round text-sm">delete</span> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {plans.length === 0 && !isLoading && (
              <p className="text-center py-8 text-slate-500">Nenhum plano cadastrado.</p>
            )}
          </div>
        </section>
      </div>

      {/* City Modal */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold dark:text-white">{editingCity ? 'Editar Cidade' : 'Cadastrar Nova Cidade'}</h3>
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleCitySubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Nome da Cidade</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                  value={cityForm.name}
                  onChange={e => setCityForm({ ...cityForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Estado (UF)</label>
                <input
                  required
                  type="text"
                  maxLength={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                  value={cityForm.state}
                  onChange={e => setCityForm({ ...cityForm, state: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Técnicos (separados por vírgula)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                  value={cityForm.technicians}
                  onChange={e => setCityForm({ ...cityForm, technicians: e.target.value })}
                  placeholder="Ex: João, Maria, Pedro"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsCityModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : editingCity ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold dark:text-white">{editingPlan ? 'Editar Plano' : 'Cadastrar Novo Plano'}</h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handlePlanSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Nome do Plano</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                  value={planForm.name}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Download</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                    value={planForm.download}
                    onChange={e => setPlanForm({ ...planForm, download: e.target.value })}
                    placeholder="30MB"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Upload</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                    value={planForm.upload}
                    onChange={e => setPlanForm({ ...planForm, upload: e.target.value })}
                    placeholder="15MB"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Preço (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                  value={planForm.price}
                  onChange={e => setPlanForm({ ...planForm, price: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : editingPlan ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">ISP Manager Pro v2.4.0</p>
      </footer>
    </div>
  );
};

export default CitiesAndPlans;
