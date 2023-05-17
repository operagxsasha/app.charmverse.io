import { prisma } from '@charmverse/core';
import type Stripe from 'stripe';

import { InvalidStateError, NotFoundError } from 'lib/middleware';

import type { SubscriptionPeriod, SubscriptionUsage } from './constants';
import { SUBSCRIPTION_USAGE_RECORD } from './constants';
import { stripeClient } from './stripe';

export type PaymentDetails = {
  fullName: string;
  billingEmail: string;
  streetAddress: string;
};

export type CreateProSubscriptionRequest = PaymentDetails & {
  spaceId: string;
  paymentMethodId: string;
  usage: SubscriptionUsage;
  period: SubscriptionPeriod;
};

export type CreateProSubscriptionResponse = {
  clientSecret: string | null;
  paymentIntentStatus: Stripe.PaymentIntent.Status | null;
};

export async function createProSubscription({
  paymentMethodId,
  spaceId,
  period,
  usage,
  billingEmail,
  fullName,
  userId
}: {
  userId: string;
  usage: SubscriptionUsage;
  paymentMethodId: string;
  spaceId: string;
  period: SubscriptionPeriod;
} & PaymentDetails) {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      domain: true,
      id: true,
      stripeSubscription: {
        where: {
          deletedAt: null
        },
        take: 1,
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  const activeSpaceSubscription = space?.stripeSubscription[0];

  if (!space) {
    throw new NotFoundError('Space not found');
  }

  if (activeSpaceSubscription) {
    throw new InvalidStateError('Space already has a subscription');
  }

  // Create a customer
  const customer = await stripeClient.customers.create({
    name: fullName,
    payment_method: paymentMethodId,
    invoice_settings: { default_payment_method: paymentMethodId },
    email: billingEmail
  });

  const product = await stripeClient.products.retrieve(`pro-${usage}-${period}`);

  // In cent so multiplying by 100
  const amount = SUBSCRIPTION_USAGE_RECORD[usage].pricing[period] * (period === 'monthly' ? 1 : 12) * 100;

  // Create a subscription
  const subscription = await stripeClient.subscriptions.create({
    metadata: {
      usage,
      period,
      tier: 'pro',
      spaceId: space.id
    },
    customer: customer.id,
    items: [
      {
        price_data: {
          currency: 'USD',
          product: product.id,
          unit_amount: amount,
          recurring: {
            interval: period === 'monthly' ? 'month' : 'year'
          }
        }
      }
    ],
    payment_settings: {
      payment_method_types: ['card'],
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent']
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  const [spaceSubscription] = await prisma.$transaction([
    prisma.stripeSubscription.create({
      data: {
        createdBy: userId,
        customerId: customer.id,
        subscriptionId: subscription.id,
        period,
        productId: product.id,
        spaceId: space.id,
        stripePayment: {
          create: {
            amount,
            currency: 'USD',
            paymentId: paymentIntent.id,
            status: paymentIntent.status === 'succeeded' ? 'success' : 'fail'
          }
        }
      }
    }),
    prisma.space.update({
      where: {
        id: spaceId
      },
      data: {
        paidTier: 'pro'
      }
    })
  ]);

  return {
    subscriptionId: spaceSubscription.id,
    paymentIntentStatus: paymentIntent?.status ?? null,
    clientSecret: paymentIntent?.client_secret ?? null
  };
}
