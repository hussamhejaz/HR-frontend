// src/Layout.jsx

import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";

const Layout = () => (
  <div className="flex h-screen">
    <Sidebar />
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <Outlet />
    </main>
  </div>
);

export default Layout;
