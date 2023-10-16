import type { BountyPermissionLevel, Prisma } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';
import { v4 } from 'uuid';

import { NotFoundError } from 'lib/middleware';
import { getPagePath } from 'lib/pages/utils';
import { InvalidInputError, PositiveNumbersOnlyError } from 'lib/utilities/errors';

import { getRewardOrThrow } from './getReward';
import type { UpdateableRewardFields } from './updateRewardSettings';

export type RewardCreationData = UpdateableRewardFields & { linkedPageId?: string; spaceId: string; userId: string };

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
  dueDate,
  fields,
  reviewers
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
    approveSubmitters,
    maxSubmissions,
    rewardAmount,
    rewardToken,
    customReward
  };

  const rewardPermissions: Prisma.BountyPermissionCreateManyBountyInput[] = [];

  allowedSubmitterRoles?.forEach((roleId) =>
    rewardPermissions.push({
      permissionLevel: 'submitter',
      roleId
    })
  );
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

  if (!linkedPageId) {
    await prisma.bounty.create({
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
            title: '',
            contentText: '',
            content: undefined,
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
            type: 'bounty'
          }
        }
      }
    });
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

  return getRewardOrThrow({ rewardId });
}
