import type { Application } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';

import { getBountyOrThrow } from 'lib/bounties/getBounty';
import { DuplicateDataError, MissingDataError, UnauthorisedActionError } from 'lib/utilities/errors';
import { WebhookEventNames } from 'lib/webhookPublisher/interfaces';
import { publishBountyEvent } from 'lib/webhookPublisher/publishEvent';

import type { SubmissionCreationData } from '../interfaces';
import { bountyCanReceiveNewSubmissionsOrApplications } from '../shared';

export async function createSubmission({
  bountyId,
  submissionContent,
  userId,
  customReward
}: SubmissionCreationData): Promise<Application> {
  const bounty = await getBountyOrThrow(bountyId);

  if (bounty.approveSubmitters === true) {
    throw new UnauthorisedActionError('This bounty requires submitters to apply first.');
  }

  if (!bountyCanReceiveNewSubmissionsOrApplications({ bounty, submissionsAndApplications: bounty.applications })) {
    throw new UnauthorisedActionError('This bounty cannot accept submissions');
  }

  const existingApplication = bounty.applications.find((app) => app.createdBy === userId);

  if (existingApplication) {
    throw new DuplicateDataError('You already have a submission for this bounty');
  }

  if (typeof submissionContent.submission !== 'string' || !submissionContent.submissionNodes) {
    throw new MissingDataError('You must provide content in your submission');
  }

  if (!submissionContent.walletAddress && !customReward) {
    throw new MissingDataError(
      'You must provide a wallet address or information for the custom reward in your submission'
    );
  }

  const submission = await prisma.application.create({
    data: {
      message: '',
      status: 'review',
      walletAddress: submissionContent.walletAddress,
      submission: submissionContent.submission,
      submissionNodes:
        typeof submissionContent.submissionNodes === 'object'
          ? JSON.stringify(submissionContent.submissionNodes)
          : submissionContent.submissionNodes,
      bounty: {
        connect: {
          id: bountyId
        }
      },
      applicant: {
        connect: {
          id: userId
        }
      },
      spaceId: bounty.spaceId
    }
  });

  await publishBountyEvent({
    applicationId: submission.id,
    bountyId: bounty.id,
    scope: WebhookEventNames.RewardSubmissionCreated,
    spaceId: bounty.spaceId
  });

  return submission;
}
