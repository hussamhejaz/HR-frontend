// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirebaseAuth } from "../firebase";
import { isTokenExpired } from "../utils/jwt";
import CircularLoader from "./CircularLoader";

const PrivateRoute = ({ children }) => {
  const auth = getFirebaseAuth();
  const [user, loading] = useAuthState(auth);
  const loc = useLocation();

  if (loading) return <CircularLoader />;

  const token = localStorage.getItem("fb_id_token");
  const expired = !token || isTokenExpired(token);

  if (!user || expired) {
    const q = new URLSearchParams({
      reason: !user ? "signedout" : "expired",
      from: loc.pathname,
    }).toString();
    return <Navigate to={`/login?${q}`} replace />;
  }

  return children;
};

export default PrivateRoute;
