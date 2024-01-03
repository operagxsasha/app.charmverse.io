import type { ProposalPermissionFlags } from '@charmverse/core/permissions';
import type { ProposalReviewer } from '@charmverse/core/prisma';
import type { FormField, Proposal, ProposalEvaluation } from '@charmverse/core/prisma-client';
import { getCurrentEvaluation } from '@charmverse/core/proposals';
import type { ProposalWithUsers } from '@charmverse/core/proposals';

import { getProposalFormFields } from 'lib/proposal/form/getProposalFormFields';

import { getOldProposalStatus } from './getOldProposalStatus';
import type { ProposalFields, ProposalWithUsersAndRubric, ProposalWithUsersLite } from './interface';

type FormFieldsIncludeType = {
  form: {
    id: string;
    formFields: FormField[] | null;
  } | null;
};

export function mapDbProposalToProposal({
  proposal,
  permissions,
  canAccessPrivateFormFields
}: {
  proposal: Proposal &
    FormFieldsIncludeType & {
      evaluations: (ProposalEvaluation & {
        reviewers: ProposalReviewer[];
        rubricAnswers: any[];
        draftRubricAnswers: any[];
      })[];
      rewards: { id: string }[];
      reviewers: ProposalReviewer[];
      rubricAnswers: any[];
      draftRubricAnswers: any[];
    };
  permissions?: ProposalPermissionFlags;
  canAccessPrivateFormFields?: boolean;
}): ProposalWithUsersAndRubric {
  const { rewards, form, ...rest } = proposal;
  const currentEvaluation = getCurrentEvaluation(proposal.evaluations);
  const formFields = getProposalFormFields(form?.formFields, !!canAccessPrivateFormFields);

  const proposalWithUsers = {
    ...rest,
    permissions,
    currentEvaluationId: proposal.status !== 'draft' && proposal.evaluations.length ? currentEvaluation?.id : undefined,
    evaluationType: currentEvaluation?.type || proposal.evaluationType,
    status: getOldProposalStatus(proposal),
    // Support old model: filter out evaluation-specific reviewers and rubric answers
    rubricAnswers: currentEvaluation?.rubricAnswers || proposal.rubricAnswers,
    draftRubricAnswers: currentEvaluation?.draftRubricAnswers || proposal.draftRubricAnswers,
    rewardIds: rewards.map((r) => r.id) || null,
    form: form
      ? {
          formFields: formFields || null,
          id: form?.id || null
        }
      : null
  };

  return proposalWithUsers as ProposalWithUsersAndRubric;
}

// used for mapping data for proposal blocks/tables which dont need all the evaluation data
export function mapDbProposalToProposalLite({
  proposal,
  permissions
}: {
  proposal: ProposalWithUsers & {
    evaluations: (ProposalEvaluation & { reviewers: ProposalReviewer[] })[];
    rewards: { id: string }[];
  };
  permissions?: ProposalPermissionFlags;
}): ProposalWithUsersLite {
  const { rewards, ...rest } = proposal;
  const currentEvaluation = proposal.status !== 'draft' ? getCurrentEvaluation(proposal.evaluations) : undefined;
  const evaluationWithOldType = proposal.evaluations.find((e) => e.type === 'rubric' || e.type === 'vote');
  const proposalWithUsers = {
    ...rest,
    permissions,
    currentEvaluation: currentEvaluation
      ? {
          id: currentEvaluation.id,
          result: currentEvaluation.result,
          title: currentEvaluation.title,
          type: currentEvaluation.type,
          reviewers: currentEvaluation.reviewers
        }
      : undefined,
    // currentEvaluationId: currentEvaluation?.id,
    evaluationType: evaluationWithOldType?.type || proposal.evaluationType,
    status: getOldProposalStatus(proposal),
    rewardIds: rewards.map((r) => r.id) || null,
    fields: (rest.fields as ProposalFields) ?? null
  };

  return proposalWithUsers;
}
