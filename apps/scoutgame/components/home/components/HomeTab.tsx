import 'server-only';

import { getAllEvents } from 'lib/builders/getAllEvents';
import { getLeaderboard } from 'lib/builders/getLeaderboard';
import { getSortedBuilders } from 'lib/builders/getSortedBuilders';
import { getTopScouts } from 'lib/scouts/getTopScouts';

import { ActivityTable } from './ActivityTable';
import { LeaderboardTable } from './LeaderboardTable';
import { TopBuildersTable } from './TopBuildersTable';
import { TopScoutsTable } from './TopScoutsTable';

export async function HomeTab({ tab }: { tab: string }) {
  if (tab === 'activity') {
    const events = await getAllEvents();
    return <ActivityTable rows={events} />;
  }

  if (tab === 'top-scouts') {
    const topScouts = await getTopScouts({ limit: 10 });
    return <TopScoutsTable rows={topScouts} />;
  }

  if (tab === 'top-builders') {
    const topBuilders = await getSortedBuilders({ limit: 10, sort: 'top' });
    return <TopBuildersTable rows={topBuilders} />;
  }

  if (tab === 'leaderboard') {
    const data = await getLeaderboard();

    return <LeaderboardTable data={data} />;
  }
  return null;
}
