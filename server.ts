import express, { Application, Request, Response } from "express";
import { json, urlencoded } from "body-parser";
import morgon from "morgan";
import cors from "cors";
import { logger } from "./logger";
import { config } from "./config";
import { configToken, setVaryingOffset, storeFetchingPoints, storeLastId } from "./helpers";
import { goldTransfersSync , sliverTransfersSync } from "./jobs";
import { tokens } from "./constants";

const app: Application = express();
const PORT = config.PORT;

app.use(json({ limit: "50kb" }));
app.use(urlencoded({ extended: true }));

app.use(
  morgon((tokens, req, res) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, "content-length"),
      "-",
      tokens["response-time"](req, res),
      "ms",
    ].join(" ");
  })
);

app.use(
  cors({
    origin: "*",
  })
);

app.post("/reset-settings", async (req: Request, res: Response) => {
  try {
    const from  = req.body.from;
    const to = req.body.to;
    const currentOffset = req.body.currentOffset;
    const tokenId = req.body.tokenId;

    await setVaryingOffset(String(tokenId),{
      from,
      to,
      currentOffset
    });

    await storeFetchingPoints(String(tokenId),"0");
    
    return res.json({
      code: 200,
      data: `Settings Reset for TokenId ${tokens[tokenId]}`,
    });

  } catch (err) {
    logger.error(`Settings reset failed: ${err.message}`);
  }
});

app.post("/setToken", async (req: Request, res: Response) => {
  try {
    await configToken();
    return res.json({
      code: 200,
      data: "Token configuration done.",
    });
  } catch (error) {
    logger.error(`FAILED: please try again`);
    throw new Error("some unexpected error..");
  }
});

// if no route found
app.use(function (req, res, next) {
  logger.error(`BAD_REQUEST: one bad request found from ${req.ip}`);
  res.status(400).json({
    code: 400,
    message: "BAD_REQUEST:: no route found.",
  });
});

app.listen(PORT, () => {
  logger.info(`server started at ${PORT} port.`);
  // gold and silver async crons of transactions sync.
  goldTransfersSync.start();
  sliverTransfersSync.start();
});
