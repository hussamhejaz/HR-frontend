// src/pages/superadmin/SuperAdminLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";

export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="h-12 flex items-center justify-between px-4 border-b bg-white">
        <div className="font-semibold">Super Admin</div>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/superadmin/tenants" className="hover:underline">Tenants</Link>
        </nav>
      </header>
      <main className="flex-1 min-h-0 p-4">
        <Outlet />
      </main>
    </div>
  );
}
