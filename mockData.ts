
import { Client, Equipment, City, Plan, Invoice } from './types';

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Cleucilene de Souza',
    cpf_cnpj: '704.816.282-15',
    rg: '1234567',
    street: 'Castelo Branco',
    neighborhood: 'Ciganopolis',
    number: '75',
    city: 'Coari',
    plan: '30Mb',
    status: 'ATIVO',
    email: 'cleucisouza12@gmail.com',
    contact: '(92) 99962-7452',
    equipment: 'ONU Padrão'
  },
  {
    id: '2',
    name: 'Diego Alves',
    cpf_cnpj: '052.873.252-82',
    rg: '2345678',
    street: 'Rua Principal',
    neighborhood: 'Centro',
    number: '100',
    city: 'Coari',
    plan: '30Mb',
    status: 'ATIVO',
    email: 'diegoalves@gmail.com',
    contact: '(92) 98888-8888',
    equipment: 'UBIQUITI ONU'
  }
];

export const mockInvoices: Invoice[] = [
  { id: 'i1', client_id: '1', due_date: '15/01/2026', amount: 99.90, status: 'PAGO', payment_method: 'PIX', payment_date: '15/01/2026' },
  { id: 'i2', client_id: '1', due_date: '15/02/2026', amount: 99.90, status: 'PENDENTE' }
];

export const mockEquipment: Equipment[] = [
  { id: 'e1', name: 'UBIQUITI', type: 'ONU', serial: '346743254466', status: 'ATRIBUÍDO', client_id: '1', client_name: 'Diego Alves' },
  { id: 'e2', name: 'TP-LINK', type: 'Archer C60', serial: '987654321012', status: 'LIVRE', client_id: null, client_name: null }
];

export const mockCities: City[] = [
  { id: 'c1', name: 'Alvarães', state: 'AM', technicians: ['Cleucione'] },
  { id: 'c2', name: 'Coari', state: 'AM', technicians: ['Helio', 'Raimson', 'Arleson', 'Brito', 'Éder'] },
  { id: 'c3', name: 'Codajás', state: 'AM', technicians: ['Wesley'] }
];

export const mockPlans: Plan[] = [
  { id: 'p1', name: '30Mb', download: '30MB', upload: '15MB', price: 99.99 },
  { id: 'p2', name: '10MB - ALV', download: '10MB', upload: '5MB', price: 100.00 },
  { id: 'p3', name: '60MB', download: '60MB', upload: '30MB', price: 149.90 },
  { id: 'p4', name: '20MB - ALV', download: '20MB', upload: '10MB', price: 150.00 }
];
