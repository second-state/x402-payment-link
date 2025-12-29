import { DashboardShell } from "@/components/shell/dashboard-shell";
import { ApiKeyList } from "@/components/pages/api-keys/api-key-list";
import { AuthGuard } from "@/lib/auth-guard";

export default function ApiKeysPage() {
  return (
    <AuthGuard>
      <DashboardShell
        title="API Keys"
        description="Issue and revoke API keys for service-to-service calls."
      >
        <ApiKeyList />
      </DashboardShell>
    </AuthGuard>
  );
}
