import { SignUp } from '@clerk/react';
import { clerkAppearance } from '../clerkAppearance';
import { LanguageSwitch } from '../components/LanguageSwitch';

export function SignUpPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitch />
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={clerkAppearance} />
    </div>
  );
}
