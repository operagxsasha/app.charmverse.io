import type { PageMeta } from '@charmverse/core/pages';
import type { Page, Proposal, Space, User } from '@charmverse/core/prisma-client';
import { testUtilsPages, testUtilsProposals, testUtilsUser } from '@charmverse/core/test';
import { arrayUtils } from '@charmverse/core/utilities';
import request from 'supertest';

import { baseUrl, loginUser } from 'testing/mockApiCall';

describe('GET /api/spaces/[id]/pages - Get Pages in a space', () => {
  let space: Space;
  let admin: User;
  let normalMember: User;
  let reviewerUser: User;
  let adminCookie: string;
  let normalMemberCookie: string;
  let reviewerUserCookie: string;

  let pageWithoutPermissions: Page;
  let pageWithSpacePermission: Page;
  let publicPage: Page;

  let proposalVisibleInProposalsEvaluationPermissionsModel: Proposal;

  beforeAll(async () => {
    ({ user: admin, space } = await testUtilsUser.generateUserAndSpace({ isAdmin: true }));
    normalMember = await testUtilsUser.generateSpaceUser({ spaceId: space.id });
    reviewerUser = await testUtilsUser.generateSpaceUser({ spaceId: space.id });
    adminCookie = await loginUser(admin.id);
    normalMemberCookie = await loginUser(normalMember.id);
    reviewerUserCookie = await loginUser(reviewerUser.id);

    pageWithoutPermissions = await testUtilsPages.generatePage({
      createdBy: admin.id,
      spaceId: space.id,
      title: 'page without permissions'
    });

    pageWithSpacePermission = await testUtilsPages.generatePage({
      createdBy: admin.id,
      spaceId: space.id,
      title: 'page with space permission',
      pagePermissions: [{ assignee: { group: 'space', id: space.id }, permissionLevel: 'full_access' }]
    });

    publicPage = await testUtilsPages.generatePage({
      createdBy: admin.id,
      spaceId: space.id,
      title: 'public page',
      pagePermissions: [{ assignee: { group: 'public' }, permissionLevel: 'view', allowDiscovery: true }]
    });

    proposalVisibleInProposalsEvaluationPermissionsModel = await testUtilsProposals.generateProposal({
      spaceId: space.id,
      userId: admin.id,
      title: 'proposal visible in evaluations model',
      proposalStatus: 'published',
      evaluationInputs: [
        {
          evaluationType: 'vote',
          permissions: [{ operation: 'view', assignee: { group: 'space_member' } }],
          reviewers: [{ group: 'user', id: reviewerUser.id }]
        }
      ]
    });
  });

  it('should return pages a user can access and respond with status code 200', async () => {
    const response = (
      await request(baseUrl).get(`/api/spaces/${space.id}/pages`).set('Cookie', normalMemberCookie).expect(200)
    ).body as PageMeta[];
    const expectedPageIds = arrayUtils
      .extractUuids([pageWithSpacePermission, proposalVisibleInProposalsEvaluationPermissionsModel, publicPage])
      .sort();

    expect(arrayUtils.extractUuids(response).sort()).toEqual(expectedPageIds);
  });

  it('should return public pages for a user outside the space and respond with status code 200', async () => {
    const response = (await request(baseUrl).get(`/api/spaces/${space.id}/pages`).expect(200)).body as PageMeta[];

    expect(arrayUtils.extractUuids(response)).toEqual([publicPage.id]);
  });

  // This test should be kept last as it mutates
  it('should auto-create the first page if no pages exist and user has permission', async () => {
    const { space: newSpace, user: newSpaceAdmin } = await testUtilsUser.generateUserAndSpace({ isAdmin: true });
    const newSpaceAdminCookie = await loginUser(newSpaceAdmin.id);

    const response = await request(baseUrl)
      .get(`/api/spaces/${newSpace.id}/pages`)
      .set('Cookie', newSpaceAdminCookie)
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.length).toBe(1);
  });
});
