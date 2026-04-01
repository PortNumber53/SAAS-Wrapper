import { BeforeAll, AfterAll, Before } from '@cucumber/cucumber';
import { unstable_dev, type UnstableDevWorker } from 'wrangler';
import { IntegrationWorld } from './world.js';

// Polyfill crypto.subtle for Node < 20
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) {
  (globalThis as any).crypto = webcrypto;
}

let worker: UnstableDevWorker;
let workerUrl: string;

BeforeAll(async function () {
  worker = await unstable_dev('worker/index.ts', {
    experimental: { disableExperimentalWarning: true },
    vars: {
      SESSION_SECRET: 'integration-test-secret-32-chars!',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    },
    config: 'wrangler.jsonc',
  });
  workerUrl = `http://${worker.address}:${worker.port}`;
});

AfterAll(async function () {
  if (worker) {
    await worker.stop();
  }
});

Before(function (this: IntegrationWorld) {
  this.baseUrl = workerUrl;
  this.response = null;
  this.responseBody = null;
  this.responseHeaders = null;
  this.requestCount = 0;
});
