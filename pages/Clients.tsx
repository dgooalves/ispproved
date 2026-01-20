import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Client, City, Invoice, Plan } from '../types';

import { useLocation, useNavigate } from 'react-router-dom';

const ClientsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filterCity, setFilterCity] = useState<string>('TODAS');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New/Edit client form state
  const [newClient, setNewClient] = useState({
    name: '',
    cpf: '',
    rg: '',
    street: '',
    neighborhood: '',
    number: '',
    contact: '',
    email: '',
    city: '',
    plan: '30Mb',
    status: 'ATIVO',
  });

  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // New invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    due_date: new Date().toISOString().split('T')[0],
    amount: '',
    status: 'PENDENTE' as 'PAGO' | 'PENDENTE',
    payment_method: 'Boleto',
    notes: '',
  });

  // Payment receipt form state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [paymentReceiptForm, setPaymentReceiptForm] = useState({
    date: new Date().toISOString().split('T')[0],
    method: 'PIX',
    notes: '',
  });

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchCities();
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchClients();
    setCurrentPage(1);
  }, [filterCity]);

  useEffect(() => {
    if (location.state && (location.state as any).openClientId && clients.length > 0) {
      const clientId = (location.state as any).openClientId;
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [clients, location.state, navigate]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientInvoices(selectedClient.id);
    } else {
      setClientInvoices([]);
    }
  }, [selectedClient]);

  const fetchCities = async () => {
    const { data } = await supabase.from('cities').select('*').order('name');
    if (data) {
      setCities(data);
      if (!editingClient && !newClient.city && data.length > 0) {
        setNewClient(prev => ({ ...prev, city: data[0].name }));
      }
    }
  };

  const fetchPlans = async () => {
    const { data } = await supabase.from('plans').select('*').order('name');
    if (data) {
      setPlans(data);
      if (!editingClient && !newClient.plan && data.length > 0) {
        setNewClient(prev => ({ ...prev, plan: data[0].name }));
      }
    }
  };

  const fetchClients = async () => {
    setIsLoading(true);
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });

    if (filterCity !== 'TODAS') {
      query = query.eq('city', filterCity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  const fetchClientInvoices = async (clientId: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
    } else {
      setClientInvoices(data || []);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsLoading(true);

    let error;

    if (editingInvoice) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          due_date: invoiceForm.due_date,
          amount: parseFloat(invoiceForm.amount),
          status: invoiceForm.status,
          payment_method: invoiceForm.payment_method,
          notes: invoiceForm.notes,
        })
        .eq('id', editingInvoice.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('invoices').insert([
        {
          client_id: selectedClient.id,
          due_date: invoiceForm.due_date,
          amount: parseFloat(invoiceForm.amount),
          status: invoiceForm.status,
          payment_method: invoiceForm.payment_method,
          notes: invoiceForm.notes,
        },
      ]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar fatura: ' + error.message);
    } else {
      setIsNewInvoiceModalOpen(false);
      setEditingInvoice(null);
      setInvoiceForm({
        due_date: new Date().toISOString().split('T')[0],
        amount: '',
        status: 'PENDENTE',
        payment_method: 'Boleto',
        notes: '',
      });
      fetchClientInvoices(selectedClient.id);
    }
    setIsLoading(false);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fatura?')) return;
    setIsLoading(true);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir fatura: ' + error.message);
    } else if (selectedClient) {
      fetchClientInvoices(selectedClient.id);
    }
    setIsLoading(false);
  };

  const handlePayClick = (invoice: Invoice) => {
    setSelectedInvoiceForPay(invoice);
    setPaymentReceiptForm({
      date: new Date().toISOString().split('T')[0],
      method: 'PIX',
      notes: invoice.notes || '',
    });
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'PAGO',
        payment_date: paymentReceiptForm.date,
        payment_method: paymentReceiptForm.method,
        notes: paymentReceiptForm.notes,
      })
      .eq('id', selectedInvoiceForPay.id);

    if (error) {
      alert('Erro ao processar pagamento: ' + error.message);
    } else {
      setIsPayModalOpen(false);
      if (selectedClient) fetchClientInvoices(selectedClient.id);
    }
    setIsLoading(false);
  };


  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '-';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const clientData = {
      name: newClient.name,
      cpf_cnpj: newClient.cpf,
      rg: newClient.rg,
      street: newClient.street,
      neighborhood: newClient.neighborhood,
      number: newClient.number,
      contact: newClient.contact,
      email: newClient.email,
      city: newClient.city,
      plan: newClient.plan,
      status: newClient.status,
    };

    let error;
    if (editingClient) {
      const response = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', editingClient.id);
      error = response.error;
    } else {
      const response = await supabase
        .from('clients')
        .insert([clientData]);
      error = response.error;
    }

    if (error) {
      alert(`Erro ao ${editingClient ? 'atualizar' : 'cadastrar'} cliente: ` + error.message);
    } else {
      setIsNewClientModalOpen(false);
      setEditingClient(null);
      setNewClient({
        name: '',
        cpf: '',
        rg: '',
        street: '',
        neighborhood: '',
        number: '',
        contact: '',
        email: '',
        city: cities.length > 0 ? cities[0].name : '',
        plan: plans.length > 0 ? plans[0].name : '30Mb',
      });
      fetchClients();
    }
    setIsLoading(false);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      cpf: client.cpf_cnpj,
      rg: client.rg,
      street: client.street,
      neighborhood: client.neighborhood,
      number: client.number,
      contact: client.contact,
      email: client.email,
      city: client.city,
      plan: client.plan || '30Mb',
      status: client.status || 'ATIVO',
    });
    setIsNewClientModalOpen(true);
  };

  // Pagination Logic
  const indexOfLastClient = currentPage * itemsPerPage;
  const indexOfFirstClient = indexOfLastClient - itemsPerPage;
  const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);
  const totalPages = Math.ceil(clients.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir cliente: ' + error.message);
    } else {
      fetchClients();
    }
    setIsLoading(false);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Clientes</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seus clientes por cidade ou filial</p>
        </div>
        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="bg-primary hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/10"
        >
          <span className="material-icons-round text-xl">add</span>
          Novo Cliente
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 inline-flex flex-wrap gap-1">
        <button
          onClick={() => setFilterCity('TODAS')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${filterCity === 'TODAS' ? 'bg-primary text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          Todas as Cidades
        </button>
        {cities.map(city => (
          <button
            key={city.id}
            onClick={() => setFilterCity(city.name)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${filterCity === city.name ? 'bg-primary text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {city.name}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm transition-all dark:text-white" placeholder="Buscar por nome ou CPF..." type="text" />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select className="w-full md:w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer dark:text-white">
              <option>Todos os Status</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-bold text-slate-400">Nome do Cliente</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-bold text-slate-400">CPF</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-bold text-slate-400">Cidade / Filial</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-bold text-slate-400">Plano</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-bold text-slate-400">Status</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-bold text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">Carregando clientes...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">Nenhum cliente cadastrado.</td>
                </tr>
              ) : (
                currentClients.map(client => (
                  <tr key={client.id} onClick={() => setSelectedClient(client)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4"><span className="font-bold text-slate-700 dark:text-slate-200">{client.name}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{client.cpf_cnpj}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <span className="material-icons-round text-base text-primary/60">location_on</span>
                        {client.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">{client.plan}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${client.status === 'BLOQUEADO'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        : client.status === 'DESATIVADO'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditClick(client)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="material-icons-round text-sm">edit</span> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <span className="material-icons-round text-sm">delete</span> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Exibindo {indexOfFirstClient + 1} a {Math.min(indexOfLastClient, clients.length)} de {clients.length} clientes
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 transition-colors ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'}`}
            >
              <span className="material-icons-round text-sm">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold shadow-sm transition-all ${currentPage === number ? 'bg-primary text-white' : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {number}
              </button>
            ))}

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 transition-colors ${currentPage === totalPages || totalPages === 0 ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'}`}
            >
              <span className="material-icons-round text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Client Modal */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold dark:text-white">{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h3>
              <button
                onClick={() => {
                  setIsNewClientModalOpen(false);
                  setEditingClient(null);
                  setNewClient({
                    name: '',
                    cpf: '',
                    rg: '',
                    street: '',
                    neighborhood: '',
                    number: '',
                    contact: '',
                    email: '',
                    city: cities.length > 0 ? cities[0].name : '',
                    plan: plans.length > 0 ? plans[0].name : '30Mb',
                  });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPF/CNPJ</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={newClient.cpf}
                    onChange={e => setNewClient({ ...newClient, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RG</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={newClient.rg}
                    onChange={e => setNewClient({ ...newClient, rg: e.target.value })}
                  />
                </div>
                <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rua</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                      value={newClient.street}
                      onChange={e => setNewClient({ ...newClient, street: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                      value={newClient.number}
                      onChange={e => setNewClient({ ...newClient, number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bairro</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={newClient.neighborhood}
                    onChange={e => setNewClient({ ...newClient, neighborhood: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contato</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={newClient.contact}
                    onChange={e => setNewClient({ ...newClient, contact: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cidade / Filial</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm appearance-none cursor-pointer"
                      value={newClient.city}
                      onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                    >
                      {cities.map(city => (
                        <option key={city.id} value={city.name}>{city.name}</option>
                      ))}
                      {cities.length === 0 && <option value="">Nenhuma cidade cadastrada</option>}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status do Cliente</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm appearance-none cursor-pointer font-bold"
                      value={newClient.status}
                      onChange={e => setNewClient({ ...newClient, status: e.target.value })}
                    >
                      <option value="ATIVO" className="text-emerald-600 font-bold">Ativo</option>
                      <option value="BLOQUEADO" className="text-orange-600 font-bold">Bloqueado</option>
                      <option value="DESATIVADO" className="text-red-600 font-bold">Desativado</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plano Contratado</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm appearance-none cursor-pointer"
                    value={newClient.plan}
                    onChange={e => setNewClient({ ...newClient, plan: e.target.value })}
                  >
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.name}>{plan.name}</option>
                    ))}
                    {plans.length === 0 && <option value="">Nenhum plano cadastrado</option>}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewClientModalOpen(false);
                    setEditingClient(null);
                    setNewClient({
                      name: '',
                      cpf: '',
                      rg: '',
                      street: '',
                      neighborhood: '',
                      number: '',
                      contact: '',
                      email: '',
                      city: cities.length > 0 ? cities[0].name : '',
                      plan: plans.length > 0 ? plans[0].name : '30Mb',
                    });
                  }}
                  className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-2xl font-bold dark:text-white">Detalhes do Cliente</h3>
              <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações Pessoais</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Nome:</span> {selectedClient.name}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">CPF:</span> {selectedClient.cpf_cnpj}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">RG:</span> {selectedClient.rg}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span> {selectedClient.email}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Contato:</span> {selectedClient.contact}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Endereço</h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedClient.street}, {selectedClient.number}<br />
                    {selectedClient.neighborhood}<br />
                    {selectedClient.city}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plano Contratado</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-400">
                        <span className="material-icons-round text-lg">speed</span>
                      </div>
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{selectedClient.plan}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">{selectedClient.status}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Vencimento: Dia 10</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipamento</h4>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                        <span className="material-icons-round text-lg">router</span>
                      </div>
                      <span className="font-semibold dark:text-white">{selectedClient.equipment || 'ONU Padrão'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedClient.status === 'ATIVO' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                      <span className="text-xs italic text-slate-500">{selectedClient.status === 'ATIVO' ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Faturas Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold dark:text-white">Faturas</h3>
                  <button
                    onClick={() => {
                      setEditingInvoice(null);
                      setInvoiceForm({
                        due_date: new Date().toISOString().split('T')[0],
                        amount: '',
                        status: 'PENDENTE',
                        payment_method: 'Boleto',
                        notes: '',
                      });
                      setIsNewInvoiceModalOpen(true);
                    }}
                    className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-sm"
                  >
                    <span className="material-icons-round text-lg">add</span> Nova Fatura
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400">Vencimento</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400">Valor</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400">Pagamento</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 text-center">Obs</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {clientInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 italic">Nenhuma fatura gerada para este cliente.</td>
                        </tr>
                      ) : (
                        clientInvoices.map(invoice => (
                          <tr key={invoice.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(invoice.due_date)}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">R$ {invoice.amount.toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${invoice.status === 'PAGO'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {invoice.status === 'PAGO' ? (
                                <div className="space-y-0.5 text-xs">
                                  <p className="font-bold text-slate-700 dark:text-slate-300">{invoice.payment_method || 'PIX'}</p>
                                  <p className="text-slate-400">Pago em: {invoice.payment_date || invoice.due_date}</p>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-slate-400 italic max-w-[150px] truncate" title={invoice.notes || ''}>
                              {invoice.notes || '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                {invoice.status === 'PENDENTE' && (
                                  <button
                                    onClick={() => handlePayClick(invoice)}
                                    className="p-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                                    title="Baixar Pagamento"
                                  >
                                    <span className="material-icons-round text-sm">payments</span>
                                    RECEBER
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingInvoice(invoice);
                                    setInvoiceForm({
                                      due_date: invoice.due_date,
                                      amount: invoice.amount.toString(),
                                      status: invoice.status,
                                      payment_method: invoice.payment_method || 'Boleto',
                                      notes: invoice.notes || '',
                                    });
                                    setIsNewInvoiceModalOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-blue-500 transition-colors"
                                  title="Editar"
                                >
                                  <span className="material-icons-round text-lg">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Excluir"
                                >
                                  <span className="material-icons-round text-lg">delete</span>
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
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
              ID: {selectedClient.id} • ISP MANAGER PRO
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {isNewInvoiceModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-2xl font-bold dark:text-white">{editingInvoice ? 'Editar Fatura' : 'Nova Fatura'}</h3>
              <button
                onClick={() => {
                  setIsNewInvoiceModalOpen(false);
                  setEditingInvoice(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data Vencimento</label>
                  <div className="relative">
                    <input
                      required
                      type="date"
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white appearance-none"
                      value={invoiceForm.due_date}
                      onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    />
                    <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Valor (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white appearance-none"
                      value={invoiceForm.status}
                      onChange={e => setInvoiceForm({ ...invoiceForm, status: e.target.value as 'PAGO' | 'PENDENTE' })}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="PAGO">Pago</option>
                    </select>
                    <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Forma de Pagamento</label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white appearance-none"
                      value={invoiceForm.payment_method}
                      onChange={e => setInvoiceForm({ ...invoiceForm, payment_method: e.target.value })}
                    >
                      <option value="Boleto">Boleto</option>
                      <option value="PIX">PIX</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                    <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Pago em dinheiro na loja..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white resize-none"
                    value={invoiceForm.notes}
                    onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewInvoiceModalOpen(false);
                    setEditingInvoice(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : editingInvoice ? 'Atualizar Fatura' : 'Gerar Fatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Receive Payment Modal */}
      {isPayModalOpen && selectedInvoiceForPay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Receber Pagamento</h3>
                <p className="text-xs text-slate-500 uppercase">Valor: R$ {selectedInvoiceForPay.amount.toFixed(2).replace('.', ',')}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Recebimento</label>
                  <input
                    required
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm"
                    value={paymentReceiptForm.date}
                    onChange={e => setPaymentReceiptForm({ ...paymentReceiptForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm appearance-none"
                    value={paymentReceiptForm.method}
                    onChange={e => setPaymentReceiptForm({ ...paymentReceiptForm, method: e.target.value })}
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTÃO">Cartão</option>
                    <option value="BOLETO">Boleto (Compensado)</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações (OBS)</label>
                <textarea
                  placeholder="Ex: Pagamento parcial, Desconto concedido, etc."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm resize-none"
                  value={paymentReceiptForm.notes}
                  onChange={e => setPaymentReceiptForm({ ...paymentReceiptForm, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Confirmando...' : 'Confirmar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
