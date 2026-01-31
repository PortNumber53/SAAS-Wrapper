Feature: File Upload
  As a logged-in user
  I want to upload image files via drag and drop
  So that I can manage my media content

  Background:
    Given I am logged in
    And I am on the dashboard page

  Scenario: Upload image via drag and drop
    When I drag and drop an image file onto the upload zone
    Then I should see a loading indicator
    And the file should be uploaded successfully
    And I should see a success toast notification
    And the uploaded image should appear in my content

  Scenario: Upload image via file picker
    When I click the upload zone
    And I select an image file from the file picker
    Then the file should be uploaded successfully
    And I should see a success toast notification

  Scenario: Reject non-image file upload
    When I drag and drop a text file onto the upload zone
    Then I should see an error toast notification
    And the file should not be uploaded

  Scenario: Handle upload failure gracefully
    Given the server is unavailable
    When I drag and drop an image file onto the upload zone
    Then I should see an error toast notification
    And I should be able to retry the upload

  Scenario: Upload multiple images
    When I drag and drop multiple image files onto the upload zone
    Then all files should be uploaded successfully
    And I should see success notifications for each file
