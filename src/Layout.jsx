
import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import AuthWatcher from "./components/AuthWatcher"; // ⬅️ add this

const Layout = () => (
  <div className="flex h-screen">
    <AuthWatcher /> {/* ⬅️ mount once so it watches globally */}
    <Sidebar />
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <Outlet />
    </main>
  </div>
);

export default Layout;
