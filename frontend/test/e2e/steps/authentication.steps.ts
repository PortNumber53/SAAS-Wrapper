import { When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';

Then('I should see a {string} button', async function (this: PuppeteerWorld, buttonText: string) {
  await this.page.waitForFunction(
    (text: string) => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).some(b => b.textContent?.includes(text));
    },
    { timeout: 15000 },
    buttonText
  );
});

When('I click the {string} button', async function (this: PuppeteerWorld, buttonText: string) {
  await this.page.waitForFunction(
    (text: string) => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).some(b => b.textContent?.includes(text));
    },
    { timeout: 15000 },
    buttonText
  );
  const clicked = await this.page.evaluate((text: string) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.includes(text)) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, buttonText);
  expect(clicked).to.be.true;
});

Then('a popup window should open for OAuth', async function (this: PuppeteerWorld) {
  // Wait for the popup to open (OAuth start opens a new window)
  await new Promise(r => setTimeout(r, 1500));
  const pages = await this.browser.pages();
  // There should be more than 1 page (main + popup)
  expect(pages.length).to.be.greaterThan(1);
  // Close the popup to clean up
  for (const p of pages) {
    if (p !== this.page) await p.close();
  }
});

When('I cancel the OAuth flow', async function (this: PuppeteerWorld) {
  await new Promise(r => setTimeout(r, 1000));
  const pages = await this.browser.pages();
  for (const p of pages) {
    if (p !== this.page) await p.close();
  }
});

Then('I should be redirected to the dashboard', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/dashboard',
    { timeout: 15000 }
  );
});

Then('I should be redirected to the login page', async function (this: PuppeteerWorld) {
  await this.page.waitForFunction(
    () => window.location.pathname === '/',
    { timeout: 15000 }
  );
});

Then('I should remain on the login page', async function (this: PuppeteerWorld) {
  const path = await this.page.evaluate(() => window.location.pathname);
  expect(path).to.equal('/');
});

When('I click the logout button', async function (this: PuppeteerWorld) {
  const userBtn = await this.page.waitForSelector('.user-button', { timeout: 10000 });
  if (userBtn) {
    await userBtn.click();
    await this.page.waitForSelector('.user-dropdown', { timeout: 5000 });
    const items = await this.page.$$('[role="menuitem"]');
    for (const item of items) {
      const text = await item.evaluate(el => el.textContent || '');
      if (text.toLowerCase().includes('logout')) {
        await item.click();
        break;
      }
    }
  }
});
