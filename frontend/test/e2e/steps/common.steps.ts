import { Given, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';
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
  // Create a valid session token and set it as a cookie
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
  await this.page.goto(this.baseUrl);
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
  await this.page.goto(this.baseUrl);
  await this.page.deleteCookie({ name: 'session', domain });
});

Given('I am on the login page', async function (this: PuppeteerWorld) {
  await this.page.goto(this.baseUrl);
  await this.page.waitForSelector('.account', { timeout: 5000 });
});

Given('I am on the dashboard page', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/dashboard`);
  await this.page.waitForSelector('.pub-page', { timeout: 5000 });
});

Given('I am on any page', async function (this: PuppeteerWorld) {
  await this.page.goto(this.baseUrl);
});

Then('I should see the bottom navigation bar', async function (this: PuppeteerWorld) {
  const bar = await this.page.$('.ctabar');
  expect(bar).to.not.be.null;
});
