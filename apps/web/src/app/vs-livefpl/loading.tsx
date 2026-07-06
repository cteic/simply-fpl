import { t } from '@simplyfpl/i18n';
import { PageHeader, PageShell } from '@simplyfpl/ui';

export default function VsLivefplLoading() {
  return (
    <PageShell>
      <PageHeader title={t('vs_livefpl.title')} meta={t('vs_livefpl.loading_meta')} />
    </PageShell>
  );
}
