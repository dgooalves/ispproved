
export type Status = 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'ATRIBUÍDO' | 'LIVRE';

export interface Client {
  id: string;
  name: string;
  cpf_cnpj: string;
  rg: string;
  street: string;
  neighborhood: string;
  number: string;
  city: string;
  plan: string;
  status: 'ATIVO' | 'BLOQUEADO' | 'DESATIVADO';
  email: string;
  contact: string;
  equipment: string;
  address?: string; // Kept for compatibility if needed, but we use specific fields now
}

export interface Invoice {
  id: string;
  client_id: string;
  due_date: string;
  amount: number;
  status: 'PAGO' | 'PENDENTE';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  serial: string;
  status: 'ATRIBUÍDO' | 'LIVRE';
  client_id?: string | null;
  client_name?: string | null;
}

export interface City {
  id: string;
  name: string;
  state: string;
  technicians: string[];
}

export interface Plan {
  id: string;
  name: string;
  download: string;
  upload: string;
  price: number;
}
