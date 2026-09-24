import { SignIn } from '@clerk/react';
import { useTranslation } from 'react-i18next';
import { clerkAppearance } from '../clerkAppearance';
import { LanguageSwitch } from '../components/LanguageSwitch';

export function SignInPage() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitch />
      </div>
      <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-2">
        <div>
          <img src="/logo.svg" alt="" className="mb-4 h-12 w-12" />
          <p className="text-sm font-semibold tracking-wide">Attendence-Up</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{t('signIn.title')}</h1>
          <p className="mt-3 max-w-sm text-sm text-muted">{t('seo.signInDescription')}</p>
        </div>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={clerkAppearance} />
      </div>
    </div>
  );
}
