@unit
Feature: Cryptographic Utilities
  As a developer
  I want the crypto module to correctly encode, sign, and verify tokens
  So that session management is secure

  Scenario: Base64url encode and decode round-trip
    Given a byte sequence from the string "hello world"
    When I base64url encode it
    And I base64url decode the result
    Then the decoded string should equal "hello world"

  Scenario: Base64url handles binary data
    Given a random 32-byte sequence
    When I base64url encode it
    And I base64url decode the result
    Then the decoded bytes should match the original

  Scenario: Create and verify a session token without secret
    Given a session payload with email "user@test.com" expiring in 1 hour
    When I create a session token without a secret
    And I verify the token without a secret
    Then the verified payload email should be "user@test.com"

  Scenario: Create and verify a session token with HMAC secret
    Given a session payload with email "user@test.com" expiring in 1 hour
    When I create a session token with secret "my-test-secret-key-32-chars-long"
    And I verify the token with secret "my-test-secret-key-32-chars-long"
    Then the verified payload email should be "user@test.com"

  Scenario: Reject token with wrong secret
    Given a session payload with email "user@test.com" expiring in 1 hour
    When I create a session token with secret "correct-secret-key-32-chars-long"
    And I verify the token with secret "wrong-secret-key-32-characters!!"
    Then the verified payload should be null

  Scenario: Reject expired token
    Given a session payload with email "user@test.com" that expired 1 hour ago
    When I create a session token without a secret
    And I verify the token without a secret
    Then the verified payload should be null

  Scenario: Parse cookies from request header
    Given a request with cookie header "session=abc123; theme=dark"
    When I parse the cookies
    Then cookie "session" should equal "abc123"
    And cookie "theme" should equal "dark"

  Scenario: Parse empty cookie header
    Given a request with cookie header ""
    When I parse the cookies
    Then cookie "session" should be undefined

  Scenario: Build a Set-Cookie header string
    When I build a cookie "session" with value "token123" and max age 3600
    Then the cookie string should contain "session=token123"
    And the cookie string should contain "Max-Age=3600"
    And the cookie string should contain "Secure"
    And the cookie string should contain "HttpOnly"

  Scenario: Encrypt and decrypt an API key
    Given an API key "AIzaSyD-testkey123456"
    When I encrypt it with secret "my-encryption-secret-32-chars!!"
    And I decrypt the result with secret "my-encryption-secret-32-chars!!"
    Then the decrypted key should equal "AIzaSyD-testkey123456"

  Scenario: Decrypt fails with wrong secret
    Given an API key "AIzaSyD-testkey123456"
    When I encrypt it with secret "correct-encryption-secret-32chr!"
    And I try to decrypt with secret "wrong-encryption-secret-32chrs!!"
    Then decryption should fail

  Scenario: Create and verify signed state for OAuth
    Given a signed state with origin "https://example.com" and secret "oauth-state-secret-32-characters!"
    When I verify the signed state with secret "oauth-state-secret-32-characters!"
    Then the state should be valid
    And the extracted origin should be "https://example.com"

  Scenario: Reject signed state with wrong secret
    Given a signed state with origin "https://example.com" and secret "correct-state-secret-32-chars!!"
    When I verify the signed state with secret "wrong-state-secret-32-chars-ok!!"
    Then the state should be invalid
