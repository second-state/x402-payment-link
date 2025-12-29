import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProductsLayout({
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
