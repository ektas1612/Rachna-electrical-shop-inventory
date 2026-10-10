import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Products from "./pages/Products";

function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Dashboard</h2>
      <p className="text-slate-500">Coming soon — reports and stats.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
      </Route>
    </Routes>
  );
}