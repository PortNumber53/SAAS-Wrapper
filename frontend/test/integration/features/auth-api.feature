@integration
Feature: Auth API Routes
  As an API consumer
  I want authentication endpoints to work correctly
  So that users can securely access the platform

  Scenario: Session endpoint returns not-ok without cookie
    When I send a GET request to "/api/auth/session"
    Then the response status should be 200
    And the response JSON field "ok" should be false

  Scenario: Logout endpoint returns 204
    When I send a GET request to "/api/auth/logout"
    Then the response status should be 204

  Scenario: Google OAuth start redirects to Google
    When I send a GET request to "/api/auth/google/start" without following redirects
    Then the response status should be 302
    And the response "location" header should contain "accounts.google.com"

  Scenario: Google redirect-uri diagnostic endpoint works
    When I send a GET request to "/api/auth/google/redirect-uri"
    Then the response status should be 200
    And the response JSON should have field "redirect_uri"

  Scenario: Settings endpoint rejects unauthenticated requests
    When I send a GET request to "/api/settings"
    Then the response status should be 401
    And the response JSON field "error" should be "unauthorized"

  Scenario: Me endpoint rejects unauthenticated requests
    When I send a GET request to "/api/me"
    Then the response status should be 401

  Scenario: Integrations endpoint rejects unauthenticated requests
    When I send a GET request to "/api/integrations"
    Then the response status should be 401

  @requires-db
  Scenario: Subscription tiers endpoint is public
    When I send a GET request to "/api/subscriptions/tiers"
    Then the response status should be 200
    And the response JSON field "ok" should be true

  Scenario: Non-existent API route proxied to backend returns error
    When I send a GET request to "/api/nonexistent"
    Then the response status should be 502

  Scenario: Auth endpoints are rate-limited
    Given I have sent 11 rapid GET requests to "/api/auth/session"
    Then at least one response should be rate-limited
