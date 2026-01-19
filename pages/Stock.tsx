import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Equipment, Client } from '../types';

const StockPage: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos os Status');
  const [filterType, setFilterType] = useState('Todos os Tipos');

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [selectedForAssign, setSelectedForAssign] = useState<Equipment | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'ONU',
    serial: '',
  });

  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, [searchQuery, filterStatus, filterType]);

  useEffect(() => {
    if (isAssignModalOpen) {
      fetchClients();
    }
  }, [isAssignModalOpen]);

  const fetchEquipment = async () => {
    setIsLoading(true);
    let query = supabase.from('equipment').select('*').order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,serial.ilike.%${searchQuery}%`);
    }

    if (filterStatus !== 'Todos os Status') {
      query = query.eq('status', filterStatus.toUpperCase());
    }

    if (filterType !== 'Todos os Tipos') {
      query = query.eq('type', filterType.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching equipment:', error);
    } else {
      setEquipment(data || []);
    }
    setIsLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    setClients(data || []);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data = {
      name: form.name,
      type: form.type,
      serial: form.serial,
    };

    let error;
    if (editingItem) {
      const resp = await supabase.from('equipment').update(data).eq('id', editingItem.id);
      error = resp.error;
    } else {
      const resp = await supabase.from('equipment').insert([data]);
      error = resp.error;
    }

    if (error) {
      alert('Erro ao salvar equipamento: ' + error.message);
    } else {
      setIsNewModalOpen(false);
      setEditingItem(null);
      setForm({ name: '', type: 'ONU', serial: '' });
      fetchEquipment();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir equipamento ${name}?`)) return;
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchEquipment();
  };

  const handleReturn = async (item: Equipment) => {
    if (!window.confirm(`Retornar equipamento ${item.name} (${item.serial}) ao estoque?`)) return;

    const { error } = await supabase
      .from('equipment')
      .update({ status: 'LIVRE', client_id: null, client_name: null })
      .eq('id', item.id);

    if (error) alert('Erro ao retornar: ' + error.message);
    else fetchEquipment();
  };

  const handleAssign = async (clientId: string, clientName: string) => {
    if (!selectedForAssign) return;

    const { error } = await supabase
      .from('equipment')
      .update({ status: 'ATRIBUÍDO', client_id: clientId, client_name: clientName })
      .eq('id', selectedForAssign.id);

    if (error) {
      alert('Erro ao atribuir: ' + error.message);
    } else {
      setIsAssignModalOpen(false);
      setSelectedForAssign(null);
      fetchEquipment();
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Estoque</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seus equipamentos</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm"
        >
          <span className="material-icons-round">add</span> Novo Equipamento
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative w-full lg:max-w-xs">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
            placeholder="Buscar por modelo ou série..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none cursor-pointer dark:text-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option>Todos os Status</option>
            <option value="ATRIBUÍDO">Atribuído</option>
            <option value="LIVRE">Livre</option>
          </select>
          <select
            className="pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none cursor-pointer dark:text-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option>Todos os Tipos</option>
            <option value="ONU">ONU</option>
            <option value="ROTEADOR">Roteador</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Número de Série</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">Buscando estoque...</td>
                </tr>
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">Nenhum equipamento encontrado.</td>
                </tr>
              ) : (
                equipment.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-primary">
                          <span className="material-icons-round">{item.type.toUpperCase() === 'ONU' ? 'router' : 'wifi'}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-slate-500 uppercase tracking-tight">{item.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{item.serial}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'ATRIBUÍDO' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{item.client_name || <span className="text-slate-400 italic">—</span>}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (item.status === 'ATRIBUÍDO') {
                              handleReturn(item);
                            } else {
                              setSelectedForAssign(item);
                              setIsAssignModalOpen(true);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          <span className="material-icons-round text-sm">{item.status === 'ATRIBUÍDO' ? 'arrow_back' : 'person_add'}</span>
                          {item.status === 'ATRIBUÍDO' ? 'Retornar' : 'Atribuir'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setForm({ name: item.name, type: item.type, serial: item.serial });
                            setIsNewModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <span className="material-icons-round">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-icons-round">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Equipment Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold dark:text-white">{editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingItem(null);
                  setForm({ name: '', type: 'ONU', serial: '' });
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modelo / Nome</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: UBIQUITI ONU"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm appearance-none"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="ONU">ONU</option>
                  <option value="ROTEADOR">Roteador</option>
                  <option value="CABO">Cabo</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número de Série</label>
                <input
                  required
                  type="text"
                  placeholder="SN..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                  value={form.serial}
                  onChange={e => setForm({ ...form, serial: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : editingItem ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Atribuir Equipamento</h3>
                <p className="text-xs text-slate-500 uppercase">{selectedForAssign?.name} - {selectedForAssign?.serial}</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Buscar cliente por nome..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 dark:text-white"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {clients
                  .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                  .map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleAssign(client.id, client.name)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{client.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{client.city}</p>
                      </div>
                      <span className="material-icons-round text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                    </button>
                  ))}
                {clients.length === 0 && <p className="text-center text-sm text-slate-500 py-4">Nenhum cliente encontrado.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;
