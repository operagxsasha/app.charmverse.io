/* eslint-disable camelcase */

import { prisma } from '@charmverse/core';
import { v4 } from 'uuid';

import { InvalidStateError, NotFoundError } from 'lib/middleware';
import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';

import { SUBSCRIPTION_USAGE_RECORD } from '../constants';
import { createProSubscription } from '../createProSubscription';
import { stripeClient } from '../stripe';

jest.mock('../stripe', () => ({
  stripeClient: {
    customers: {
      create: jest.fn()
    },
    products: {
      retrieve: jest.fn()
    },
    subscriptions: {
      create: jest.fn()
    }
  }
}));

describe('createProSubscription', () => {
  it('should successfully create pro subscription for space and return client secret', async () => {
    const { space } = await generateUserAndSpaceWithApiToken();

    const paymentMethodId = v4();
    const subscriptionId = v4();
    const client_secret = v4();
    const customerId = v4();
    const productId = v4();

    const createCustomersMockFn = jest.fn().mockResolvedValue({
      id: customerId
    });

    const retrieveProductsMockFn = jest.fn().mockResolvedValue({
      id: productId
    });

    const createSubscriptionsMockFn = jest.fn().mockResolvedValue({
      id: subscriptionId,
      latest_invoice: {
        payment_intent: {
          client_secret,
          status: 'succeeded'
        }
      }
    });

    (stripeClient.customers.create as jest.Mock<any, any>) = createCustomersMockFn;
    (stripeClient.products.retrieve as jest.Mock<any, any>) = retrieveProductsMockFn;
    (stripeClient.subscriptions.create as jest.Mock<any, any>) = createSubscriptionsMockFn;

    const { clientSecret, paymentIntentStatus } = await createProSubscription({
      paymentMethodId,
      period: 'monthly',
      spaceId: space.id,
      usage: 1
    });

    expect(createCustomersMockFn).toHaveBeenCalledWith({
      name: `${space.domain} - ${space.id}`,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId }
    });

    expect(retrieveProductsMockFn).toHaveBeenCalledWith(`pro-1-monthly`);

    expect(createSubscriptionsMockFn).toHaveBeenCalledWith({
      metadata: {
        tier: 'pro',
        period: 'monthly',
        usage: 1,
        spaceId: space.id
      },
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'USD',
            product: productId,
            unit_amount: SUBSCRIPTION_USAGE_RECORD[1].pricing.monthly * 100,
            recurring: {
              interval: 'month'
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

    expect(
      await prisma.space.findUniqueOrThrow({
        where: {
          id: space.id
        },
        select: {
          subscriptionId: true,
          paidTier: true
        }
      })
    ).toStrictEqual({
      subscriptionId,
      paidTier: 'pro'
    });

    expect(paymentIntentStatus).toStrictEqual('succeeded');
    expect(clientSecret).toStrictEqual(client_secret);
  });

  it("should throw error if space doesn't exist", async () => {
    const { space } = await generateUserAndSpaceWithApiToken();

    await prisma.space.update({
      data: {
        subscriptionId: v4()
      },
      where: {
        id: space.id
      }
    });

    const paymentMethodId = v4();

    await expect(
      createProSubscription({
        paymentMethodId,
        period: 'monthly',
        spaceId: v4(),
        usage: 1
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw error if space already has a subscription', async () => {
    const { space } = await generateUserAndSpaceWithApiToken();

    await prisma.space.update({
      data: {
        subscriptionId: v4()
      },
      where: {
        id: space.id
      }
    });

    const paymentMethodId = v4();

    await expect(
      createProSubscription({
        paymentMethodId,
        period: 'monthly',
        spaceId: space.id,
        usage: 1
      })
    ).rejects.toBeInstanceOf(InvalidStateError);
  });
});
