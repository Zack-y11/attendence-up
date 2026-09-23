import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useApi } from '../api/context';
import { ClassForm } from '../components/ClassForm';
import { FormLayout } from '../components/FormLayout';
import { PageHeader } from '../components/ui';

export function ClassCreatePage() {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.createClass,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      navigate(`/classes/${created.id}`);
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Classes"
        title="New class"
        description="You can set a default classroom. New sessions copy it, and you can change each one."
      />
      <FormLayout
        tips={[
          { icon: 'school', title: 'One class per course', body: 'Use a class for a course or group that meets more than once.' },
          { icon: 'event_note', title: 'Sessions keep the history', body: 'Every meeting becomes its own session with its own check-in link.' },
          { icon: 'my_location', title: 'Location is optional', body: 'Distance is shown to you only. Students are never rejected for it.' },
        ]}
      >
        <ClassForm
          submitLabel="Create class"
          pending={mutation.isPending}
          error={mutation.error}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </FormLayout>
    </div>
  );
}
