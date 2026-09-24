import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { useApi } from '../api/context';
import { Button, Card, ErrorBlock, Field, LoadingBlock, PageHeader, inputClass } from '../components/ui';

const LOGO_TYPES = new Set(['image/png', 'image/jpeg']);

function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const max = 256;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    image.src = url;
  });
}

export function SettingsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.me() });
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [career, setCareer] = useState('');
  const [printName, setPrintName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!me.data) return;
    setUniversity(me.data.university);
    setFaculty(me.data.faculty);
    setCareer(me.data.career);
    setPrintName(me.data.printName);
    setLogo(me.data.logo);
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => api.updateMe({ university, faculty, career, printName, logo }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['me'], profile);
      setSaved(true);
    },
  });

  if (me.isLoading) return <LoadingBlock />;
  if (me.isError) return <ErrorBlock error={me.error} />;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} description={t('settings.body')} />
      <Card className="mt-6 p-5">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(false);
            save.mutate();
          }}
        >
          <Field label={t('settings.university')}>
            <input className={inputClass} value={university} maxLength={160} onChange={(event) => setUniversity(event.target.value)} />
          </Field>
          <Field label={t('settings.faculty')}>
            <input className={inputClass} value={faculty} maxLength={160} onChange={(event) => setFaculty(event.target.value)} />
          </Field>
          <Field label={t('settings.career')}>
            <input className={inputClass} value={career} maxLength={160} onChange={(event) => setCareer(event.target.value)} />
          </Field>
          <Field label={t('settings.instructor')} hint={t('settings.instructorHint', { name: me.data?.displayName ?? '' })}>
            <input className={inputClass} value={printName} maxLength={160} onChange={(event) => setPrintName(event.target.value)} />
          </Field>
          <Field label={t('settings.logo')} hint={t('settings.logoHint')} error={logoError ?? undefined}>
            <div className="flex items-center gap-4">
              <img src={logo || '/logo.svg'} alt="" className="h-16 w-16 rounded-xl object-contain" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => logoInput.current?.click()}>
                  {t('settings.chooseLogo')}
                </Button>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    if (!LOGO_TYPES.has(file.type)) {
                      setLogoError(t('settings.logoError'));
                      return;
                    }
                    setLogoError(null);
                    void readLogo(file)
                      .then(setLogo)
                      .catch(() => setLogoError(t('settings.logoError')));
                  }}
                />
                {logo ? (
                  <Button type="button" variant="secondary" onClick={() => setLogo(null)}>
                    {t('settings.removeLogo')}
                  </Button>
                ) : null}
              </div>
            </div>
          </Field>
          {save.isError ? <ErrorBlock error={save.error instanceof ApiError ? save.error : save.error} /> : null}
          {saved ? <p className="text-sm text-teal">{t('settings.saved')}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('common.saving') : t('settings.save')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
