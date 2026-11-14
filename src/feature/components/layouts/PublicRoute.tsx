import { Navigate, Outlet } from "react-router-dom";
import { homePathFor, storedRole } from "../../context/users/homePath";

export default function PublicRoute() {
  const token = localStorage.getItem("user_token");

  if (token) {
    return <Navigate to={homePathFor(storedRole())} replace />;
  }

  return <Outlet />;
}
