import type { Page } from '@charmverse/core/prisma-client';
import { prisma } from '@charmverse/core/prisma-client';

import { getBountyTasks } from 'lib/bounties/getBountyTasks';

import type { BountyNotification, NotificationsGroup } from './interfaces';
import { notificationMetadataIncludeStatement, sortByDate, upgradedNotificationUserIds } from './utils';

export async function getBountyNotifications(userId: string): Promise<NotificationsGroup<BountyNotification>> {
  if (upgradedNotificationUserIds.includes(userId)) {
    const pageNotifications = await prisma.bountyNotification.findMany({
      where: {
        notificationMetadata: {
          userId
        }
      },
      include: {
        bounty: {
          select: {
            status: true,
            page: {
              select: {
                id: true,
                path: true,
                type: true,
                title: true
              }
            }
          }
        },
        notificationMetadata: {
          include: notificationMetadataIncludeStatement
        }
      }
    });

    const bountyNotificationsGroup: NotificationsGroup<BountyNotification> = {
      marked: [],
      unmarked: []
    };

    pageNotifications.forEach((notification) => {
      const notificationMetadata = notification.notificationMetadata;
      const page = notification.bounty.page as Page;
      const bountyNotification = {
        taskId: notification.id,
        applicationId: notification.applicationId,
        createdAt: notificationMetadata.createdAt.toISOString(),
        createdBy: notificationMetadata.author,
        inlineCommentId: notification.inlineCommentId,
        mentionId: notification.mentionId,
        pageId: page.id,
        pagePath: page.path,
        pageTitle: page.title || 'Untitled',
        spaceDomain: notificationMetadata.space.domain,
        spaceId: notificationMetadata.spaceId,
        spaceName: notificationMetadata.space.name,
        status: notification.bounty.status,
        type: notification.type,
        group: 'bounty',
        archived: !!notificationMetadata.archived,
        read: !!notificationMetadata.seenAt
      } as BountyNotification;

      if (notification.notificationMetadata.seenAt) {
        bountyNotificationsGroup.marked.push(bountyNotification);
      } else {
        bountyNotificationsGroup.unmarked.push(bountyNotification);
      }
    });

    return {
      marked: bountyNotificationsGroup.marked.sort(sortByDate),
      unmarked: bountyNotificationsGroup.unmarked.sort(sortByDate)
    };
  }

  return getBountyTasks(userId);
}
