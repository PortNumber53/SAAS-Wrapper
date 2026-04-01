import { BeforeAll, AfterAll, Before, After } from '@cucumber/cucumber';
import puppeteer, { type Browser } from 'puppeteer';
import { PuppeteerWorld } from './world.js';

let browser: Browser;
const BASE_URL = process.env.BASE_URL || 'http://localhost:18310';

BeforeAll(async function () {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
});

Before(async function (this: PuppeteerWorld) {
  this.browser = browser;
  this.page = await browser.newPage();
  this.baseUrl = BASE_URL;
  await this.page.setViewport({ width: 390, height: 844 });
});

After(async function (this: PuppeteerWorld) {
  if (this.page) {
    await this.page.close();
  }
});
