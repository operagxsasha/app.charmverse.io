'use server';

import { log } from '@charmverse/core/log';
import { disableCredentialAutopublish } from '@root/lib/credentials/constants';

import { authActionClient } from 'lib/actions/actionClient';

import { storeProjectMetadataAndPublishOptimismAttestation } from '../attestations/storeProjectMetadataAndPublishOptimismAttestation';

import { createConnectProject } from './createConnectProject';
import { schema } from './form';
import { generateOgImage } from './generateOgImage';

export const createProjectAction = authActionClient
  .metadata({ actionName: 'create-project' })
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const input = parsedInput;
    const currentUserId = ctx.session.user!.id;
    const newProject = await createConnectProject({
      userId: currentUserId,
      input
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

    return { success: true, projectId: newProject.id, projectPath: newProject.path };
  });
