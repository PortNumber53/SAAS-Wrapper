import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { UnitWorld } from '../support/world.js';
import {
  checkRateLimit, rateLimitKey,
  type RateLimitConfig,
} from '../../../worker/rate-limit.js';

Given('a rate limit of {int} request(s) per {int} milliseconds', function (this: UnitWorld, max: number, windowMs: number) {
  this.result.config = { maxRequests: max, windowMs } as RateLimitConfig;
  this.result.responses = [];
});

When('I make {int} request(s) with key {string}', function (this: UnitWorld, count: number, key: string) {
  if (!this.result.responses) this.result.responses = [];
  for (let i = 0; i < count; i++) {
    const res = checkRateLimit(key, this.result.config);
    this.result.responses.push(res);
  }
});

Then('all requests should be allowed', function (this: UnitWorld) {
  for (const res of this.result.responses) {
    expect(res).to.be.null;
  }
});

Then('the first {int} requests should be allowed', function (this: UnitWorld, count: number) {
  for (let i = 0; i < count; i++) {
    expect(this.result.responses[i], `request ${i + 1} should be null`).to.be.null;
  }
});

Then('the last request should return a 429 response', function (this: UnitWorld) {
  const last = this.result.responses[this.result.responses.length - 1];
  expect(last).to.not.be.null;
  expect(last.status).to.equal(429);
});

Then('the 429 response should have a {string} header', async function (this: UnitWorld, header: string) {
  const last = this.result.responses[this.result.responses.length - 1];
  expect(last).to.not.be.null;
  expect(last.headers.get(header)).to.not.be.null;
});

// --- rateLimitKey ---

Given('a request from IP {string} via cf-connecting-ip header', function (this: UnitWorld, ip: string) {
  this.result.request = new Request('https://example.com/api/test', {
    headers: { 'cf-connecting-ip': ip },
  });
});

Given('a request from IP {string} via x-forwarded-for header', function (this: UnitWorld, ip: string) {
  this.result.request = new Request('https://example.com/api/test', {
    headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
  });
});

Given('a request with no IP headers', function (this: UnitWorld) {
  this.result.request = new Request('https://example.com/api/test');
});

When('I build a rate limit key with prefix {string}', function (this: UnitWorld, prefix: string) {
  this.result.key = rateLimitKey(this.result.request, prefix);
});

Then('the key should equal {string}', function (this: UnitWorld, expected: string) {
  expect(this.result.key).to.equal(expected);
});
