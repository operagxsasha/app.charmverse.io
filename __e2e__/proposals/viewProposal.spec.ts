import type { Page, Proposal, ProposalCategory, Role, Space, User } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';
import { testUtilsMembers, testUtilsProposals, testUtilsUser } from '@charmverse/core/test';
import { test as base, expect } from '@playwright/test';
import { DocumentPage } from '__e2e__/po/document.po';
import { PagePermissionsDialog } from '__e2e__/po/pagePermissions.po';
import { ProposalsListPage } from '__e2e__/po/proposalsList.po';

import { generateSpaceRole, generateUser, loginBrowserUser, logoutBrowserUser } from '../utils/mocks';

type Fixtures = {
  proposalListPage: ProposalsListPage;
  documentPage: DocumentPage;
  pagePermissions: PagePermissionsDialog;
};

const test = base.extend<Fixtures>({
  proposalListPage: ({ page }, use) => use(new ProposalsListPage(page)),
  documentPage: ({ page }, use) => use(new DocumentPage(page)),
  pagePermissions: ({ page }, use) => use(new PagePermissionsDialog(page))
});

let space: Space;
let spaceAdmin: User;
let role: Role;
let proposalReviewer: User;
let proposalAuthor: User;
let visibleProposalCategory: ProposalCategory;
let hiddenProposalCategory: ProposalCategory;
let draftProposal: Proposal;
let discussionProposal: Proposal & { page: Page };
let hiddenProposal: Proposal;

let publicLink: string;

test.beforeAll(async () => {
  // Initial setup
  const generated = await testUtilsUser.generateUserAndSpace({
    isAdmin: true
  });

  space = generated.space;
  spaceAdmin = generated.user;
  role = await testUtilsMembers.generateRole({
    createdBy: spaceAdmin.id,
    spaceId: space.id,
    roleName: 'Proposal Reviewer 2399'
  });

  proposalAuthor = await testUtilsUser.generateSpaceUser({
    spaceId: space.id,
    isAdmin: false
  });

  proposalReviewer = await testUtilsUser.generateSpaceUser({
    spaceId: space.id,
    isAdmin: false
  });

  await prisma.spaceRole.update({
    where: {
      spaceUser: {
        spaceId: space.id,
        userId: proposalAuthor.id
      }
    },
    data: {
      onboarded: true
    }
  });

  hiddenProposalCategory = await testUtilsProposals.generateProposalCategory({
    spaceId: space.id,
    title: 'Invisible Proposals'
  });

  visibleProposalCategory = await testUtilsProposals.generateProposalCategory({
    spaceId: space.id,
    title: 'Proposals',
    proposalCategoryPermissions: [
      {
        permissionLevel: 'full_access',
        assignee: { group: 'space', id: space.id }
      }
    ]
  });

  draftProposal = await testUtilsProposals.generateProposal({
    spaceId: space.id,
    userId: proposalAuthor.id,
    proposalStatus: 'draft',
    categoryId: visibleProposalCategory.id
  });

  discussionProposal = await testUtilsProposals.generateProposal({
    spaceId: space.id,
    userId: proposalAuthor.id,
    proposalStatus: 'discussion',
    categoryId: visibleProposalCategory.id,
    reviewers: [
      { group: 'role', id: role.id },
      { group: 'user', id: proposalReviewer.id }
    ]
  });

  hiddenProposal = await testUtilsProposals.generateProposal({
    spaceId: space.id,
    userId: spaceAdmin.id,
    proposalStatus: 'discussion',
    categoryId: hiddenProposalCategory.id
  });
});

test.describe.serial('View proposal', () => {
  test('Proposal author can view their own draft proposal and other accessible proposals as well as data about the proposals', async ({
    proposalListPage
  }) => {
    await loginBrowserUser({
      browserPage: proposalListPage.page,
      userId: proposalAuthor.id
    });
    // Finish setup start interacting with the app
    await proposalListPage.goToHomePage();

    await proposalListPage.getSidebarLink('proposals').click();

    await proposalListPage.waitForProposalsList();

    const draftRow = proposalListPage.getProposalRowLocator(draftProposal.id);
    const discussionRow = proposalListPage.getProposalRowLocator(discussionProposal.id);
    const hiddenRow = proposalListPage.getProposalRowLocator(hiddenProposal.id);

    await expect(draftRow).toBeVisible();
    await expect(discussionRow).toBeVisible();
    await expect(hiddenRow).not.toBeVisible();

    // Test to make sure the reviewers show up in the table
    const discussionProposalReviewers = await proposalListPage.getProposalRowReviewersLocators(discussionProposal.id);

    // 1 role reviewer + 1 user reviewer
    expect(discussionProposalReviewers).toHaveLength(2);

    for (const reviewer of discussionProposalReviewers) {
      await expect(reviewer).toBeVisible();

      const text = (await reviewer.allInnerTexts()).join('');

      const showingReviewerRoleName = !!text.match(role.name);
      const showingReviewerUserName = !!text.match(proposalReviewer.username);

      expect(showingReviewerRoleName || showingReviewerUserName).toBe(true);
    }
  });

  test('Space member can see visible proposal categories', async ({ proposalListPage, page }) => {
    await loginBrowserUser({
      browserPage: page,
      userId: proposalAuthor.id
    });

    await proposalListPage.goToHomePage();

    await proposalListPage.getSidebarLink('proposals').click();
    await proposalListPage.waitForProposalsList();

    await proposalListPage.openProposalCategoryList();

    const visibleCategoryButton = proposalListPage.getProposalCategoryLocator(visibleProposalCategory.id);
    const hiddenCategoryButton = proposalListPage.getProposalCategoryLocator(hiddenProposalCategory.id);

    await expect(visibleCategoryButton).toBeVisible();
    await expect(hiddenCategoryButton).not.toBeVisible();
  });

  test('Space member can see proposals but not drafts', async ({ proposalListPage }) => {
    const spaceMember = await generateUser();

    await generateSpaceRole({
      spaceId: space.id,
      userId: spaceMember.id
    });
    await loginBrowserUser({
      browserPage: proposalListPage.page,
      userId: spaceMember.id
    });

    await proposalListPage.goToHomePage();
    await proposalListPage.getSidebarLink('proposals').click();
    await proposalListPage.waitForProposalsList();

    // Check the rows content
    const draftRow = proposalListPage.getProposalRowLocator(draftProposal.id);
    await expect(draftRow).not.toBeVisible();

    const feedbackRow = proposalListPage.getProposalRowLocator(discussionProposal.id);
    await expect(feedbackRow).toBeVisible();

    const feedbackRowStatusBadge = feedbackRow.locator('data-test=proposal-status-badge');
    await expect((await feedbackRowStatusBadge.allInnerTexts())[0]).toEqual('Feedback');
  });
  test('Proposal can be edited by the author and made public', async ({
    page,
    proposalListPage,
    documentPage,
    pagePermissions
  }) => {
    // Initial setup
    await loginBrowserUser({
      browserPage: page,
      userId: proposalAuthor.id
    });

    // Finish setup start interacting with the app
    await proposalListPage.goToHomePage();

    await proposalListPage.getSidebarLink('proposals').click();

    await proposalListPage.waitForProposalsList();

    // Select the row and open the page
    // Needed to reveal the button
    await proposalListPage.getProposalRowLocator(discussionProposal.id).hover();

    await proposalListPage.getProposalRowOpenLocator(discussionProposal.id).click();

    // Check we can see the contents
    await proposalListPage.waitForDocumentPage({
      domain: space.domain,
      path: discussionProposal.page.path
    });

    await expect(documentPage.charmEditor).toBeVisible();

    await page.waitForTimeout(3000);

    const isEditable = await documentPage.isPageEditable();

    await expect(isEditable).toBe(true);

    // Start sharing flow
    await pagePermissions.permissionDialog.click();

    await pagePermissions.publishTab.click();

    await expect(pagePermissions.publicShareToggle).toBeVisible();

    await pagePermissions.togglePageIsPublic();
    await expect(pagePermissions.pageShareLink).toBeVisible();

    const shareLink = await pagePermissions.getPageShareLinkValue();

    expect(shareLink).not.toBe(null);

    publicLink = shareLink as string;
  });

  test('Public proposal can be seen by people outside the space', async ({ page, proposalListPage, documentPage }) => {
    await logoutBrowserUser({
      browserPage: page
    });

    await page.goto(publicLink);

    // Check we can see the contents
    await proposalListPage.waitForDocumentPage({
      domain: space.domain,
      path: discussionProposal.page.path
    });

    await expect(documentPage.documentTitle).toBeVisible();

    const title = await documentPage.documentTitle.allInnerTexts();

    expect(title[0].trim()).toBe(discussionProposal.page.title);

    await expect(documentPage.charmEditor).toBeVisible();

    await page.waitForTimeout(3000);

    const isEditable = await documentPage.isPageEditable();

    await expect(isEditable).toBe(false);
  });
});
