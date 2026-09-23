import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { useApi } from '../api/context';
import { FormLayout } from '../components/FormLayout';
import { SessionForm } from '../components/SessionForm';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/ui';

export function SessionCreatePage() {
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

  if (classId && course.isLoading) return <LoadingBlock label="Loading class" />;
  if (classId && course.isError) return <ErrorBlock error={course.error} />;

  return (
    <div>
      <PageHeader
        eyebrow={course.data?.name ?? 'Sessions'}
        title={classId ? 'New class session' : 'New standalone session'}
        description={
          classId
            ? 'This session stays attached to the class. The classroom default is filled in so you can adjust it.'
            : 'Use this for a workshop, meetup, or any attendance that does not belong to a class.'
        }
      />
      <FormLayout
        tips={[
          { icon: 'edit_calendar', title: 'Starts as a draft', body: 'Nobody can check in until you open attendance from the session page.' },
          { icon: 'link', title: 'Share one link', body: 'Each session gets its own public check-in link for students.' },
          { icon: 'timer', title: 'Optional time window', body: 'Set when check-in opens and closes, or leave it open while the session is open.' },
        ]}
      >
        <SessionForm
          initial={
            course.data
              ? {
                  name: '',
                  description: '',
                  attendanceOpensAt: null,
                  attendanceClosesAt: null,
                  location: course.data.location,
                }
              : undefined
          }
          submitLabel="Create session"
          pending={mutation.isPending}
          error={mutation.error}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </FormLayout>
    </div>
  );
}
