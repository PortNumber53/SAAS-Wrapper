Feature: File Deletion
  As a user of the SaaS platform
  I want to delete uploaded files
  So that I can manage my storage space

  Background:
    Given the server is running
    And the storage directory is empty

  Scenario: Successfully delete an uploaded file
    Given I have uploaded a file "test.jpg" with content type "image/jpeg"
    When I delete the uploaded file
    Then the response status should be 200
    And the response should contain "ok" equal to true

  Scenario: Delete non-existent file returns 404
    When I send a DELETE request to "/uploads/nonexistent-uuid.jpg"
    Then the response status should be 404

  Scenario: Reject non-DELETE methods on uploads path
    When I send a GET request to "/uploads/somefile.jpg"
    Then the response status should be 405

  Scenario: Path traversal attempt returns not found
    When I send a DELETE request to "/uploads/../../../etc/passwd"
    Then the response status should be 404

  Scenario: Deleted file is no longer accessible
    Given I have uploaded a file "test.jpg" with content type "image/jpeg"
    When I delete the uploaded file
    And I request the media file with the returned URL
    Then the response status should be 404
