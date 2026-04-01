import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { UnitWorld } from '../support/world.js';
import {
  b64url, b64urlDecodeToBytes, utf8, utf8Bytes,
  createSessionToken, verifySessionToken,
  getCookies, setCookie,
  encryptApiKey, decryptApiKey,
  makeSignedState, verifySignedState, extractOriginFromState,
  type SessionPayload,
} from '../../../worker/crypto.js';

// --- Base64url ---

Given('a byte sequence from the string {string}', function (this: UnitWorld, str: string) {
  this.result.bytes = utf8Bytes(str);
  this.result.original = str;
});

Given('a random 32-byte sequence', function (this: UnitWorld) {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  this.result.bytes = bytes;
});

When('I base64url encode it', function (this: UnitWorld) {
  this.result.encoded = b64url(this.result.bytes);
});

When('I base64url decode the result', function (this: UnitWorld) {
  this.result.decodedBytes = b64urlDecodeToBytes(this.result.encoded);
  this.result.decoded = utf8(this.result.decodedBytes);
});

Then('the decoded string should equal {string}', function (this: UnitWorld, expected: string) {
  expect(this.result.decoded).to.equal(expected);
});

Then('the decoded bytes should match the original', function (this: UnitWorld) {
  const orig = this.result.bytes as Uint8Array;
  const decoded = this.result.decodedBytes as Uint8Array;
  expect(decoded.length).to.equal(orig.length);
  for (let i = 0; i < orig.length; i++) {
    expect(decoded[i]).to.equal(orig[i]);
  }
});

// --- Session tokens ---

Given('a session payload with email {string} expiring in {int} hour(s)', function (this: UnitWorld, email: string, hours: number) {
  const now = Math.floor(Date.now() / 1000);
  this.result.payload = { email, iat: now, exp: now + hours * 3600 } as SessionPayload;
});

Given('a session payload with email {string} that expired {int} hour(s) ago', function (this: UnitWorld, email: string, hours: number) {
  const now = Math.floor(Date.now() / 1000);
  this.result.payload = { email, iat: now - 7200, exp: now - hours * 3600 } as SessionPayload;
});

When('I create a session token without a secret', async function (this: UnitWorld) {
  this.result.token = await createSessionToken(this.result.payload);
});

When('I create a session token with secret {string}', async function (this: UnitWorld, secret: string) {
  this.result.token = await createSessionToken(this.result.payload, secret);
});

When('I verify the token without a secret', async function (this: UnitWorld) {
  this.result.verified = await verifySessionToken(this.result.token);
});

When('I verify the token with secret {string}', async function (this: UnitWorld, secret: string) {
  this.result.verified = await verifySessionToken(this.result.token, secret);
});

Then('the verified payload email should be {string}', function (this: UnitWorld, email: string) {
  expect(this.result.verified).to.not.be.null;
  expect(this.result.verified.email).to.equal(email);
});

Then('the verified payload should be null', function (this: UnitWorld) {
  expect(this.result.verified).to.be.null;
});

// --- Cookies ---

Given('a request with cookie header {string}', function (this: UnitWorld, cookieHeader: string) {
  this.result.request = new Request('https://example.com', {
    headers: { cookie: cookieHeader },
  });
});

When('I parse the cookies', function (this: UnitWorld) {
  this.result.cookies = getCookies(this.result.request);
});

Then('cookie {string} should equal {string}', function (this: UnitWorld, name: string, value: string) {
  expect(this.result.cookies[name]).to.equal(value);
});

Then('cookie {string} should be undefined', function (this: UnitWorld, name: string) {
  expect(this.result.cookies[name]).to.be.undefined;
});

When('I build a cookie {string} with value {string} and max age {int}', function (this: UnitWorld, name: string, value: string, maxAge: number) {
  this.result.cookieString = setCookie(name, value, {
    maxAgeSec: maxAge,
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
});

Then('the cookie string should contain {string}', function (this: UnitWorld, expected: string) {
  expect(this.result.cookieString).to.include(expected);
});

// --- API key encryption ---

Given('an API key {string}', function (this: UnitWorld, key: string) {
  this.result.apiKey = key;
});

When('I encrypt it with secret {string}', async function (this: UnitWorld, secret: string) {
  this.result.encrypted = await encryptApiKey(this.result.apiKey, secret);
});

When('I decrypt the result with secret {string}', async function (this: UnitWorld, secret: string) {
  this.result.decrypted = await decryptApiKey(this.result.encrypted, secret);
});

Then('the decrypted key should equal {string}', function (this: UnitWorld, expected: string) {
  expect(this.result.decrypted).to.equal(expected);
});

When('I try to decrypt with secret {string}', async function (this: UnitWorld, secret: string) {
  try {
    this.result.decrypted = await decryptApiKey(this.result.encrypted, secret);
    this.error = null;
  } catch (e: any) {
    this.error = e;
  }
});

Then('decryption should fail', function (this: UnitWorld) {
  expect(this.error).to.not.be.null;
});

// --- Signed state ---

Given('a signed state with origin {string} and secret {string}', async function (this: UnitWorld, origin: string, secret: string) {
  this.result.state = await makeSignedState(secret, { origin });
});

When('I verify the signed state with secret {string}', async function (this: UnitWorld, secret: string) {
  this.result.stateValid = await verifySignedState(this.result.state, secret);
  this.result.extractedOrigin = extractOriginFromState(this.result.state);
});

Then('the state should be valid', function (this: UnitWorld) {
  expect(this.result.stateValid).to.be.true;
});

Then('the state should be invalid', function (this: UnitWorld) {
  expect(this.result.stateValid).to.be.false;
});

Then('the extracted origin should be {string}', function (this: UnitWorld, expected: string) {
  expect(this.result.extractedOrigin).to.equal(expected);
});
