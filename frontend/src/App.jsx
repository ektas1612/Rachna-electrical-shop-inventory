import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Products from "./pages/Products";
import Wholesalers from "./pages/Wholesalers";
import Purchases from "./pages/Purchases";
import WholesalerBalances from "./pages/WholesalerBalances";
import Sales from "./pages/Sales";
import WholesalerLedger from "./pages/WholesalerLedger";
import Customers from "./pages/Customers";
import CustomerLedger from "./pages/CustomerLedger";
import Dashboard from "./pages/Dashboard";
import Switchboards from "./pages/Switchboards";
import WholesalerReturns from "./pages/WholesalerReturns";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="wholesalers" element={<Wholesalers />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="wholesaler-balances" element={<WholesalerBalances />} />
        <Route path="sales" element={<Sales />} />
        <Route path="wholesaler-ledger/:id" element={<WholesalerLedger />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerLedger />} />
        <Route path="switchboards" element={<Switchboards />} />
        <Route path="wholesaler-returns" element={<WholesalerReturns />} />
      </Route>
    </Routes>
  );
}
