import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UnitWorld } from '../support/world.js';

function parseVersion(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10));
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da - db;
  }
  return 0;
}

Given('I read the package-lock.json', function (this: UnitWorld) {
  const lockPath = join(process.cwd(), 'package-lock.json');
  const raw = readFileSync(lockPath, 'utf-8');
  this.result.lockfile = JSON.parse(raw);
});

When(
  'I look up the version of {string} under {string}',
  function (this: UnitWorld, _pkg: string, path: string) {
    const packages = this.result.lockfile?.packages || {};
    this.result.version = packages[path]?.version ?? null;
  },
);

Then('the version should be at least {string}', function (this: UnitWorld, minVersion: string) {
  expect(this.result.version, 'version not found in lock file').to.not.be.null;
  expect(compareVersions(this.result.version, minVersion)).to.be.gte(0);
});

Then('the version should not equal {string}', function (this: UnitWorld, badVersion: string) {
  expect(this.result.version, 'version not found in lock file').to.not.be.null;
  expect(this.result.version).to.not.equal(badVersion);
});
