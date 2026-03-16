import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-background p-8 shadow-lg border border-border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">PackagePro</h1>
          <p className="mt-2 text-muted-foreground">Create your account</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
