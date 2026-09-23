import { SignUp } from '@clerk/react';
import { clerkAppearance } from '../clerkAppearance';

export function SignUpPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={clerkAppearance} />
    </div>
  );
}
