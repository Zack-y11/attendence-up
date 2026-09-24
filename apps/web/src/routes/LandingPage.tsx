import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AnimatedGridBackground } from '../components/AnimatedGridBackground';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { buttonClass } from '../components/ui';

export function LandingPage() {
  const { t } = useTranslation();
  const links = [
    { href: 'https://github.com/Zack-y11', label: t('landing.github'), hint: 'Zack-y11' },
    { href: 'https://github.com/Zack-y11/attendence-up', label: t('landing.repo'), hint: 'attendence-up' },
    { href: 'https://x.com/MeIsaac0', label: t('landing.x'), hint: '@MeIsaac0' },
    {
      href: 'https://www.linkedin.com/in/isaac-medrano-romero-4865b3274',
      label: t('landing.linkedin'),
      hint: 'Isaac Medrano',
    },
  ];
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <AnimatedGridBackground />
      <div className="fixed top-4 right-4 z-10">
        <LanguageSwitch />
      </div>
      <div className="relative z-[1] w-full max-w-xl">
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
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t('landing.contribute')}</h2>
          <p className="mt-1.5 max-w-lg text-sm text-muted">{t('landing.contributeBody')}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {links.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2.5 text-sm transition hover:border-line-strong hover:bg-mist"
                >
                  <span>
                    <span className="block font-medium text-ink">{item.label}</span>
                    <span className="block text-xs text-muted">{item.hint}</span>
                  </span>
                  <span aria-hidden className="text-muted">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
