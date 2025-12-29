import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { LinkList } from "@/components/pages/links/link-list";
import { AuthGuard } from "@/lib/auth-guard";

export default function LinksPage() {
  return (
    <AuthGuard>
      <DashboardShell
        title="Your links"
        description="Manage existing x402 payment links."
        actions={
          <Button asChild size="sm">
            <Link href="/links/new">Create new link</Link>
          </Button>
        }
      >
        <LinkList />
      </DashboardShell>
    </AuthGuard>
  );
}
