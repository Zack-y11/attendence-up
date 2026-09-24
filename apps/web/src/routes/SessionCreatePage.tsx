import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useApi } from '../api/context';
import { FormLayout } from '../components/FormLayout';
import { SessionForm } from '../components/SessionForm';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/ui';
import { applyTimeOnDate } from '../lib/datetime';

export function SessionCreatePage() {
  const { t } = useTranslation();
  const { classId } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const course = useQuery({
    queryKey: ['class', classId],
    queryFn: () => api.class(classId ?? ''),
    enabled: Boolean(classId),
  });
  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof api.createSession>[0]) =>
      classId ? api.createClassSession(classId, body) : api.createSession(body),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (classId) await queryClient.invalidateQueries({ queryKey: ['class', classId] });
      navigate(`/sessions/${created.id}`);
    },
  });

  if (classId && course.isLoading) return <LoadingBlock label={t('classDetail.loading')} />;
  if (classId && course.isError) return <ErrorBlock error={course.error} />;

  return (
    <div>
      <PageHeader
        eyebrow={course.data?.name ?? t('nav.sessions')}
        title={classId ? t('sessionCreate.newClass') : t('sessionCreate.newStandalone')}
        description={classId ? t('sessionCreate.classDescription') : t('sessionCreate.standaloneDescription')}
      />
      <FormLayout
        tips={[
          { icon: 'edit_calendar', title: t('sessionCreate.tipDraftTitle'), body: t('sessionCreate.tipDraftBody') },
          { icon: 'link', title: t('sessionCreate.tipLinkTitle'), body: t('sessionCreate.tipLinkBody') },
          { icon: 'timer', title: t('sessionCreate.tipWindowTitle'), body: t('sessionCreate.tipWindowBody') },
        ]}
      >
        <SessionForm
          initial={
            course.data
              ? {
                  name: '',
                  description: '',
                  attendanceOpensAt: applyTimeOnDate(course.data.startsAt, new Date()),
                  attendanceClosesAt: applyTimeOnDate(course.data.endsAt, new Date()),
                  location: course.data.location,
                }
              : undefined
          }
          submitLabel={t('sessionCreate.submit')}
          pending={mutation.isPending}
          error={mutation.error}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </FormLayout>
    </div>
  );
}
