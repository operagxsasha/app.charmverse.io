/* eslint-disable import/no-extraneous-dependencies */
import { log } from '@charmverse/core/log';
import { serveEncodedDefinition } from '@composedb/devtools-node';

import { ceramicHost, getCeramicClient } from './authenticate';
import { compositeDefinitionFile, writeComposite } from './deploy-composites';

async function bootstrapGqlServer() {
  const ceramic = await getCeramicClient();

  await writeComposite();

  log.info(`GraphQL Composedb server started`);

  return serveEncodedDefinition({
    ceramicURL: ceramicHost,
    graphiql: true,
    path: compositeDefinitionFile,
    port: 5001,
    did: ceramic.did
  });
}

const server = bootstrapGqlServer();

process.on('SIGTERM', async () => {
  (await server).stop();
  log.info('GraphQL Composedb server stopped');
});
