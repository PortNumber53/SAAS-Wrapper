import { When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';

Then('I should see a {string} button', async function (this: PuppeteerWorld, buttonText: string) {
  await this.page.waitForFunction(
    (text: string) => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).some(b => b.textContent?.includes(text));
    },
    { timeout: 5000 },
    buttonText
  );
});

When('I click the {string} button', async function (this: PuppeteerWorld, buttonText: string) {
  await this.page.waitForFunction(
    (text: string) => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).some(b => b.textContent?.includes(text));
    },
    { timeout: 5000 },
    buttonText
  );
  const buttons = await this.page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent || '');
    if (text.includes(buttonText)) {
      await btn.click();
      break;
    }
  }
});

When('I complete the Google OAuth flow', async function (this: PuppeteerWorld) {
  // In E2E tests, we cannot complete real OAuth.
  // This step is a placeholder — in real E2E it would mock the OAuth provider
  // or use a test account. For now we mark it as pending.
  return 'pending';
});

When('I complete the Instagram OAuth flow', async function (this: PuppeteerWorld) {
  return 'pending';
});

When('I cancel the OAuth flow', async function (this: PuppeteerWorld) {
  return 'pending';
});

Then('I should be redirected to the dashboard', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/dashboard',
    { timeout: 5000 }
  );
});

Then('I should be redirected to the login page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/' || window.location.pathname === '/login',
    { timeout: 5000 }
  );
});

Then('I should see my profile information', async function (this: PuppeteerWorld) {
  // After login, the user menu should show the user's name/avatar
  await this.page.waitForSelector('.user-button', { timeout: 5000 });
});

Then('I should see my Instagram account connected', async function (this: PuppeteerWorld) {
  return 'pending';
});

Then('I should remain on the login page', async function (this: PuppeteerWorld) {
  const url = this.page.url();
  expect(url).to.include(this.baseUrl);
});

Then('I should see an error message', async function (this: PuppeteerWorld) {
  return 'pending';
});

When('I click the logout button', async function (this: PuppeteerWorld) {
  // Open user dropdown, then click logout
  const userBtn = await this.page.waitForSelector('.user-button', { timeout: 5000 });
  if (userBtn) await userBtn.click();
  // Wait for dropdown to appear
  await this.page.waitForSelector('.user-dropdown', { timeout: 3000 });
  // Click logout menu item
  const items = await this.page.$$('[role="menuitem"]');
  for (const item of items) {
    const text = await item.evaluate(el => el.textContent || '');
    if (text.toLowerCase().includes('logout')) {
      await item.click();
      break;
    }
  }
});

Then('my session should be cleared', async function (this: PuppeteerWorld) {
  const cookies = await this.page.cookies();
  const session = cookies.find(c => c.name === 'session');
  // Session cookie should be cleared or missing
  expect(!session || session.value === '').to.be.true;
});
