import { DashboardShell } from "@/components/shell/dashboard-shell";
import { OrderList } from "@/components/pages/orders/order-list";
import { AuthGuard } from "@/lib/auth-guard";

export default function OrdersPage() {
  return (
    <AuthGuard>
      <DashboardShell title="Orders" description="Recent orders created from your payment links.">
        <OrderList />
      </DashboardShell>
    </AuthGuard>
  );
}
