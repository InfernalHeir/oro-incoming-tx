import { CronJob } from "cron";
import { logger } from "./logger";
import { syncTransactionsProcesser } from "./process";

export const goldTransfersSync = new CronJob(
  "* * * * *",
  async () => {
    try {
      const tokenId = 0;
      await syncTransactionsProcesser(tokenId);
      logger.info(`XTZ_GOLD JOB completed`);
    } catch (err) {
      logger.error(`XTZ_GOLD sync failed - ${err.message}`);
    }
  },
  null,
  true,
  "Asia/Kolkata"
);

export const sliverTransfersSync = new CronJob(
  "*/5 * * * *",
  async () => {
    try {
      const tokenId = 1;
      await syncTransactionsProcesser(tokenId);
      logger.info(`XTZ_SILVER JOB completed`);
    } catch (err) {
      logger.error(`XTZ_SILVER sync failed - ${err.message}`);
    }
  },
  null,
  true,
  "Asia/Kolkata"
);
