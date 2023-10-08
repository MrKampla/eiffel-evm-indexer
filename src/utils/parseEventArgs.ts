import { EventLogFromDb } from '../types';

export const parseEventArgs = (event: EventLogFromDb) => ({
  ...event,
  args: JSON.parse(event.args),
});
