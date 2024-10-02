import { DateTime } from 'luxon';

type ISOWeek = string; // isoweek, e.g. '2024-W01'
type SeasonWeek = number; // the week in the season, e.g. 1

// Season start MUST be on a Monday, when isoweek begins
// const currentSeasonStartDate = DateTime.fromObject({ year: 2024, month: 9, day: 16 }, { zone: 'utc' }); // Dev Season: 2024-W38
// export const currentSeasonEndDate = currentSeasonStartDate.plus({ weeks: 2 });
const currentSeasonStartDate = DateTime.fromObject({ year: 2024, month: 9, day: 30 }, { zone: 'utc' }); // Actual launch: 2024-W40
export const currentSeasonEndDate = currentSeasonStartDate.plus({ weeks: 13 });
export const currentSeason: ISOWeek = getWeekFromDate(currentSeasonStartDate.toJSDate());
export const currentSeasonNumber = 1;

export const streakWindow = 7 * 24 * 60 * 60 * 1000;

export const seasonAllocatedPoints = 18_141_850;
export const weeklyAllocatedPoints = seasonAllocatedPoints / 13;

// Return the format of week
export function getCurrentWeek(): ISOWeek {
  return _formatWeek(DateTime.utc());
}

export function getLastWeek(): ISOWeek {
  return getPreviousWeek(getCurrentWeek());
}

export function getPreviousWeek(week: ISOWeek): ISOWeek {
  return _formatWeek(getDateFromISOWeek(week).minus({ week: 1 }));
}

export function getWeekFromDate(date: Date): ISOWeek {
  return _formatWeek(DateTime.fromJSDate(date, { zone: 'utc' }));
}

export function getDateFromISOWeek(week: ISOWeek): DateTime {
  return DateTime.fromISO(week, { zone: 'utc' });
}

export function getWeekStartEnd(date: Date) {
  const utcDate = DateTime.fromJSDate(date, { zone: 'utc' });
  const startOfWeek = utcDate.startOf('week');
  const endOfWeek = utcDate.endOf('week');
  return { start: startOfWeek, end: endOfWeek };
}

function _formatWeek(date: DateTime): ISOWeek {
  // token reference: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
  return date.toFormat(`kkkk-'W'WW`);
}

export function isToday(date: Date, now = DateTime.utc()) {
  const dateDay = DateTime.fromJSDate(date, { zone: 'utc' }).startOf('day');
  return dateDay.equals(now.startOf('day'));
}

export function getCurrentSeasonWeekNumber(): SeasonWeek {
  return getSeasonWeekFromISOWeek({ season: currentSeason, week: getCurrentWeek() });
}

export function getSeasonWeekFromISOWeek({ season, week }: { season: ISOWeek; week: ISOWeek }): SeasonWeek {
  const weekDate = DateTime.fromISO(week, { zone: 'utc' });
  const seasonDate = DateTime.fromISO(season, { zone: 'utc' });
  const weeksDiff = weekDate.diff(seasonDate, 'weeks').weeks;
  return weeksDiff + 1;
}
