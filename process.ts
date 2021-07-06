import {
  getAsync,
  getLatestOffset,
  storeOffset,
  syncDB,
  transactionsFilter,
  Transfers,
} from "./helpers";
import { logger } from "./logger";
import _ from "lodash";
import { tokens } from "./constants";

export const syncTransactionsProcesser = async (tokenId: number) => {
  try {
    const latestOffset = await getLatestOffset(String(tokenId));

    if (tokenId === undefined || latestOffset === undefined) {
      logger.error(`TokenId or Offset should not be undefined`);
      throw new Error("TokenId or Offset should not be undefined");
    }

    const transactions = await Transfers(tokenId, Number(latestOffset));
    const txsFilter = transactionsFilter(transactions?.transfers);
    const totalRounds = Number(transactions?.total);
    console.log("latestOffset", latestOffset);
    console.log("totalRounds", totalRounds);
    if (_.isEmpty(txsFilter) || Number(latestOffset) >= totalRounds) {
      logger.info("No Incoming Transactions Found");
      return null;
    }

    const sync = txsFilter?.map((items) => {
      return {
        to_address: items.to,
        from_address: items.from,
        quantity: String(_.divide(Number(items.amount), 10 ** 6)),
        asset:
          String(items.contract).toLowerCase() === tokens[0].toLowerCase()
            ? "GOLD"
            : "SILVER",
        fee: "0",
        tx: items.hash,
      };
    });

    // sync all data in DB
    await syncDB(sync);

    // increase the offset by 10
    const newOffset = _.add(Number(latestOffset), 10);

    // store the new offset value
    const isStore = await storeOffset(String(tokenId), String(newOffset));
    if (isStore) {
      logger.info(`synced at ${new Date().getTime() / 1000} time.`);
    } else {
      logger.error(`may be something wrong went with redis`);
    }
  } catch (err) {
    logger.error(
      `Processer Error: token id ${tokenId} sync failed. reason ${err.message}`
    );
  }
};
