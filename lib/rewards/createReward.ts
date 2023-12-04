import type { BountyPermissionLevel, Page, Prisma } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';
import { v4 } from 'uuid';

import { NotFoundError } from 'lib/middleware';
import { getPagePath } from 'lib/pages/utils';
import { InvalidInputError, PositiveNumbersOnlyError } from 'lib/utilities/errors';

import { getRewardOrThrow } from './getReward';
import type { UpdateableRewardFields } from './updateRewardSettings';

export type RewardPageProps = Partial<
  Pick<Page, 'title' | 'content' | 'contentText' | 'sourceTemplateId' | 'headerImage' | 'icon' | 'type'>
>;
export type RewardCreationData = UpdateableRewardFields & {
  linkedPageId?: string;
  spaceId: string;
  userId: string;
  pageProps?: RewardPageProps;
  proposalId?: string | null;
};

/**
 * You can create a reward suggestion using only title, spaceId and createdBy. You will see many unit tests using this limited dataset, which will then default the reward to suggestion status. Your logic should account for this.
 */
export async function createReward({
  spaceId,
  userId,
  chainId = 1,
  linkedPageId,
  approveSubmitters = false,
  maxSubmissions,
  rewardAmount = 0.1,
  rewardToken = 'ETH',
  customReward,
  allowedSubmitterRoles,
  assignedSubmitters,
  dueDate,
  fields,
  reviewers,
  pageProps,
  allowMultipleApplications,
  proposalId
}: RewardCreationData) {
  if (!rewardAmount && !customReward) {
    throw new InvalidInputError('A reward must have a reward amount or a custom reward assigned');
  } else if (typeof rewardAmount === 'number' && rewardAmount < 0) {
    throw new PositiveNumbersOnlyError();
  } else if (rewardAmount && (!chainId || !rewardToken)) {
    throw new InvalidInputError(`Reward amount must also have chainId and token`);
  }

  const space = await prisma.space.findUnique({
    where: {
      id: spaceId
    },
    select: {
      id: true,
      publicBountyBoard: true
    }
  });

  if (!space) {
    throw new NotFoundError(`Space with id ${spaceId} not found`);
  }

  const rewardId = v4();

  const isAssignedReward = Array.isArray(assignedSubmitters) && assignedSubmitters.length > 0;

  const rewardCreateInput: Prisma.BountyCreateInput = {
    id: rewardId,
    space: {
      connect: {
        id: spaceId
      }
    },
    author: {
      connect: {
        id: userId
      }
    },
    dueDate,
    fields: fields as any,
    chainId,
    approveSubmitters: isAssignedReward ? false : approveSubmitters,
    maxSubmissions: isAssignedReward ? assignedSubmitters?.length : maxSubmissions,
    rewardAmount,
    rewardToken,
    customReward,
    allowMultipleApplications: isAssignedReward ? false : allowMultipleApplications,
    proposal: proposalId
      ? {
          connect: {
            id: proposalId
          }
        }
      : undefined
  };

  const rewardPermissions: Prisma.BountyPermissionCreateManyBountyInput[] = [];

  // assign submitter roles only if reward is not assigned
  if (isAssignedReward) {
    assignedSubmitters?.forEach((submitterUserId) =>
      rewardPermissions.push({
        permissionLevel: 'submitter',
        userId: submitterUserId
      })
    );
  } else {
    allowedSubmitterRoles?.forEach((roleId) =>
      rewardPermissions.push({
        permissionLevel: 'submitter',
        roleId
      })
    );
  }

  reviewers?.forEach((reviewer) => {
    const permissionLevel: BountyPermissionLevel = 'reviewer';
    if (reviewer.group === 'role') {
      rewardPermissions.push({
        permissionLevel,
        roleId: reviewer.id
      });
    } else if (reviewer.group === 'user') {
      rewardPermissions.push({
        permissionLevel,
        userId: reviewer.id
      });
    }
  });

  let createdPageId: string | undefined;

  if (!linkedPageId) {
    const results = await prisma.bounty.create({
      data: {
        ...rewardCreateInput,
        permissions: {
          createMany: {
            data: rewardPermissions
          }
        },
        page: {
          create: {
            permissions: {
              createMany: {
                data: [
                  {
                    permissionLevel: 'view',
                    spaceId
                  },
                  {
                    permissionLevel: 'full_access',
                    userId
                  }
                ]
              }
            },
            id: rewardId,
            path: getPagePath(),
            space: {
              connect: {
                id: spaceId
              }
            },
            updatedBy: userId,
            author: {
              connect: {
                id: userId
              }
            },
            type: pageProps?.type ?? 'bounty',
            content: pageProps?.content ?? undefined,
            contentText: pageProps?.contentText ?? '',
            headerImage: pageProps?.headerImage,
            sourceTemplateId: pageProps?.sourceTemplateId,
            title: pageProps?.title ?? '',
            icon: pageProps?.icon
          }
        }
      },
      include: {
        page: true
      }
    });
    createdPageId = results.page?.id;
  } else {
    await prisma.$transaction([
      prisma.bounty.create({
        data: {
          ...rewardCreateInput
        }
      }),
      prisma.page.update({
        where: {
          id: linkedPageId
        },
        data: {
          bountyId: rewardId
        }
      })
    ]);
  }

  const reward = await getRewardOrThrow({ rewardId });
  return { reward, createdPageId };
}
