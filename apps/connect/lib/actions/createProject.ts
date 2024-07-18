'use server';

import { log } from '@charmverse/core/log';
import { storeProjectMetadataAndPublishOptimismAttestation } from '@connect-shared/lib/attestations/storeProjectMetadataAndPublishOptimismAttestation';
import { createOptimismProject } from '@connect-shared/lib/projects/createOptimismProject';
import { schema } from '@connect-shared/lib/projects/form';
import { generateOgImage } from '@connect-shared/lib/projects/generateOgImage';
import { disableCredentialAutopublish } from '@root/lib/credentials/constants';

import { authActionClient } from 'lib/actions/actionClient';

export const actionCreateProject = authActionClient
  .metadata({ actionName: 'create-project' })
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const input = parsedInput;
    const currentUserId = ctx.session.user!.id;
    const newProject = await createOptimismProject({
      userId: currentUserId,
      input,
      source: 'connect'
    });

    if (!disableCredentialAutopublish) {
      await storeProjectMetadataAndPublishOptimismAttestation({
        projectId: newProject.id,
        userId: currentUserId
      }).catch((err) => {
        log.error('Failed to store project metadata and publish optimism attestation', { err, userId: currentUserId });
      });
    }

    await generateOgImage(newProject.id, currentUserId);

    return { projectId: newProject.id, projectPath: newProject.path };
  });
