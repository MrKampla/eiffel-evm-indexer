import { EventLogFromDb } from '../types.js';

export const parseEventArgs = (event: EventLogFromDb) => {
  if (!event.args) {
    return event;
  }
  return {
    ...event,
    args: JSON.parse(event.args),
  };
};
