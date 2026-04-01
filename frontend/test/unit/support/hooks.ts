import { Before } from '@cucumber/cucumber';
import { UnitWorld } from './world.js';

// Polyfill crypto.subtle for Node < 20
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) {
  (globalThis as any).crypto = webcrypto;
}

Before(function (this: UnitWorld) {
  this.result = {};
  this.error = null;
  this.mockEnv = {
    SESSION_SECRET: 'test-secret-key-must-be-long-enough-32',
    DATABASE_URL: 'postgres://mock:mock@localhost:5432/mock',
    BACKEND_ORIGIN: 'https://api.test.local',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
  };
});
