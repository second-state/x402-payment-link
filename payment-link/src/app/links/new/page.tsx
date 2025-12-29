import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { LinkBuilder } from "@/components/pages/links/link-builder";
import { AuthGuard } from "@/lib/auth-guard";

export default function NewLinkPage() {
  return (
    <AuthGuard>
      <DashboardShell
        title="Create link"
        description="Generate a shareable x402 payment link."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/links">Back to links</Link>
          </Button>
        }
      >
        <LinkBuilder mode="create" />
      </DashboardShell>
    </AuthGuard>
  );
}
