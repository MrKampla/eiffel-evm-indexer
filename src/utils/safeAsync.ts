import { setTimeout } from 'node:timers/promises';
import { logger } from './logger.js';

export const safeAsync = async <T>(fn: () => Promise<T>): Promise<T> => {
  while (true) {
    try {
      return await fn();
    } catch (e) {
      logger.error(e);
      await setTimeout(250);
    }
  }
};
