// playwright-dev-page.ts
import type { Locator, Page } from '@playwright/test';
import type { Space } from '@prisma/client';

import type { SpaceCreateTemplate } from 'lib/spaces/config';

// capture actions on the pages in signup flow
export class SignUpPage {
  readonly page: Page;

  readonly workspaceFormSubmit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.workspaceFormSubmit = page.locator('data-test=create-workspace');
  }

  async waitForCreateSpacePage() {
    await this.page.waitForURL('**/createSpace');
  }

  async selectNewSpaceFormTemplate(spaceTemplateOption: SpaceCreateTemplate) {
    await this.page.click(`data-test=space-template-${spaceTemplateOption}`);
  }

  async waitForWorkspaceLoaded({ domain }: { domain: string }) {
    await this.page.waitForURL(`**/${domain}`);
    await this.page.locator('text=[Your DAO] Home').first().waitFor();
  }

  async submitWorkspaceForm(): Promise<Space> {
    this.workspaceFormSubmit.click();

    const response = await this.page.waitForResponse('**/api/spaces');

    const parsedResponse = await response.json();

    if (response.status() >= 400) {
      throw parsedResponse;
    }

    return parsedResponse as Space;
  }
}
