import type { ApplicationStatus } from '@charmverse/core/prisma-client';
import { KeyboardArrowDown } from '@mui/icons-material';
import { Collapse, Divider, FormLabel, IconButton, Stack } from '@mui/material';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { useState } from 'react';

import charmClient from 'charmClient';
import { useGetReward } from 'charmClient/hooks/rewards';
import { PageTitleInput } from 'components/[pageId]/DocumentPage/components/PageTitleInput';
import { CharmEditor } from 'components/common/CharmEditor';
import { ScrollableWindow } from 'components/common/PageLayout';
import UserDisplay from 'components/common/UserDisplay';
import { RewardProperties } from 'components/rewards/components/RewardProperties/RewardProperties';
import { useApplication } from 'components/rewards/hooks/useApplication';
import { useMembers } from 'hooks/useMembers';
import { usePage } from 'hooks/usePage';
import { useSnackbar } from 'hooks/useSnackbar';
import { useUser } from 'hooks/useUser';
import type { PageContent } from 'lib/prosemirror/interfaces';

import { RewardPaymentButton } from '../RewardProperties/components/RewardApplicantsTable/RewardPaymentButton';

import { ApplicationComments } from './ApplicationComments';
import ApplicationInput from './RewardApplicationInput';
import RewardReview from './RewardReview';
import SubmissionInput from './RewardSubmissionInput';

type Props = {
  applicationId: string;
};

export function RewardApplicationPageComponent({ applicationId }: Props) {
  const { application, refreshApplication, applicationRewardPermissions, updateApplication, reviewApplication } =
    useApplication({
      applicationId
    });
  const { data: reward } = useGetReward({ rewardId: application?.bountyId });

  const { page: rewardPageContent } = usePage({ pageIdOrPath: reward?.id });

  const { members } = useMembers();
  const { user } = useUser();
  const { showMessage } = useSnackbar();

  const [showProperties, setShowProperties] = useState(false);

  async function recordTransaction(transactionId: string, chainId: number) {
    try {
      await charmClient.rewards.recordTransaction({
        applicationId,
        chainId: chainId.toString(),
        transactionId
      });
      await charmClient.rewards.markSubmissionAsPaid(applicationId);
      refreshApplication();
    } catch (err: any) {
      showMessage(err.message || err, 'error');
    }
  }

  if (!application || !reward) {
    return null;
  }

  const submitter = members.find((m) => m.id === application.createdBy);

  const readonlySubmission =
    user?.id !== application.createdBy ||
    (['complete', 'paid', 'processing', 'rejected'] as ApplicationStatus[]).includes(application.status);

  return (
    <ScrollableWindow>
      {/** TODO - Use more elegant layout */}
      <Grid container px='10%' gap={2}>
        <Grid item xs={12} display='flex' justifyContent='space-between'>
          <PageTitleInput value={reward.page.title} readOnly onChange={() => null} />
        </Grid>

        <Grid item xs={12} className='focalboard-body' flexDirection='column'>
          <Stack
            direction='row'
            gap={1}
            alignItems='center'
            sx={{ cursor: 'pointer' }}
            onClick={() => setShowProperties((v) => !v)}
          >
            <FormLabel sx={{ fontWeight: 'bold', cursor: 'pointer' }}>Reward Details</FormLabel>
            <IconButton size='small'>
              <KeyboardArrowDown
                fontSize='small'
                sx={{ transform: `rotate(${showProperties ? 180 : 0}deg)`, transition: 'all 0.2s ease' }}
              />
            </IconButton>
          </Stack>
          <Collapse in={showProperties} timeout='auto' unmountOnExit>
            <Stack>
              <RewardProperties
                rewardId={reward.id}
                pageId={reward.page.id}
                pagePath={reward.page.path}
                readOnly={true}
              />
              {rewardPageContent && (
                <>
                  <CharmEditor
                    pageId={rewardPageContent.id}
                    readOnly
                    content={rewardPageContent.content as PageContent}
                  />
                  <Divider sx={{ mt: 2 }} />
                </>
              )}
            </Stack>
          </Collapse>
        </Grid>

        <Grid item xs={12} gap={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box display='flex' gap={2}>
            <FormLabel sx={{ fontWeight: 'bold', cursor: 'pointer' }}>Applicant</FormLabel>
            <UserDisplay user={submitter} avatarSize='small' showMiniProfile />
          </Box>

          {/** This section contaisn all possible reviewer actions */}
          {application.status === 'applied' && (
            <RewardReview
              onConfirmReview={(decision) => reviewApplication({ decision })}
              reviewType='application'
              readOnly={!applicationRewardPermissions?.approve_applications}
            />
          )}
          {(application.status === 'review' || application.status === 'inProgress') && (
            <RewardReview
              onConfirmReview={(decision) => reviewApplication({ decision })}
              reviewType='submission'
              readOnly={!applicationRewardPermissions?.review}
            />
          )}
          {application.status === 'complete' && reward.rewardAmount && (
            <RewardPaymentButton
              amount={String(reward.rewardAmount)}
              chainIdToUse={reward.chainId as number}
              receiver={application.walletAddress as string}
              reward={reward}
              tokenSymbolOrAddress={reward.rewardToken as string}
              onSuccess={recordTransaction}
              onError={(message) => showMessage(message, 'warning')}
            />
          )}
        </Grid>

        {reward.approveSubmitters && application.status === 'applied' && (
          <Grid item xs={12}>
            <ApplicationInput
              application={application}
              rewardId={reward.id}
              expandedOnLoad
              readOnly={application.createdBy !== user?.id}
              onSubmit={(updatedApplication) =>
                updateApplication({
                  applicationId: application.id,
                  message: updatedApplication,
                  rewardId: reward.id
                })
              }
            />
          </Grid>
        )}

        {application.status !== 'applied' && (
          <Grid item xs={12}>
            <SubmissionInput
              submission={application}
              readOnly={readonlySubmission}
              expandedOnLoad
              refreshSubmission={refreshApplication}
              onSubmit={(submission) =>
                updateApplication({
                  rewardId: reward.id,
                  submissionNodes: submission.submissionNodes,
                  applicationId: application.id
                })
              }
              bountyId={application.bountyId}
              permissions={applicationRewardPermissions}
              hasCustomReward={!!reward.customReward}
            />
          </Grid>
        )}
        <Grid item xs={12}>
          <ApplicationComments applicationId={application.id} status={application.status} />
        </Grid>
      </Grid>
    </ScrollableWindow>
  );
}
