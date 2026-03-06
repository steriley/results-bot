import { differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';

/**
 * Returns a human-readable string representing the time remaining until the given target date.
 * If the target date is in the past, returns 'Deadline passed'.
 * Otherwise, returns a string in the format of 'X days/hours/minutes left'.
 * If the remaining time is less than 1 minute, returns 'Closing now...'.
 * @param {Date} targetDate - The date to calculate the time remaining until.
 * @returns {string} - A human-readable string representing the time remaining until the target date.
 */
export function getTimeRemaining(targetDate: Date): string {
  if (isPast(targetDate)) return 'Deadline passed';

  const now = new Date();

  const days = differenceInDays(targetDate, now);
  const hours = differenceInHours(targetDate, now);
  const minutes = differenceInMinutes(targetDate, now);

  if (days >= 1) {
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  }

  if (hours >= 1) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
  }

  if (minutes >= 1) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
  }

  return 'Closing now...';
}
