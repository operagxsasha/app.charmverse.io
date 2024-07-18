import { fetchProject } from '@connect-shared/lib/projects/fetchProject';
import { notFound, redirect } from 'next/navigation';

import { EditProjectPage } from 'components/projects/edit/EditProjectPage';
import { getCurrentUser } from 'lib/actions/getCurrentUser';

export default async function EditProject({
  params
}: {
  params: {
    path: string;
  };
}) {
  const [project, user] = await Promise.all([
    fetchProject({
      path: params.path
    }),
    getCurrentUser()
  ]);

  if (!user?.data) {
    redirect('/');
  }

  if (!user?.data?.connectOnboarded) {
    redirect('/welcome');
  }

  if (!project) {
    return notFound();
  }

  return <EditProjectPage project={project} user={user.data} />;
}
