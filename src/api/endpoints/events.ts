import { PersistenceObject } from '../../index.js';
import { filterEventsWithURLParams } from '../filterEventsWithURLParams.js';

export default async (request: Request, db: PersistenceObject) => {
  return filterEventsWithURLParams('events', request, db);
};
