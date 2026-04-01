import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from 'chai';
import { UnitWorld } from '../support/world.js';
import {
  effectiveOrigin, isHttps, paramOrigin,
  jsonResponse, errorResponse, unauthorizedResponse,
} from '../../../worker/url-helpers.js';

// --- jsonResponse / errorResponse / unauthorizedResponse ---

When('I call jsonResponse with ok true and count {int}', function (this: UnitWorld, count: number) {
  this.result.response = jsonResponse({ ok: true, count });
});

When('I call jsonResponse with ok false and status {int}', function (this: UnitWorld, status: number) {
  this.result.response = jsonResponse({ ok: false }, status);
});

When('I call errorResponse with error {string} and status {int}', function (this: UnitWorld, error: string, status: number) {
  this.result.response = errorResponse(error, status);
});

When('I call unauthorizedResponse', function (this: UnitWorld) {
  this.result.response = unauthorizedResponse();
});

Then('the response status should be {int}', function (this: UnitWorld, status: number) {
  expect(this.result.response.status).to.equal(status);
});

Then('the response content-type should be {string}', function (this: UnitWorld, ct: string) {
  expect(this.result.response.headers.get('content-type')).to.equal(ct);
});

Then('the response body should contain {string}', async function (this: UnitWorld, text: string) {
  const body = await this.result.response.clone().text();
  expect(body).to.include(text);
});

Then('the response body JSON field {string} should be false', async function (this: UnitWorld, field: string) {
  const json = await this.result.response.clone().json();
  expect(json[field]).to.equal(false);
});

Then('the response body JSON field {string} should be {string}', async function (this: UnitWorld, field: string, value: string) {
  const json = await this.result.response.clone().json();
  expect(json[field]).to.equal(value);
});

// --- effectiveOrigin ---

Given('a request to {string} with header {string} set to {string}', function (this: UnitWorld, urlStr: string, header: string, value: string) {
  this.result.request = new Request(urlStr, { headers: { [header]: value } });
  this.result.url = new URL(urlStr);
});

Given('a request to {string} with headers:', function (this: UnitWorld, urlStr: string, table: DataTable) {
  const headers: Record<string, string> = {};
  for (const row of table.hashes()) {
    headers[row.header] = row.value;
  }
  this.result.request = new Request(urlStr, { headers });
  this.result.url = new URL(urlStr);
});

Given('a request to {string} with no forwarding headers', function (this: UnitWorld, urlStr: string) {
  this.result.request = new Request(urlStr);
  this.result.url = new URL(urlStr);
});

When('I call effectiveOrigin', function (this: UnitWorld) {
  this.result.origin = effectiveOrigin(this.result.request, this.result.url);
});

Then('the origin should be {string}', function (this: UnitWorld, expected: string) {
  expect(this.result.origin).to.equal(expected);
});

Then('the origin should be null', function (this: UnitWorld) {
  expect(this.result.origin).to.be.null;
});

// --- isHttps ---

When('I check isHttps', function (this: UnitWorld) {
  this.result.isHttps = isHttps(this.result.request, this.result.url);
});

Then('the result should be true', function (this: UnitWorld) {
  expect(this.result.isHttps).to.be.true;
});

Then('the result should be false', function (this: UnitWorld) {
  expect(this.result.isHttps).to.be.false;
});

// --- paramOrigin ---

Given('a URL {string}', function (this: UnitWorld, urlStr: string) {
  this.result.url = new URL(urlStr);
});

When('I call paramOrigin', function (this: UnitWorld) {
  this.result.origin = paramOrigin(this.result.url);
});
