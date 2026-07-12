/**
 * Process entrypoint. Reads PORT (default 8787) and starts listening.
 * Run with `npm run dev` (watch) or `npm start`.
 */

import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

const app = buildServer();

app
  .listen({ port, host })
  .then((address) => {
    app.log.info?.(`CandyBlast server listening on ${address}`);
    // eslint-disable-next-line no-console
    console.log(`CandyBlast server listening on ${address}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
