import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useApi } from '../api/context';
import { ClassForm } from '../components/ClassForm';
import { FormLayout } from '../components/FormLayout';
import { PageHeader } from '../components/ui';
import { paths } from '../lib/paths';

export function ClassCreatePage() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.createClass,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      navigate(paths.class(created.id));
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow={t('classCreate.eyebrow')}
        title={t('classCreate.title')}
        description={t('classCreate.description')}
      />
      <FormLayout
        tips={[
          { icon: 'school', title: t('classCreate.tipCourseTitle'), body: t('classCreate.tipCourseBody') },
          { icon: 'event_note', title: t('classCreate.tipHistoryTitle'), body: t('classCreate.tipHistoryBody') },
          { icon: 'my_location', title: t('classCreate.tipLocationTitle'), body: t('classCreate.tipLocationBody') },
        ]}
      >
        <ClassForm
          submitLabel={t('classCreate.submit')}
          pending={mutation.isPending}
          error={mutation.error}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </FormLayout>
    </div>
  );
}
