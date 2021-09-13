import {
  getAsync,
  getLastId,
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
    const last_id = await getLastId(String(tokenId));

    if (tokenId === undefined || last_id === undefined) {
      logger.error(`TokenId or Offset should not be undefined`);
      throw new Error("TokenId or Offset should not be undefined");
    }

    const transactions = await Transfers(tokenId, Number(last_id));

    const operations = transactionsFilter(transactions?.operations);
    const last_id_result = Number(transactions?.last_id);

    if (_.isEmpty(operations) || Number(last_id) >= last_id_result) {
      logger.info("No Incoming Transactions Found");
      return null;
    }

    const sync = operations?.map((items) => {
      return {
        to_address: items.parameters[0].children[1].value,
        from_address: items.parameters[0].children[0].value,
        quantity: String(_.divide(Number(items.parameters[0].children[2].value), 10 ** 6)),
        asset:
          String(items.destination).toLowerCase() === tokens[0].toLowerCase()
            ? "GOLD"
            : "SILVER",
        fee: items.fee,
        tx: items.hash,
      };
    });

    // sync all data in DB
    await syncDB(sync);


    // store the new offset value
    const isStore = await storeOffset(String(tokenId),String(last_id_result));
    if (isStore) {
      logger.info(
        `synced at ${
          new Date().getTime() / 1000
        } time. new last_id is ${last_id_result}`
      );
    } else {
      logger.error(`may be something wrong went with redis`);
    }
  } catch (err) {
    logger.error(
      `Processer Error: token id ${tokenId} sync failed. reason ${err.message}`
    );
  }
};
