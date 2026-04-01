import { World, setWorldConstructor } from '@cucumber/cucumber';

export class IntegrationWorld extends World {
  baseUrl: string = '';
  response: Response | null = null;
  responseBody: any = null;
  responseHeaders: Headers | null = null;
  sessionCookie: string = '';
  requestCount: number = 0;
  result: any = {};
}

setWorldConstructor(IntegrationWorld);
