import { SignIn } from '@clerk/react';
import { clerkAppearance } from '../clerkAppearance';

export function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-2">
        <div>
          <img src="/logo.svg" alt="" className="mb-4 h-12 w-12" />
          <p className="font-display text-4xl font-semibold tracking-tight">Attendence-Up</p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Open a class session or a one-off event, share a link, and keep the attendance record.
          </p>
        </div>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={clerkAppearance} />
      </div>
    </div>
  );
}
