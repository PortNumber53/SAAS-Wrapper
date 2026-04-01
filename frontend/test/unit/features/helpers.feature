@unit
Feature: URL and Response Helpers
  As a developer
  I want utility functions to build responses and parse origins
  So that request handling is consistent

  Scenario: jsonResponse returns JSON with correct content type
    When I call jsonResponse with ok true and count 5
    Then the response status should be 200
    And the response content-type should be "application/json"
    And the response body should contain "ok"

  Scenario: jsonResponse accepts custom status code
    When I call jsonResponse with ok false and status 404
    Then the response status should be 404

  Scenario: errorResponse includes error field
    When I call errorResponse with error "not_found" and status 404
    Then the response status should be 404
    And the response body JSON field "ok" should be false
    And the response body JSON field "error" should be "not_found"

  Scenario: unauthorizedResponse returns 401
    When I call unauthorizedResponse
    Then the response status should be 401
    And the response body JSON field "error" should be "unauthorized"

  Scenario: effectiveOrigin uses x-forwarded-host when present
    Given a request to "https://worker.example.com/api/test" with header "x-forwarded-host" set to "app.example.com"
    When I call effectiveOrigin
    Then the origin should be "https://app.example.com"

  Scenario: effectiveOrigin uses x-forwarded-proto with x-forwarded-host
    Given a request to "https://worker.example.com/api/test" with headers:
      | header             | value            |
      | x-forwarded-host   | app.example.com  |
      | x-forwarded-proto  | http             |
    When I call effectiveOrigin
    Then the origin should be "http://app.example.com"

  Scenario: effectiveOrigin falls back to request URL origin
    Given a request to "https://app.example.com/api/test" with no forwarding headers
    When I call effectiveOrigin
    Then the origin should be "https://app.example.com"

  Scenario: isHttps detects HTTPS from x-forwarded-proto
    Given a request to "http://localhost/test" with header "x-forwarded-proto" set to "https"
    When I check isHttps
    Then the result should be true

  Scenario: isHttps detects HTTP from URL protocol
    Given a request to "http://localhost/test" with no forwarding headers
    When I check isHttps
    Then the result should be false

  Scenario: paramOrigin extracts allowed localhost origin
    Given a URL "https://app.com/callback?origin=http://localhost:3000"
    When I call paramOrigin
    Then the origin should be "http://localhost:3000"

  Scenario: paramOrigin extracts allowed portnumber53 origin
    Given a URL "https://app.com/callback?origin=https://saas14.dev.portnumber53.com"
    When I call paramOrigin
    Then the origin should be "https://saas14.dev.portnumber53.com"

  Scenario: paramOrigin rejects disallowed origin
    Given a URL "https://app.com/callback?origin=https://evil.com"
    When I call paramOrigin
    Then the origin should be null

  Scenario: paramOrigin returns null when no origin param
    Given a URL "https://app.com/callback"
    When I call paramOrigin
    Then the origin should be null
