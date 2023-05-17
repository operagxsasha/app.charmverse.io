/* eslint-disable camelcase */

import request from 'supertest';
import { v4 } from 'uuid';

import { baseUrl, loginUser } from 'testing/mockApiCall';
import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';
import { addSpaceSubscription } from 'testing/utils/spaces';

describe('POST /api/subscription/subscribe - Create subscription for space', () => {
  it('should throw error if the user is not an admin and return 401', async () => {
    const { space, user } = await generateUserAndSpaceWithApiToken({}, false);
    const userCookie = await loginUser(user.id);

    const paymentMethodId = v4();

    await request(baseUrl)
      .post(`/api/subscription/subscribe`)
      .set('Cookie', userCookie)
      .send({
        paymentMethodId,
        spaceId: space.id,
        period: 'monthly',
        usage: 1,
        billingEmail: 'test@gmail.com',
        fullName: 'John Doe',
        streetAddress: '123 Main St'
      })
      .expect(401);
  });

  it('should throw error if the space already has a subscription and return 400', async () => {
    const { space, user } = await generateUserAndSpaceWithApiToken({});
    const userCookie = await loginUser(user.id);

    await addSpaceSubscription({
      spaceId: space.id,
      createdBy: user.id
    });

    const paymentMethodId = v4();

    await request(baseUrl)
      .post(`/api/subscription/subscribe`)
      .set('Cookie', userCookie)
      .send({
        paymentMethodId,
        spaceId: space.id,
        period: 'monthly',
        usage: 1,
        billingEmail: 'test@gmail.com',
        fullName: 'John Doe',
        streetAddress: '123 Main St'
      })
      .expect(400);
  });
});
