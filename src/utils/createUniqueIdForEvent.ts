import crypto from 'node:crypto';
import { EventLog } from '../types.js';
import { serialize } from './serializer.js';

/**
 * Creates unique id for event. This is used to prevent duplicate events from being saved.
 * Block number is removed from the hash as a transaction can be indexed for a block that
 * will eventually be reorged on the chain. This means that the same event can be indexed twice.
 * In order to prevent this, the block number property is removed from the hash as only
 * the transaction content is important. This allows us to override the previous value of the event
 * in the database when duplicate hash arrives.
 *
 * This should not really happen if you set BLOCK_CONFIRMATIONS to a bigger number that guarantees
 * block finality. For example: the polygon mainnet reaches finality in 256 blocks which is
 * approximately 9 minutes. This might be too much time for your use case so you can set it to
 * a lower value thanks to this feature.
 *
 * @param event log to create unique id for
 * @returns unique id for event SHA256 hash of event without blockNumber
 */
export const createUniqueIdForEvent = (event: EventLog) =>
  crypto
    .createHash('sha256')
    .update(serialize({ ...event, blockNumber: undefined }))
    .digest('hex');
