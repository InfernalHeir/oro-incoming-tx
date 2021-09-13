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

export const Transfers = async (tokenId: number, last_id: number | null) => {
  try {
    if (tokenId !== undefined || last_id) {
      const Token = tokens[tokenId];
      const query = last_id ? `&last_id=${last_id}` : ''; 
      const result = await fetch(
        `${BASEURL}/v1/contract/${NETWORK}/${Token}/operations/?entrypoints=transfer&${query}`
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

export const transactionsFilter = (transactions: any[]) => {
  if (_.isEmpty(transactions)) return null;
  return transactions.filter((e) => {
    return e.entrypoint === "transfer";
  });
};

export const configToken = async (): Promise<boolean> => {
  const data = await fetch(`${TEZOS_MAIN}/v1/oropocket/health-check`);
  const results = await data.json();
  const token = results.data.token;
  const updated: boolean = await client.set("TOKEN", token);
  return updated;
};

export const storeOffset = async (
  tokenId: string,
  newLastId: string
): Promise<boolean> => {
  const update: boolean = await client.set(`last_id_${tokenId}`, newLastId);
  return update;
};

export const getLastId = async (tokenId: string): Promise<number> => {
  const offset = await getAsync(`last_id_${tokenId}`);
  return Number(offset);
};

export interface Transactions {
  to_address: string;
  from_address: string;
  quantity: string;
  asset: string;
  fee: string;
  tx: string;
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
