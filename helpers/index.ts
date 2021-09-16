import fetch from "node-fetch";
import {
  BASEURL,
  NETWORK,
  phpAuth,
  phpServerEndpoint,
  TEZOS_MAIN,
  tokens,
} from "../constants";
import { logger } from "../logger";
import _ from "lodash";
import redis from "redis";
import { config } from "../config";
import { promisify } from "util";

export const Transfers = async (tokenId: number, offset: number | null) => {
  try {
    if (tokenId !== undefined || offset) {
      const Token = tokens[tokenId];
      const result = await fetch(
        `${BASEURL}/v1/contract/${NETWORK}/${Token}/transfers/?&offset=${offset}`
      );
      const formatedResult = await result.json();
      return formatedResult;
    }
  } catch (err) {
    logger.error(`Transfers: ${err.message}`);
  }
};

export const client = redis.createClient({
  host: config.REDIS_HOSTNAME,
  port: 6379,
});

export const getAsync = promisify(client.get).bind(client);

export const getAllAccounts = async () => {
  try {
    const auth = await getAsync("TOKEN");

    const results = await fetch(
      `${TEZOS_MAIN}/v1/oropocket/accounts/getAllAccounts`,
      {
        headers: {
          authorization: auth?.toString(),
          "Content-Type": "application/json",
        },
      }
    );
    const response = await results.json();
    return response.data;
  } catch (err) {
    logger.error(`getAllAccounts: ${err.message}`);
  }
};

export const outputedTransactions = (transactions: any[]) => {
  if (_.isEmpty(transactions)) return null;
  return transactions.filter((e) => {
    return e.entrypoint === "transfer";
  });
};

export const storeFetchingPoints = async (
  tokenId: string,
  newFetchingPoints: string
): Promise<boolean> => {
  const isUpdated = await client.set(
    `fetching_points_${tokenId}`,
    newFetchingPoints
  );
  return isUpdated;
};

export const getFetchingPoints = async (tokenId: string) => {
  const fetchingPoints = await getAsync(`fetching_points_${tokenId}`);
  return Number(fetchingPoints);
};

interface VaryingOffset {
  from: number,
  to: number,
  currentOffset: number
}

export const setVaryingOffset = async (
  tokenId: string,
  opts: VaryingOffset
): Promise<boolean> => {
  const varyingOffset = JSON.stringify(opts);
  const isUpdated = await client.set(
    `varting_offset_${tokenId}`,
    varyingOffset
  );
  return isUpdated;
};

export const getVaryingOffset = async (tokenId: string): Promise<VaryingOffset> => {
  const varyingOffset = await getAsync(`varting_offset_${tokenId}`);
  if(!varyingOffset){
    return {
      from: 0,
      to: 0,
      currentOffset: 0
    }
  }
  return JSON.parse(String(varyingOffset));
};

export const configToken = async (): Promise<boolean> => {
  const data = await fetch(`${TEZOS_MAIN}/v1/oropocket/health-check`);
  const results = await data.json();
  const token = results.data.token;
  const updated: boolean = await client.set("TOKEN", token);
  return updated;
};

export const storeLastId = async (
  tokenId: string,
  newLastId: string
): Promise<boolean> => {
  const update: boolean = await client.set(`last_id_${tokenId}`, newLastId);
  return update;
};

export const getLastId = async (tokenId: string): Promise<number> => {
  const last_id = await getAsync(`last_id_${tokenId}`);
  return Number(last_id);
};

export interface Transactions {
  to_address: string;
  from_address: string;
  quantity: string;
  asset: string;
  fee: string;
  tx: string;
  status: boolean;
}

export const syncDB = async (sync: Transactions[] | undefined) => {
  if (_.isEmpty(sync) || !sync) return null;
  try {
    await fetch(`${phpServerEndpoint}/recive_tezos_transactions.php`, {
      method: "post",
      headers: {
        Authorization: `Bearer ${phpAuth}`,
      },
      body: JSON.stringify({
        transections: sync,
      }),
    });
  } catch (err) {
    logger.error(`syncDB: ${err.message}`);
  }
};
