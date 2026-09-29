import React from 'react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const mockUsers = [
  { id: 'usr-1', name: 'Benjamin Santillan', email: 'benjamin@empresa.com', role: 'Administrador', status: 'active', lastLogin: '2026-09-24 10:30' },
  { id: 'usr-2', name: 'Juan Perez', email: 'juan.p@empresa.com', role: 'Técnico', status: 'active', lastLogin: '2026-09-23 15:45' },
  { id: 'usr-3', name: 'Maria Lopez', email: 'maria.l@empresa.com', role: 'Usuario', status: 'inactive', lastLogin: '2026-09-10 09:12' },
  { id: 'usr-4', name: 'Carlos Diaz', email: 'carlos.d@empresa.com', role: 'Técnico', status: 'active', lastLogin: '2026-09-24 08:20' },
  { id: 'usr-5', name: 'Ana Silva', email: 'ana.s@empresa.com', role: 'Usuario', status: 'active', lastLogin: '2026-09-22 14:10' },
  { id: 'usr-6', name: 'Luis Gomez', email: 'luis.g@empresa.com', role: 'Usuario', status: 'inactive', lastLogin: '2026-08-30 11:05' },
];

const Usuarios = () => {
  const columns = [
    { 
      header: 'Usuario', 
      accessorKey: 'name',
      cell: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              {row.name.charAt(0)}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Rol', 
      accessorKey: 'role',
      cell: (row) => {
        const roleColors = {
          'Administrador': 'bg-purple-100 text-purple-800 border-purple-200',
          'Técnico': 'bg-blue-100 text-blue-800 border-blue-200',
          'Usuario': 'bg-gray-100 text-gray-800 border-gray-200'
        };
        const colorClass = roleColors[row.role] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${colorClass}`}>
            {row.role}
          </span>
        );
      }
    },
    { 
      header: 'Estado', 
      accessorKey: 'status',
      cell: (row) => <StatusBadge status={row.status === 'active' ? 'activo' : 'inactivo'} />
    },
    { 
      header: 'Último Acceso', 
      accessorKey: 'lastLogin' 
    },
    {
      header: 'Acciones',
      accessorKey: 'actions',
      cell: (row) => (
        <button className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors">
          Editar
        </button>
      )
    }
  ];

};

export default Usuarios;
