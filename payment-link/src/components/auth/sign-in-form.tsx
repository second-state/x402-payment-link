"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  redirectTo?: string;
};

export function SignInForm({ redirectTo }: Props) {
  const { toast, ToastContainer } = useToast();

  async function handleGoogle() {
    try {
      await signIn("google", { callbackUrl: redirectTo || "/" });
    } catch {
      toast({ title: "Sign in failed", description: "Google auth error", variant: "destructive" });
    }
  }

  return (
    <Card className="max-w-md border-slate-200/50 bg-white/90 shadow-lg">
      <ToastContainer />
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Access your dashboard</CardTitle>
        <CardDescription>Secure sign-in with Google</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50" onClick={handleGoogle}>
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <svg viewBox="0 0 48 48" className="h-5 w-5">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.9-6.9C35.7 2.48 30.39 0 24 0 14.62 0 6.52 5.38 2.55 13.22l8.05 6.26C12.4 12.71 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.58-.14-3.09-.4-4.5H24v9.02h12.7c-.55 2.97-2.23 5.49-4.75 7.18l7.3 5.67C43.78 37.82 46.5 31.66 46.5 24.5z"
              />
              <path
                fill="#FBBC05"
                d="M10.6 28.96c-.48-1.43-.76-2.96-.76-4.53s.28-3.1.76-4.53l-8.05-6.27C.93 16.25 0 20 0 24c0 3.99.93 7.74 2.55 11.37l8.05-6.26z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.39 0 11.78-2.11 15.71-5.74l-7.3-5.68c-2.02 1.35-4.61 2.14-8.41 2.14-6.26 0-11.6-3.21-13.86-8.02l-8.05 6.26C6.52 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </span>
          <span>Continue with Google</span>
        </Button>
      </CardContent>
    </Card>
  );
}
