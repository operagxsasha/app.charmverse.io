import { log } from '@charmverse/core/log';
import { useCallback, useEffect, useState } from 'react';

import { useCreateProposal } from 'charmClient/hooks/proposals';
import { checkFormFieldErrors } from 'components/common/form/checkFormFieldErrors';
import type { ProposalEvaluationValues } from 'components/proposals/ProposalPage/components/EvaluationSettingsSidebar/components/EvaluationStepSettings';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { useSnackbar } from 'hooks/useSnackbar';
import { useUser } from 'hooks/useUser';
import { checkIsContentEmpty } from 'lib/prosemirror/checkIsContentEmpty';
import { isTruthy } from 'lib/utilities/types';

import type { ProposalPageAndPropertiesInput } from '../NewProposalPage';

export type NewProposalInput = Partial<ProposalPageAndPropertiesInput> | null;

type Props = {
  newProposal: NewProposalInput;
};

export function useNewProposal({ newProposal }: Props) {
  const { user } = useUser();
  const { showMessage } = useSnackbar();
  const { space: currentSpace } = useCurrentSpace();
  const { trigger: createProposalTrigger, isMutating: isCreatingProposal } = useCreateProposal();

  const [contentUpdated, setContentUpdated] = useState(false);
  const [formInputs, setFormInputsRaw] = useState<ProposalPageAndPropertiesInput>(
    emptyState({ ...newProposal, userId: user?.id })
  );

  const setFormInputs = useCallback(
    (partialFormInputs: Partial<ProposalPageAndPropertiesInput>) => {
      setContentUpdated(true);
      setFormInputsRaw((existingFormInputs) => ({ ...existingFormInputs, ...partialFormInputs }));
    },
    [setFormInputsRaw]
  );

  useEffect(() => {
    setFormInputs({
      publishToLens: !!user?.publishToLensDefault
    });
  }, [setFormInputs, user?.publishToLensDefault]);

  async function createProposal({ isDraft }: { isDraft?: boolean }) {
    log.info('[user-journey] Create a proposal');
    if (currentSpace) {
      const result = await createProposalTrigger({
        proposalTemplateId: formInputs.proposalTemplateId,
        authors: formInputs.authors,
        pageProps: {
          content: formInputs.content,
          contentText: formInputs.contentText ?? '',
          title: formInputs.title,
          sourceTemplateId: formInputs.proposalTemplateId,
          headerImage: formInputs.headerImage,
          icon: formInputs.icon,
          type: formInputs.type
        },
        formFields: formInputs.formFields,
        evaluations: formInputs.evaluations,
        evaluationType: formInputs.evaluationType,
        reviewers: formInputs.reviewers,
        spaceId: currentSpace.id,
        publishToLens: formInputs.publishToLens,
        fields: formInputs.fields,
        formId: formInputs.formId,
        formAnswers: formInputs.formAnswers,
        workflowId: formInputs.workflowId || undefined,
        isDraft
      }).catch((err: any) => {
        showMessage(err.message ?? 'Something went wrong', 'error');
        throw err;
      });
      setContentUpdated(false);
      return result;
    }
  }

  let disabledTooltip: string | undefined;
  if (!formInputs.title) {
    disabledTooltip = 'Title is required';
  }

  if (formInputs.type === 'proposal' && currentSpace?.requireProposalTemplate && !formInputs.proposalTemplateId) {
    disabledTooltip = 'Template is required';
  }

  if (formInputs.proposalType === 'structured') {
    disabledTooltip = checkFormFieldErrors(formInputs.formFields ?? []);
  } else if (
    formInputs.proposalType === 'free_form' &&
    formInputs.type === 'proposal_template' &&
    checkIsContentEmpty(formInputs.content)
  ) {
    disabledTooltip = 'Content is required for free-form proposals';
  }

  // get the first validation error from the evaluations
  disabledTooltip = disabledTooltip || formInputs.evaluations.map(getEvaluationFormError).filter(isTruthy)[0];

  return {
    formInputs,
    setFormInputs,
    createProposal,
    disabledTooltip,
    isCreatingProposal,
    contentUpdated
  };
}

export function getEvaluationFormError(evaluation: ProposalEvaluationValues): string | false {
  switch (evaluation.type) {
    case 'feedback':
      return false;
    case 'rubric':
      return evaluation.reviewers.length === 0
        ? `Reviewers are required for the "${evaluation.title}" step`
        : evaluation.rubricCriteria.length === 0
        ? `At least one rubric criteria is required for the "${evaluation.title}" step`
        : false;
    case 'pass_fail':
      return evaluation.reviewers.length === 0 ? `Reviewers are required for the "${evaluation.title}" step` : false;
    case 'vote':
      return evaluation.reviewers.length === 0
        ? `Voters are required for the "${evaluation.title}" step`
        : !evaluation.voteSettings
        ? `Vote details are required for the "${evaluation.title}" step`
        : false;
    default:
      return false;
  }
}

function emptyState({
  userId,
  ...inputs
}: Partial<ProposalPageAndPropertiesInput> & { userId?: string } = {}): ProposalPageAndPropertiesInput {
  return {
    proposalType: 'free_form',
    content: null,
    contentText: '',
    headerImage: null,
    icon: null,
    evaluationType: 'vote',
    proposalTemplateId: null,
    reviewers: [],
    evaluations: [],
    title: '',
    type: 'proposal',
    publishToLens: false,
    fields: { properties: {} },
    ...inputs,
    authors: userId ? [userId] : []
  };
}
