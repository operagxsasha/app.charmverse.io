import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { KeyedMutator } from 'swr';

import charmClient from 'charmClient';
import { useGetRewards } from 'charmClient/hooks/rewards';
import type { RewardStatusFilter } from 'components/rewards/components/RewardViewOptions';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { usePages } from 'hooks/usePages';
import type { RewardWithUsers } from 'lib/rewards/interfaces';
import type { RewardUpdate } from 'lib/rewards/updateRewardSettings';

type RewardsContextType = {
  rewards: RewardWithUsers[] | undefined;
  filteredRewards: RewardWithUsers[] | undefined;
  statusFilter: RewardStatusFilter;
  setStatusFilter: (status: RewardStatusFilter) => void;
  mutateRewards: KeyedMutator<RewardWithUsers[]>;
  isLoading: boolean;
  updateReward: (input: RewardUpdate) => Promise<void>;
  refreshReward: (rewardId: string) => Promise<void>;
};

export const RewardsContext = createContext<Readonly<RewardsContextType>>({
  rewards: undefined,
  filteredRewards: undefined,
  statusFilter: 'all',
  setStatusFilter: () => {},
  mutateRewards: async () => {
    return undefined;
  },
  isLoading: false,
  updateReward: () => Promise.resolve(),
  refreshReward: () => Promise.resolve()
});

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [statusFilter, setStatusFilter] = useState<RewardStatusFilter>('all');
  const { pages, loadingPages } = usePages();
  const { space } = useCurrentSpace();

  const { data: rewards, mutate: mutateRewards, isLoading } = useGetRewards({ spaceId: space?.id });

  // filter out deleted and templates
  let filteredRewards = useMemo(
    () =>
      rewards ? rewards.filter((reward) => !pages[reward.id]?.deletedAt && pages[reward.id]?.type === 'bounty') : [],
    [pages, rewards]
  );

  if (statusFilter && statusFilter !== 'all') {
    filteredRewards = filteredRewards?.filter((reward) => reward.status === statusFilter);
  }

  filteredRewards = filteredRewards?.sort((p1, p2) => {
    const page1 = pages[p1.id];
    const page2 = pages[p2.id];
    if (!page1 || !page2) return 0;
    return page1.createdAt > page2.createdAt ? -1 : 1;
  });

  const updateReward = useCallback(
    async (rewardUpdate: RewardUpdate) => {
      if (rewardUpdate) {
        await charmClient.rewards.updateReward(rewardUpdate);

        mutateRewards();
      }
    },
    [mutateRewards]
  );

  const refreshReward = useCallback(
    async (rewardId: string) => {
      const reward = await charmClient.rewards.getReward(rewardId);
      mutateRewards((data) => {
        const rewardList = data ?? [];
        const rewardIndex = rewardList.findIndex((p) => p.id === rewardId);

        if (rewardIndex >= 0) {
          const existingReward = rewardList[rewardIndex];
          rewardList[rewardIndex] = {
            ...existingReward,
            ...reward
          };
        } else {
          rewardList.push(reward);
        }
        return rewardList;
      });
    },
    [mutateRewards]
  );

  const value = useMemo(
    () => ({
      rewards,
      filteredRewards,
      statusFilter,
      setStatusFilter,
      mutateRewards,
      isLoading: isLoading || loadingPages,
      updateReward,
      refreshReward,
      setRewards: mutateRewards
    }),
    [filteredRewards, isLoading, loadingPages, mutateRewards, rewards, statusFilter, updateReward, refreshReward]
  );

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export const useRewards = () => useContext(RewardsContext);
