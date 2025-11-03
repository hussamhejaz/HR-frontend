// src/components/SuperAdminPrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getSuperadminSession } from "../utils/superAuth";

export default function SuperAdminPrivateRoute() {
  const [status, setStatus] = useState({ loading: true, ok: false });

  useEffect(() => {
    (async () => {
      const sess = await getSuperadminSession();
      setStatus({ loading: false, ok: !!sess.ok });
    })();
  }, []);

  if (status.loading) return null; // or a spinner
  if (!status.ok) return <Navigate to="/superadmin/login" replace />;
  return <Outlet />;
}
