import type { User, UserNotification } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';
import { v4 } from 'uuid';

import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';

import { markNotifications } from '../markNotifications';

let user: User;
let userNotification: UserNotification;
beforeAll(async () => {
  const generated = await generateUserAndSpaceWithApiToken();
  user = generated.user;
  userNotification = await prisma.userNotification.create({
    data: {
      taskId: v4(),
      type: 'mention',
      userId: user.id
    }
  });
});

describe('markTasks', () => {
  it('Should create notification for a task if its not present', async () => {
    const taskId = v4();
    await markNotifications([
      {
        id: taskId
      }
    ]);

    const userNotifications = await prisma.userNotification.findMany({
      where: {
        userId: user.id
      },
      select: {
        taskId: true
      }
    });

    const userNotificationTaskIds = userNotifications.map((_userNotification) => _userNotification.taskId);
    expect(userNotificationTaskIds).toStrictEqual([userNotification.taskId, taskId]);
  });
});
