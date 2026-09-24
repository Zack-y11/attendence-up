import { SignUp } from '@clerk/react';
import { useTranslation } from 'react-i18next';
import { clerkAppearance } from '../clerkAppearance';
import { LanguageSwitch } from '../components/LanguageSwitch';

export function SignUpPage() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitch />
      </div>
      <div className="grid w-full max-w-md justify-items-center gap-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide">Attendence-Up</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{t('seo.signUpHeadline')}</h1>
          <p className="mt-3 text-sm text-muted">{t('seo.signUpDescription')}</p>
        </div>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={clerkAppearance} />
      </div>
    </div>
  );
}
