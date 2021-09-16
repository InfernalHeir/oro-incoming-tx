import {
  getFetchingPoints,
  getVaryingOffset,
  outputedTransactions,
  setVaryingOffset,
  storeFetchingPoints,
  storeLastId,
  syncDB,
  Transfers,
} from "./helpers";
import { logger } from "./logger";
import _ from "lodash";
import { tokens } from "./constants";
import emoji from "node-emoji";

export const syncTransactionsProcesser = async (tokenId: number) => {
  try {
    var recordCount = await getFetchingPoints(String(tokenId));

    const varyingOffset = await getVaryingOffset(String(tokenId));

    // console.log(last_id_intervals);
    if (tokenId === undefined || recordCount === undefined) {
      logger.error(`MailFormed Params Sync Failed..`);
      throw new Error("MailFormed Params Sync Failed..");
    }

    // calculate offset for every call
    var offset = varyingOffset.currentOffset;

    logger.info(`Searching New Transaction on Given Offset`);

    const transactions = await Transfers(tokenId, offset);

    const transfers = outputedTransactions(transactions.transfers);

    const total_row = Number(transactions.total);

    // here we decide new offset
    if (Number(recordCount) === Number(total_row)) {
      // store the current offset to 0.
      await setVaryingOffset(String(tokenId), {
        from: 0,
        to: 0,
        currentOffset: 0,
      });

      logger.info("Sync Failed: No Incoming Transactions Found");

      return;
    }

    const sync = transfers?.map((items) => {
      return {
        to_address: items.to,
        from_address: items.from,
        quantity: String(_.divide(Number(items.amount), 10 ** 6)),
        asset:
          String(items.token.contract).toLowerCase() === tokens[0].toLowerCase()
            ? "GOLD"
            : "SILVER",
        fee: "0",
        tx: items.hash,
        status: items.status === "applied" ? true : false,
      };
    });

    // sync all data in DB
    await syncDB(sync);

    // 28 - 10 = 10th index -> remaining 18 transactions
    // 30 total - 28 fetching point = 2;
    // 30 current offset -> 32(2) transansactions

    var remaining = (total_row - recordCount) > 10 ? 10 : (total_row - recordCount);

    const newfetchingPoint = _.add(recordCount, remaining);

    await storeFetchingPoints(String(tokenId), newfetchingPoint);

    var currentOffset: number;
    
    if(recordCount > 0 && (total_row - recordCount) > 10){
      // then current offset incraesing by 10
      currentOffset = _.add(varyingOffset.currentOffset,10);
    }else if(recordCount > 0 && (total_row - recordCount) < 10){
      currentOffset = _.add(varyingOffset.currentOffset,(total_row - recordCount));
    }
    else {
      currentOffset = newfetchingPoint;  
    }

    const stored = await setVaryingOffset(String(tokenId), {
      to: 0,
      from: 0,
      currentOffset,
    });

    if (stored) {
      logger.info(
        `synced at ${
          new Date().getTime() / 1000
        } time. new fetching point is ${newfetchingPoint}`
      );
    } else {
      logger.error(`Sync Failed: Operation denied Key__ not stored`);
    }
  } catch (err) {
    logger.error(
      `Processer Error: token id ${tokenId} sync failed. reason ${err.message}`
    );
  }
};
