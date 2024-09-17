import type { Scout } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';
import { getSession } from '@connect-shared/lib/session/getSession';
import { replaceS3Domain } from '@root/lib/utils/url';

export type SessionUser = Pick<Scout, 'id' | 'username' | 'displayName' | 'avatar' | 'builder'>;

export async function getUserFromSession(): Promise<Scout | null> {
  const session = await getSession();
  if (session?.user?.id) {
    const user = await prisma.scout.findFirst({
      where: {
        id: session.user.id
      }
    });

    if (user?.avatar) {
      user.avatar = replaceS3Domain(user.avatar);
    }
    return user;
  }
  return null;
}
