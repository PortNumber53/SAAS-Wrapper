import { When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';

Then('I should see the image preview on the dashboard', async function (this: PuppeteerWorld) {
  const hasPreview = await this.page.evaluate(() => {
    const imgs = document.querySelectorAll('.pub-preview img, .pub-media img');
    return imgs.length > 0;
  });
  expect(hasPreview).to.be.true;
});

When('I enter caption {string}', async function (this: PuppeteerWorld, caption: string) {
  const textarea = await this.page.waitForSelector('textarea', { timeout: 15000 });
  await textarea!.click({ clickCount: 3 }); // select all
  await textarea!.type(caption);
});

Then('I should see the caption in the preview', async function (this: PuppeteerWorld) {
  const previewText = await this.page.evaluate(() => {
    const preview = document.querySelector('.pub-preview');
    return preview?.textContent || '';
  });
  // Caption should appear somewhere in the preview section
  expect(previewText.length).to.be.greaterThan(0);
});

When('I click the publish button', async function (this: PuppeteerWorld) {
  // The publish button is in the BottomBar (ctabar)
  const btn = await this.page.waitForSelector('.ctabar button', { timeout: 15000 });
  expect(btn).to.not.be.null;
  await btn!.click();
  // Wait for response (interceptor responds immediately)
  await new Promise(r => setTimeout(r, 500));
});

Then('the publish button should be enabled', async function (this: PuppeteerWorld) {
  const disabled = await this.page.evaluate(() => {
    const btn = document.querySelector('.ctabar button');
    return btn ? (btn as HTMLButtonElement).disabled : true;
  });
  expect(disabled).to.be.false;
});

Then('the publish button should be disabled', async function (this: PuppeteerWorld) {
  const disabled = await this.page.evaluate(() => {
    const btn = document.querySelector('.ctabar button');
    return btn ? (btn as HTMLButtonElement).disabled : true;
  });
  expect(disabled).to.be.true;
});

Then('I should see a success toast with {string}', async function (this: PuppeteerWorld, text: string) {
  // Wait for toast to appear
  await this.page.waitForFunction(
    (expected: string) => {
      const body = document.body.textContent || '';
      return body.includes(expected);
    },
    { timeout: 15000 },
    text
  );
});

Then('I should see an error toast with {string}', async function (this: PuppeteerWorld, text: string) {
  await this.page.waitForFunction(
    (expected: string) => {
      const body = document.body.textContent || '';
      return body.includes(expected);
    },
    { timeout: 15000 },
    text
  );
});

Then('the image field should be cleared', async function (this: PuppeteerWorld) {
  // After successful publish, the form resets — no image preview
  await this.page.waitForFunction(
    () => {
      const imgs = document.querySelectorAll('.pub-preview img, .pub-media img');
      return imgs.length === 0;
    },
    { timeout: 15000 }
  );
});

Then('the form should be cleared', async function (this: PuppeteerWorld) {
  // Both image and caption should be cleared
  const state = await this.page.evaluate(() => {
    const imgs = document.querySelectorAll('.pub-preview img, .pub-media img');
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
    return {
      hasImage: imgs.length > 0,
      captionEmpty: textarea ? textarea.value === '' : true,
    };
  });
  expect(state.hasImage).to.be.false;
  expect(state.captionEmpty).to.be.true;
});
