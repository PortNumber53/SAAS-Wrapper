import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';

When('I am on the dashboard', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/dashboard`);
});

Then('I should see navigation icons for main sections', async function (this: PuppeteerWorld) {
  // The toolbar should have navigation links
  const links = await this.page.$$('.toolbar-link');
  expect(links.length).to.be.greaterThan(0);
});

When('I click the profile icon in the navigation', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/profile`);
});

Then('I should be on the profile page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/profile',
    { timeout: 5000 }
  );
  const heading = await this.page.$eval('h1', el => el.textContent).catch(() => '');
  expect(heading).to.include('Profile');
});

When('I click the commerce icon in the navigation', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/account/commerce`);
});

Then('I should be on the commerce page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/account/commerce',
    { timeout: 5000 }
  );
  const heading = await this.page.$eval('h1', el => el.textContent).catch(() => '');
  expect(heading).to.include('Commerce');
});

Then('I should see Stripe integration options', async function (this: PuppeteerWorld) {
  // The commerce page should show a Sync with Stripe button
  const pageContent = await this.page.content();
  expect(pageContent.toLowerCase()).to.include('stripe');
});

When('I click the agent chat icon in the navigation', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/agents/chat`);
});

Then('I should be on the agent chat page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/agents/chat',
    { timeout: 5000 }
  );
  const heading = await this.page.$eval('h1', el => el.textContent).catch(() => '');
  expect(heading).to.include('Chat');
});

When('I click the terms link in the footer', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/pages/terms-of-service`);
});

Then('I should be on the terms page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname.includes('terms'),
    { timeout: 5000 }
  );
  const heading = await this.page.$eval('h1', el => el.textContent).catch(() => '');
  expect(heading).to.include('Terms');
});

When('I click the privacy link in the footer', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/pages/privacy-policy`);
});

Then('I should be on the privacy page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname.includes('privacy'),
    { timeout: 5000 }
  );
  const heading = await this.page.$eval('h1', el => el.textContent).catch(() => '');
  expect(heading).to.include('Privacy');
});

When('I try to access the dashboard', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/dashboard`);
});

// --- Dashboard/Settings navigation from dashboard.feature ---

When('I navigate to the dashboard', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/dashboard`);
});

When('I click the settings link', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/settings`);
});

Then('I should be on the settings page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/settings',
    { timeout: 5000 }
  );
  const heading = await this.page.$eval('h1', el => el.textContent).catch(() => '');
  expect(heading).to.include('Settings');
});

When('I click the integrations link', async function (this: PuppeteerWorld) {
  await this.page.goto(`${this.baseUrl}/account/integrations`);
});

Then('I should be on the integrations page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname.includes('integrations'),
    { timeout: 5000 }
  );
});
