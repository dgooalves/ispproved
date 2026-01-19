import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { supabase } from '../supabase';
import { Client, Invoice } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const [activeClients, setActiveClients] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [delinquents, setDelinquents] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [revenueData, setRevenueData] = useState<{ name: string, value: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string, value: number }[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [revenueFilter, setRevenueFilter] = useState<'1D' | '1W' | '1M' | '6M' | '1Y'>('6M');

  useEffect(() => {
    fetchDashboardData();
  }, [revenueFilter]);

  const fetchDashboardData = async () => {
    // Fetch clients
    const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*');
    // Fetch invoices
    const { data: invoicesData, error: invoicesError } = await supabase.from('invoices').select('*');

    if (clientsError || invoicesError) {
      console.error('Error fetching dashboard data');
      return;
    }

    const clients = clientsData as Client[] || [];
    const invoices = invoicesData as Invoice[] || [];

    // Calculate Active Clients
    const active = clients.filter(c => c.status === 'ATIVO').length;
    setActiveClients(active);
    setTotalClients(clients.length);

    // Calculate Monthly Revenue (current month, PAGO status)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentMonthPaid = invoices.filter(inv => {
      const invDate = new Date(inv.due_date);
      return (
        inv.status === 'PAGO' &&
        (invDate.getMonth() + 1) === currentMonth &&
        invDate.getFullYear() === currentYear
      );
    });
    const revenue = currentMonthPaid.reduce((sum, inv) => sum + Number(inv.amount), 0);
    setMonthlyRevenue(revenue);

    // Calculate Delinquents (number of clients with overdue invoices)
    const todayStr = now.toISOString().split('T')[0];
    const overdueInvoices = invoices.filter(inv => inv.status === 'PENDENTE' && inv.due_date < todayStr);
    const uniqueDelinquentClients = new Set(overdueInvoices.map(inv => inv.client_id));
    setDelinquents(uniqueDelinquentClients.size);

    // Calculate Conversion Rate (dummy: active / total) - or maybe paid / total invoices of the month
    const rate = clients.length > 0 ? (active / clients.length) * 100 : 0;
    setConversionRate(Math.round(rate));

    // Prepare Revenue Chart Data based on Filter
    let chartData = [];
    const today = new Date();

    if (revenueFilter === '1D') {
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyTotal = invoices
        .filter(inv => inv.status === 'PAGO' && (inv.payment_date === todayStr || inv.due_date === todayStr)) // Fallback to due_date if payment_date missing? Better strict.
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      chartData = [{ name: 'Hoje', value: dailyTotal }];
    }
    else if (revenueFilter === '1W') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();

        const dayRevenue = invoices
          .filter(inv => inv.status === 'PAGO' && (inv.payment_date === dStr || (!inv.payment_date && inv.due_date === dStr)))
          .reduce((sum, inv) => sum + Number(inv.amount), 0);

        chartData.push({ name: dayLabel, value: dayRevenue });
      }
    }
    else if (revenueFilter === '1M') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = d.getDate().toString(); // Just the number

        const dayRevenue = invoices
          .filter(inv => inv.status === 'PAGO' && (inv.payment_date === dStr || (!inv.payment_date && inv.due_date === dStr)))
          .reduce((sum, inv) => sum + Number(inv.amount), 0);

        chartData.push({ name: dayLabel, value: dayRevenue });
      }
    }
    else if (revenueFilter === '6M') {
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();

        const monthRevenue = invoices
          .filter(inv => {
            const dateRef = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.due_date);
            // Handle potential timezone offset issues by treating string directly if possible, but Date object is safer for month extraction
            // Assuming dates are stored as YYYY-MM-DD, new Date('2024-01-01') is UTC. 
            // We need to match month/year.
            // Let's rely on simple month/year check.
            return inv.status === 'PAGO' && dateRef.getMonth() === m && dateRef.getFullYear() === y;
          })
          .reduce((sum, inv) => sum + Number(inv.amount), 0);

        chartData.push({ name: months[m], value: monthRevenue });
      }
    }
    else if (revenueFilter === '1Y') {
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();

        const monthRevenue = invoices
          .filter(inv => {
            const dateRef = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.due_date);
            return inv.status === 'PAGO' && dateRef.getMonth() === m && dateRef.getFullYear() === y;
          })
          .reduce((sum, inv) => sum + Number(inv.amount), 0);

        chartData.push({ name: months[m], value: monthRevenue });
      }
    }

    setRevenueData(chartData);

    // Prepare Pie Chart Data (Clients by City)
    const cityCounts: { [key: string]: number } = {};
    clients.forEach(c => {
      cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
    });
    const pie = Object.keys(cityCounts).map(city => ({
      name: city,
      value: cityCounts[city]
    }));
    setPieData(pie);
  };

  const metrics = [
    { label: 'Clientes Ativos', value: activeClients.toString(), icon: 'people', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Receita Mensal', value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'payments', color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Inadimplentes', value: delinquents.toString(), icon: 'warning', color: 'bg-red-500/10 text-red-500' },
    { label: 'Taxa de Conversão', value: `${conversionRate}%`, icon: 'trending_up', color: 'bg-purple-500/10 text-purple-500' }
  ];
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Visão geral das métricas do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="overflow-hidden">
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{metric.label}</p>
                <h3 className="text-2xl lg:text-3xl font-bold dark:text-white truncate">{metric.value}</h3>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${metric.color}`}>
                <span className="material-icons-round">{metric.icon}</span>
              </div>
            </div>
            <div className="flex items-center text-emerald-500 text-xs font-semibold">
              <span className="material-icons-round text-sm mr-1">arrow_upward</span>
              +0% vs. mês anterior
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-lg font-bold dark:text-white">Receita</h4>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              {(['1D', '1W', '1M', '6M', '1Y'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRevenueFilter(filter)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${revenueFilter === filter
                    ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)'
                  }}
                  itemStyle={{ color: '#1e293b', fontWeight: 700, fontSize: '14px' }}
                  labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#3b82f6', shadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
          <div className="w-full mb-8">
            <h4 className="text-lg font-bold dark:text-white">Clientes por Cidade</h4>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold dark:text-white">{conversionRate}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ativos</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="text-sm font-medium dark:text-slate-300">{item.name}</span>
                </div>
                <span className="text-sm text-slate-500">{item.value} ({Math.round((item.value / totalClients) * 100)}%)</span>
              </div>
            ))}
            {pieData.length === 0 && <p className="text-center text-sm text-slate-500">Nenhuma cidade</p>}
          </div>
        </div>
      </div>

      <footer className="text-center text-slate-400 text-[10px] tracking-widest pt-8 uppercase font-medium">
        ID: b636bab1 • ISP Manager Pro v2.4.0
      </footer>
    </div>
  );
};

export default Dashboard;
