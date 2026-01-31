Feature: File Upload
  As a user of the SaaS platform
  I want to upload image files
  So that I can store and manage my media content

  Background:
    Given the server is running
    And the storage directory is empty

  Scenario: Successfully upload a valid image file
    When I upload a file "test.png" with content type "image/png"
    Then the response status should be 200
    And the response should contain "ok" equal to true
    And the response should contain a "url" field
    And the response should contain a "thumb_url" field
    And the response should contain "content_type" equal to "image/png"

  Scenario: Upload a PNG image file
    When I upload a file "test.png" with content type "image/png"
    Then the response status should be 200
    And the response should contain "ok" equal to true
    And the response should contain "content_type" equal to "image/png"

  Scenario: Reject non-image file upload
    When I upload a file "test.txt" with content type "text/plain"
    Then the response status should be 415
    And the response should contain "ok" equal to false
    And the response should contain "error" equal to "unsupported_type"

  Scenario: Reject empty file upload
    When I upload an empty file "empty.jpg"
    Then the response status should be 400
    And the response should contain "ok" equal to false
    And the response should contain "error" equal to "empty_file"

  Scenario: Reject request without file
    When I submit an upload request without a file
    Then the response status should be 400
    And the response should contain "ok" equal to false
    And the response should contain "error" equal to "missing_file"

  Scenario: Reject non-POST methods on upload endpoint
    When I send a GET request to "/uploads"
    Then the response status should be 405
