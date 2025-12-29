import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return <>{children}</>;
}
