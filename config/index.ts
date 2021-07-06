import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: `.env.${process.env.NODE_ENV}` });

export const config = {
  PORT: process.env.PORT,
  REDIS_HOSTNAME: process.env.REDIS_HOSTNAME,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
};
