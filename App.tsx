
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { Client } from './types';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/Clients';
import StockPage from './pages/Stock';
import CitiesAndPlans from './pages/CitiesAndPlans';
import Login from './pages/Login';

const SidebarItem: React.FC<{ to: string; icon: string; label: string; active?: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${active ? 'bg-white/10 text-white shadow-sm' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
    <span className="material-icons-round">{icon}</span>
    <span className="font-medium">{label}</span>
  </Link>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,cpf_cnpj.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(5);

        if (!error && data) {
          setSearchResults(data);
          setShowResults(true);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchResultClick = (client: Client) => {
    setSearchQuery('');
    setShowResults(false);
    navigate('/clientes', { state: { openClientId: client.id } });
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error checking session:', error);
        }
        setSession(data?.session ?? null);
      } catch (err) {
        console.error('Unexpected error during auth init:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Ensure loading is false if auth state changes (e.g. from null to session)
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">Carregando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col hidden lg:flex shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="italic tracking-tighter">ISP Manager</span>
            <span className="text-emerald-400">Pro</span>
          </h1>
        </div>

        <div className="px-4 mb-6">
          <div className="bg-white/10 p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white">T.</div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">t.i.diegoalves</p>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Administrador</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem to="/" icon="dashboard" label="Dashboard" active={location.pathname === '/'} />
          <SidebarItem to="/clientes" icon="people" label="Clientes" active={location.pathname === '/clientes'} />
          <SidebarItem to="/cidades" icon="location_city" label="Cidades e Planos" active={location.pathname === '/cidades'} />
          <SidebarItem to="/estoque" icon="inventory_2" label="Estoque" active={location.pathname === '/estoque'} />
          <SidebarItem to="/relatorios" icon="bar_chart" label="Relatórios" active={location.pathname === '/relatorios'} />
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors text-left text-white/70 hover:text-white"
          >
            <span className="material-icons-round">{darkMode ? 'light_mode' : 'dark_mode'}</span>
            <span className="font-medium">Alterar Tema</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors text-left text-red-400"
          >
            <span className="material-icons-round">logout</span>
            <span className="font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="relative w-96 max-w-full">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-sm dark:text-white"
              placeholder="Buscar clientes por nome, CPF ou email..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 2 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            {/* Search Results Dropdown */}
            {showResults && (searchResults.length > 0 || isSearching) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Buscando...</div>
                ) : searchResults.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {searchResults.map(client => (
                      <li
                        key={client.id}
                        onClick={() => handleSearchResultClick(client)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{client.name}</p>
                          <p className="text-xs text-slate-400">{client.city} • {client.plan}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${client.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          }`}>
                          {client.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-sm">Nenhum resultado encontrado.</div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-primary transition-colors">
              <span className="material-icons-round">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white ring-2 ring-transparent group-hover:ring-primary/20 transition-all">D.</div>
              <span className="text-sm font-medium hidden sm:block dark:text-slate-300">diegoalves@gmail.com</span>
              <span className="material-icons-round text-slate-400">expand_more</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/estoque" element={<StockPage />} />
            <Route path="/cidades" element={<CitiesAndPlans />} />
            {/* Fallback */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const RootApp = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export default RootApp;
