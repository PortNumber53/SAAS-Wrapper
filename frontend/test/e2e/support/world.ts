import { World, setWorldConstructor } from '@cucumber/cucumber';
import type { Browser, Page } from 'puppeteer';

export class PuppeteerWorld extends World {
  browser!: Browser;
  page!: Page;
  baseUrl: string = '';
}

setWorldConstructor(PuppeteerWorld);
