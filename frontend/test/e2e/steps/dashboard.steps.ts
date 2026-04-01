import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PuppeteerWorld } from '../support/world.js';

Given('I have no uploaded content', async function (this: PuppeteerWorld) {
  // This is a precondition — test user has no content by default
});

Given('I have uploaded content', async function (this: PuppeteerWorld) {
  // Mark as pending — requires seeded test data
  return 'pending';
});

Then('I should see an empty state message', async function (this: PuppeteerWorld) {
  // The dashboard shows a muted message or prompt when no content exists
  const content = await this.page.content();
  const hasEmpty = content.includes('No image') || content.includes('upload') || content.includes('Choose');
  expect(hasEmpty).to.be.true;
});

Then('I should see a prompt to upload content', async function (this: PuppeteerWorld) {
  const content = await this.page.content();
  const hasPrompt = content.includes('Click to choose') || content.includes('drag and drop');
  expect(hasPrompt).to.be.true;
});

Then('I should see my content grid', async function (this: PuppeteerWorld) {
  const grid = await this.page.$('.pub-grid');
  expect(grid).to.not.be.null;
});

Then('each item should display a thumbnail', async function (this: PuppeteerWorld) {
  return 'pending';
});

When('I click on a content item', async function (this: PuppeteerWorld) {
  return 'pending';
});

Then('I should see the content detail view', async function (this: PuppeteerWorld) {
  return 'pending';
});

When('I click the delete button on a content item', async function (this: PuppeteerWorld) {
  return 'pending';
});

When('I confirm the deletion', async function (this: PuppeteerWorld) {
  return 'pending';
});

Then('the content should be removed', async function (this: PuppeteerWorld) {
  return 'pending';
});

Then('I should see a success notification', async function (this: PuppeteerWorld) {
  return 'pending';
});
