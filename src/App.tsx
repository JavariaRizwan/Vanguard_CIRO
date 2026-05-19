/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeDashboard from "./pages/HomeDashboard";
import ReportIncident from "./pages/ReportIncident";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PostReportOnboarding from "./pages/PostReportOnboarding";
import AlertDetail from "./pages/AlertDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ReportDetail from "./pages/ReportDetail";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-surface flex flex-col">
        <Routes>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/report" element={<ReportIncident />} />
          <Route path="/report-detail/:id" element={<ReportDetail />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<PostReportOnboarding />} />
          <Route path="/alert/:id" element={<AlertDetail />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
