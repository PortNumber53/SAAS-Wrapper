import { World, setWorldConstructor } from '@cucumber/cucumber';

export class UnitWorld extends World {
  result: any = {};
  error: Error | null = null;
  mockEnv: Record<string, any> = {};
}

setWorldConstructor(UnitWorld);
