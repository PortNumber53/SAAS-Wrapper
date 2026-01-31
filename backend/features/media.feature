Feature: Media Serving
  As a user of the SaaS platform
  I want to retrieve uploaded media files
  So that I can view and use my content

  Background:
    Given the server is running
    And the storage directory is empty

  Scenario: Serve an uploaded image file
    Given I have uploaded a file "test.jpg" with content type "image/jpeg"
    When I request the media file with the returned URL
    Then the response status should be 200
    And the response header "Content-Type" should be "image/jpeg"
    And the response header "Cache-Control" should contain "public"
    And the response header "Cache-Control" should contain "immutable"

  Scenario: Request non-existent media file
    When I send a GET request to "/media/nonexistent-uuid.jpg"
    Then the response status should be 404

  Scenario: Reject non-GET methods on media endpoint
    When I send a POST request to "/media/somefile.jpg"
    Then the response status should be 405

  Scenario: Serve thumbnail after upload
    Given I have uploaded a file "test.jpg" with content type "image/jpeg"
    When I request the thumbnail with the returned thumb URL
    Then the response status should be 200
    And the response header "Content-Type" should be "image/jpeg"

  Scenario: Path traversal attempt returns not found
    When I send a GET request to "/media/../../../etc/passwd"
    Then the response status should be 404
