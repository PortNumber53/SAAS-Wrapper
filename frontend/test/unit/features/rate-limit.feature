@unit
Feature: Rate Limiter
  As a platform operator
  I want to rate-limit API requests
  So that abuse is prevented

  Scenario: Allow requests within the limit
    Given a rate limit of 5 requests per 60000 milliseconds
    When I make 5 requests with key "api:1.2.3.4"
    Then all requests should be allowed

  Scenario: Block requests exceeding the limit
    Given a rate limit of 3 requests per 60000 milliseconds
    When I make 4 requests with key "api:5.6.7.8"
    Then the first 3 requests should be allowed
    And the last request should return a 429 response

  Scenario: 429 response includes retry-after header
    Given a rate limit of 1 request per 60000 milliseconds
    When I make 2 requests with key "api:9.9.9.9"
    Then the last request should return a 429 response
    And the 429 response should have a "retry-after" header

  Scenario: Different keys have independent limits
    Given a rate limit of 2 requests per 60000 milliseconds
    When I make 2 requests with key "api:10.0.0.1"
    And I make 2 requests with key "api:10.0.0.2"
    Then all requests should be allowed

  Scenario: Rate limit key includes prefix and IP
    Given a request from IP "10.0.0.1" via cf-connecting-ip header
    When I build a rate limit key with prefix "auth"
    Then the key should equal "auth:10.0.0.1"

  Scenario: Rate limit key falls back to x-forwarded-for
    Given a request from IP "192.168.1.1" via x-forwarded-for header
    When I build a rate limit key with prefix "upload"
    Then the key should equal "upload:192.168.1.1"

  Scenario: Rate limit key uses "unknown" without IP headers
    Given a request with no IP headers
    When I build a rate limit key with prefix "api"
    Then the key should equal "api:unknown"
