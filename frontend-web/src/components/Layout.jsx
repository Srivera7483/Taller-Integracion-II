import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans">
      {/* Barra lateral de navegación estática y responsiva */}
      <Sidebar />

      {/* Estructura vertical central: Header + Main + Footer */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header superior */}
        <Header />

        {/* Contenedor central responsivo*/}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children ?? <Outlet />}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
