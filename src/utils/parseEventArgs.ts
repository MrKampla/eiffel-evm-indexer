import { EventLogFromDb } from '../types';

export const parseEventArgs = (event: EventLogFromDb) => {
  if (!event.args) {
    return event;
  }
  return {
    ...event,
    args: JSON.parse(event.args),
  };
};
