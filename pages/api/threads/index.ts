import { PageNotFoundError } from '@charmverse/core/errors';
import { prisma } from '@charmverse/core/prisma-client';
import type { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';

import { trackUserAction } from 'lib/metrics/mixpanel/trackUserAction';
import { ActionNotPermittedError, onError, onNoMatch, requireKeys, requireUser } from 'lib/middleware';
import { providePermissionClients } from 'lib/permissions/api/permissionsClientMiddleware';
import { withSessionRoute } from 'lib/session/withSession';
import type { ThreadCreate, ThreadWithComments } from 'lib/threads';
import { createThread } from 'lib/threads';
import { WebhookEventNames } from 'lib/webhookPublisher/interfaces';
import { publishBountyEvent, publishDocumentEvent, publishProposalEvent } from 'lib/webhookPublisher/publishEvent';

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler
  .use(requireUser)
  .use(
    providePermissionClients({
      key: 'pageId',
      location: 'body',
      resourceIdType: 'page'
    })
  )
  .post(requireKeys<ThreadCreate>(['context', 'pageId', 'comment'], 'body'), startThread);

async function startThread(req: NextApiRequest, res: NextApiResponse<ThreadWithComments>) {
  const { comment, context, pageId } = req.body as ThreadCreate;

  const userId = req.session.user.id;

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { spaceId: true, createdBy: true, type: true, bountyId: true, proposalId: true }
  });

  if (!page) {
    throw new PageNotFoundError(pageId);
  }

  const permissions = await req.basePermissionsClient.pages.computePagePermissions({
    resourceId: pageId,
    userId
  });

  if (!permissions.comment) {
    throw new ActionNotPermittedError();
  }

  const newThread = await createThread({
    comment,
    context,
    pageId,
    userId
  });

  const inlineCommentId = newThread.comments[0].id;

  if (page.type === 'bounty' && page.bountyId) {
    await publishBountyEvent({
      bountyId: page.bountyId,
      scope: WebhookEventNames.BountyInlineCommentCreated,
      inlineCommentId,
      spaceId: page.spaceId
    });
  } else if (page.type === 'proposal' && page.proposalId) {
    await publishProposalEvent({
      proposalId: page.proposalId,
      scope: WebhookEventNames.ProposalInlineCommentCreated,
      inlineCommentId,
      spaceId: page.spaceId
    });
  } else {
    await publishDocumentEvent({
      documentId: pageId,
      scope: WebhookEventNames.DocumentInlineCommentCreated,
      inlineCommentId,
      spaceId: page.spaceId,
      userId
    });
  }

  trackUserAction('page_comment_created', {
    pageId,
    userId,
    spaceId: newThread.spaceId
  });

  return res.status(201).json(newThread);
}

export default withSessionRoute(handler);
