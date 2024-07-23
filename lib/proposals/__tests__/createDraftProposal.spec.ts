import type { ProposalWorkflow, Space, User } from '@charmverse/core/prisma';
import { prisma } from '@charmverse/core/prisma-client';
import type { WorkflowEvaluationJson } from '@charmverse/core/proposals';
import { testUtilsProposals, testUtilsPages } from '@charmverse/core/test';
import type { FormFieldInput } from '@root/lib/forms/interfaces';
import { v4 as uuid, v4 } from 'uuid';

import { generateSpaceUser, generateUserAndSpace } from 'testing/setupDatabase';
import { generateForumPost } from 'testing/utils/forums';
import { generateProposalWorkflow } from 'testing/utils/proposals';

import { createDraftProposal } from '../createDraftProposal';
import { createProposal } from '../createProposal';
import type { ProposalWithUsersAndRubric } from '../interfaces';

describe('createDraftProposal', () => {
  it('Create proposal template with existing form', async () => {
    const { user, space } = await generateUserAndSpace();
    const workflow = await generateProposalWorkflow({ spaceId: space.id });

    const formFields: FormFieldInput[] = [
      {
        id: uuid(),
        type: 'short_text',
        name: 'name',
        description: 'description',
        index: 0,
        options: [],
        private: false,
        required: true,
        fieldConfig: {}
      },
      {
        id: uuid(),
        type: 'long_text',
        name: 'long name',
        description: 'another description',
        index: 1,
        options: [],
        private: true,
        required: true,
        fieldConfig: {}
      }
    ];

    const proposalTemplate = await testUtilsProposals.generateProposal({
      spaceId: space.id,
      userId: user.id,
      workflowId: workflow.id
    });

    const proposalTemplateForm = await prisma.form.create({
      data: {
        proposal: {
          connect: {
            id: proposalTemplate.id
          }
        }
      }
    });

    await prisma.formField.createMany({
      data: formFields.map((item) => ({
        ...item,
        description: item.description ?? '',
        formId: proposalTemplateForm.id,
        fieldConfig: {}
      }))
    });

    const { page, proposal } = await createDraftProposal({
      createdBy: user.id,
      pageType: 'proposal_template',
      spaceId: space.id,
      templateId: proposalTemplate.id
    });

    expect(proposal.formId).toBeDefined();

    const newProposalTemplateForm = await prisma.form.findUniqueOrThrow({
      where: {
        id: proposal.formId as string
      },
      select: {
        id: true
      }
    });

    // New form should be created since we are duplicating a proposal template
    expect(newProposalTemplateForm.id).not.toEqual(proposalTemplateForm.id);

    expect(page).toMatchObject(
      expect.objectContaining({
        type: 'proposal_template'
      })
    );
  });
});
