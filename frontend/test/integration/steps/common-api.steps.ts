import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { IntegrationWorld } from '../support/world.js';

// --- HTTP request steps ---

When('I send a GET request to {string}', async function (this: IntegrationWorld, path: string) {
  const headers: Record<string, string> = {};
  if (this.sessionCookie) headers['cookie'] = `session=${this.sessionCookie}`;
  this.response = await fetch(`${this.baseUrl}${path}`, { headers });
  this.responseHeaders = this.response.headers;
  if (this.response.headers.get('content-type')?.includes('application/json')) {
    this.responseBody = await this.response.json();
  }
});

When('I send a GET request to {string} without following redirects', async function (this: IntegrationWorld, path: string) {
  const headers: Record<string, string> = {};
  if (this.sessionCookie) headers['cookie'] = `session=${this.sessionCookie}`;
  this.response = await fetch(`${this.baseUrl}${path}`, { headers, redirect: 'manual' });
  this.responseHeaders = this.response.headers;
});

When('I send a POST request to {string} with body:', async function (this: IntegrationWorld, path: string, body: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (this.sessionCookie) headers['cookie'] = `session=${this.sessionCookie}`;
  this.response = await fetch(`${this.baseUrl}${path}`, {
    method: 'POST',
    headers,
    body,
  });
  this.responseHeaders = this.response.headers;
  if (this.response.headers.get('content-type')?.includes('application/json')) {
    this.responseBody = await this.response.json();
  }
});

// --- Rate limiting steps ---

Given('I have sent {int} rapid GET requests to {string}', async function (this: IntegrationWorld, count: number, path: string) {
  this.result = { responses: [] as Response[] };
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${this.baseUrl}${path}`);
    this.result.responses.push(res);
  }
});

Then('at least one response should be rate-limited', function (this: IntegrationWorld) {
  const statuses = this.result.responses.map((r: Response) => r.status);
  expect(statuses).to.include(429);
});

// --- Response assertion steps ---

Then('the response status should be {int}', function (this: IntegrationWorld, status: number) {
  expect(this.response!.status).to.equal(status);
});

Then('the response JSON field {string} should be false', function (this: IntegrationWorld, field: string) {
  expect(this.responseBody[field]).to.equal(false);
});

Then('the response JSON field {string} should be true', function (this: IntegrationWorld, field: string) {
  expect(this.responseBody[field]).to.equal(true);
});

Then('the response JSON field {string} should be {string}', function (this: IntegrationWorld, field: string, value: string) {
  expect(this.responseBody[field]).to.equal(value);
});

Then('the response JSON should have field {string}', function (this: IntegrationWorld, field: string) {
  expect(this.responseBody).to.have.property(field);
});

Then('the response {string} header should contain {string}', function (this: IntegrationWorld, header: string, value: string) {
  const headerValue = this.responseHeaders!.get(header);
  expect(headerValue).to.not.be.null;
  expect(headerValue!).to.include(value);
});
