@e2e
Feature: Create and Publish Posts
  As a logged-in user with a linked Instagram account
  I want to upload an image, write a caption, and publish
  So that I can share content on Instagram

  Background:
    Given I am logged in
    And API requests are intercepted for testing
    And I have a linked Instagram account "testaccount"

  Scenario: Upload image via file picker and see preview
    Given I am on the dashboard page
    When I upload a test image via the file picker
    Then I should see the image preview on the dashboard
    And the publish button should be enabled

  Scenario: Write a caption
    Given I am on the dashboard page
    When I upload a test image via the file picker
    And I enter caption "Hello from E2E tests! #automated"
    Then I should see the caption in the preview

  Scenario: Full publish flow - upload, caption, and publish
    Given I am on the dashboard page
    When I upload a test image via the file picker
    And I enter caption "E2E test post #testing"
    And I click the publish button
    Then I should see a success toast with "Publish enqueued"
    And the image field should be cleared

  Scenario: Cannot publish without an image
    Given I am on the dashboard page
    Then the publish button should be disabled

  Scenario: Cannot publish without selecting an account
    Given I am on the dashboard page with no account selected
    When I upload a test image via the file picker
    And I click the publish button
    Then I should see an error toast with "Select an Instagram account"
