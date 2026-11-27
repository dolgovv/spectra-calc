import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import AdminCalculationPage from "./AdminCalculationPage";
import AdminPage from "./AdminPage";
import { AdminGate } from "./session/AdminGate";

/** Everything under /admin, loaded as one lazy chunk. The gate stays mounted across its pages. */
export default function AdminApp() {
  return (
    <AdminGate>
      <Routes>
        <Route index element={<AdminPage />} />
        <Route path="calculations/:id" element={<AdminCalculationPage />} />
        <Route path="*" element={<Navigate to={ROUTES.admin} replace />} />
      </Routes>
    </AdminGate>
  );
}
