import { PersistenceObject } from '../..';
import { filterEventsWithURLParams } from '../filterEventsWithURLParams';

export default async (request: Request, db: PersistenceObject) => {
  return filterEventsWithURLParams('events', request, db);
};
