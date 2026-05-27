/**
 * Generates the local date string in YYYY-MM-DD format,
 * ignoring JS automatic UTC timezone conversion.
 * 
 * @param dateInput - Optional Date object to format. Defaults to current date/time.
 */
export const getLocalDateString = (dateInput?: Date): string => {
  const date = dateInput instanceof Date ? dateInput : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0]; // Always returns 'YYYY-MM-DD'
};
