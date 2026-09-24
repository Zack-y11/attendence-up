import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { buttonClass } from '../components/ui';

export function LandingPage() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitch />
      </div>
      <div className="max-w-xl">
        <img src="/logo.svg" alt="" className="mb-4 h-12 w-12" />
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t('seo.headline')}</h1>
        <p className="mt-4 max-w-lg text-sm text-muted">{t('seo.snippet')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/sign-in" className={buttonClass()}>
            {t('landing.signIn')}
          </Link>
          <Link to="/sign-up" className={buttonClass('secondary')}>
            {t('landing.signUp')}
          </Link>
        </div>
      </div>
    </div>
  );
}
