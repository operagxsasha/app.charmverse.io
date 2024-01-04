import { Box } from '@mui/material';

import { Button } from 'components/common/Button';
import Modal from 'components/common/Modal';
import { useProposalTemplateById } from 'components/proposals/hooks/useProposalTemplates';

import { getEvaluationFormError } from '../../../hooks/useNewProposal';
import type { ProposalEvaluationValues } from '../../EvaluationSettingsSidebar/components/EvaluationStepSettings';
import { EvaluationStepSettings } from '../../EvaluationSettingsSidebar/components/EvaluationStepSettings';

export function EvaluationStepSettingsModal({
  close,
  evaluationInput,
  templateId,
  saveEvaluation,
  updateEvaluation
}: {
  close: VoidFunction;
  evaluationInput: ProposalEvaluationValues;
  templateId?: string | null;
  saveEvaluation: (evaluation: ProposalEvaluationValues) => void;
  updateEvaluation: (evaluation: Partial<ProposalEvaluationValues>) => void;
}) {
  const proposalTemplate = useProposalTemplateById(templateId);
  const evaluationInputError = evaluationInput && getEvaluationFormError(evaluationInput);
  // find matching template step, and allow editing if there were no reviewers set
  const matchingTemplateStep = proposalTemplate?.evaluations?.find((e) => e.title === evaluationInput.title);
  const templateHasNoReviewers = matchingTemplateStep?.reviewers?.length === 0;
  // reviewers are already readOnly if a template was used, so long as reviewers were set
  const readOnlyReviewers = !!templateId && !templateHasNoReviewers;
  // rubric criteria should be editable but authors and reviewers, unless a template was used
  const readOnlyRubricCriteria = !!templateId;
  return (
    <Modal open onClose={close} title={`Edit ${evaluationInput?.title}`}>
      <Box mb={1}>
        <EvaluationStepSettings
          readOnly={false}
          readOnlyReviewers={readOnlyReviewers}
          readOnlyRubricCriteria={readOnlyRubricCriteria}
          evaluation={evaluationInput}
          onChange={updateEvaluation}
        />
      </Box>
      <Box display='flex' justifyContent='flex-end' gap={1}>
        <Button color='secondary' variant='outlined' onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={evaluationInputError}
          disabledTooltip={evaluationInputError}
          onClick={() => saveEvaluation(evaluationInput)}
        >
          Save
        </Button>
      </Box>
    </Modal>
  );
}
