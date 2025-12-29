import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_35%)]" />
      <div className="relative mx-auto grid min-h-[70vh] max-w-5xl gap-10 rounded-3xl border border-white/5 bg-white/5 p-10 shadow-2xl backdrop-blur lg:grid-cols-2">
        <div className="flex flex-col justify-center space-y-4 text-white">
          <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
            x402 payment link
          </div>
          <h1 className="text-4xl font-bold leading-tight">Sign in to manage your links</h1>
          <p className="text-sm text-white/80">
            Create shareable payment links, issue API keys, and keep your product pricing in sync. Secure
            access via Google only—no passwords to remember.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <SignInForm />
          </div>
        </div>
      </div>
    </div>
  );
}
