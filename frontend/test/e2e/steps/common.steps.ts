import { Given, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';
import { enableInterceptors, TEST_IG_ACCOUNT } from '../support/interceptors.js';
import {
  createSessionToken,
  type SessionPayload,
} from '../../../worker/crypto.js';

// Polyfill crypto.subtle for Node
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) {
  (globalThis as any).crypto = webcrypto;
}

const TEST_SECRET = 'integration-test-secret-32-chars!';

Given('I am logged in', async function (this: PuppeteerWorld) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    email: 'test@example.com',
    name: 'Test User',
    picture: '',
    sub: 'test-sub-123',
    iat: now,
    exp: now + 3600,
  };
  const token = await createSessionToken(payload, TEST_SECRET);
  const domain = new URL(this.baseUrl).hostname;
  await this.page.goto(this.baseUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await this.page.setCookie({
    name: 'session',
    value: token,
    domain,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
  });
});

Given('I am not logged in', async function (this: PuppeteerWorld) {
  const domain = new URL(this.baseUrl).hostname;
  await this.page.goto(this.baseUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await this.page.deleteCookie({ name: 'session', domain });
});

Given('I am on the login page', async function (this: PuppeteerWorld) {
  await this.page.goto(this.baseUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
});

Given('I am on the dashboard page', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: 'load', timeout: 15000 });
});

Given('I am on the dashboard page with no account selected', async function (this: PuppeteerWorld) {
  // Navigate without selecting an account — publish store starts with no currentId
  await this.page.evaluate(() => {
    localStorage.removeItem('publish.cache');
  });
  await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: 'load', timeout: 15000 });
});

Given('I am on any page', async function (this: PuppeteerWorld) {
  await this.page.goto(this.baseUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
});

Given('API requests are intercepted for testing', async function (this: PuppeteerWorld) {
  await enableInterceptors(this.page);
});

Given('I have a linked Instagram account {string}', async function (this: PuppeteerWorld, username: string) {
  // The interceptor already returns TEST_IG_ACCOUNT with this username.
  // Set the publish store to have this account selected.
  await this.page.evaluate((igUserId: string) => {
    const cache = JSON.stringify({
      state: { currentId: igUserId, drafts: {} },
      version: 0,
    });
    localStorage.setItem('publish.cache', cache);
  }, TEST_IG_ACCOUNT.ig_user_id);
});

Then('I should see the bottom navigation bar', async function (this: PuppeteerWorld) {
  const bar = await this.page.$('.ctabar');
  expect(bar).to.not.be.null;
});
