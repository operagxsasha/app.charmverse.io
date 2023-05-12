import type { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import type stripe from 'stripe';

import {
  InvalidStateError,
  NotFoundError,
  onError,
  onNoMatch,
  requireSpaceMembership,
  requireUser
} from 'lib/middleware';
import { withSessionRoute } from 'lib/session/withSession';
import { createSubscription } from 'lib/subscription/createSubscription';
import type { SubscriptionPeriod, SubscriptionUsage } from 'lib/subscription/utils';

export type CreatePaymentSubscriptionRequest = {
  spaceId: string;
  paymentMethodId: string;
  usage: SubscriptionUsage;
  period: SubscriptionPeriod;
};

export type CreatePaymentSubscriptionResponse = {
  clientSecret: string | null;
  paymentIntentStatus: stripe.PaymentIntent.Status | null;
};

const handler = nc<NextApiRequest, NextApiResponse>({ onError, onNoMatch });

handler
  .use(requireUser)
  .use(requireSpaceMembership({ adminOnly: true, spaceIdKey: 'spaceId' }))
  .post(createPaymentSubscription);

async function createPaymentSubscription(req: NextApiRequest, res: NextApiResponse<CreatePaymentSubscriptionResponse>) {
  const { period, usage, paymentMethodId, spaceId } = req.body as CreatePaymentSubscriptionRequest;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      subscriptionId: true,
      domain: true
    }
  });

  if (!space) {
    throw new NotFoundError('Space not found');
  }

  if (space.subscriptionId) {
    throw new InvalidStateError('Space already has a subscription');
  }

  const { clientSecret, paymentIntentStatus } = await createSubscription({
    paymentMethodId,
    spaceId,
    spaceDomain: space.domain,
    period,
    usage
  });

  res.status(200).json({
    paymentIntentStatus,
    clientSecret
  });
}

export default withSessionRoute(handler);
