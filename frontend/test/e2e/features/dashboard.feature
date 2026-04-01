Feature: Dashboard
  As a logged-in user
  I want to view and manage my content from the dashboard
  So that I can efficiently use the platform

  Background:
    Given I am logged in

  Scenario: View dashboard with no content
    Given I have no uploaded content
    When I navigate to the dashboard
    Then I should see an empty state message
    And I should see a prompt to upload content

  Scenario: View dashboard with existing content
    Given I have uploaded content
    When I navigate to the dashboard
    Then I should see my content grid
    And each item should display a thumbnail

  Scenario: Navigate to content detail
    Given I have uploaded content
    When I navigate to the dashboard
    And I click on a content item
    Then I should see the content detail view

  Scenario: Delete content from dashboard
    Given I have uploaded content
    When I navigate to the dashboard
    And I click the delete button on a content item
    And I confirm the deletion
    Then the content should be removed
    And I should see a success notification

  Scenario: Navigate to settings
    When I navigate to the dashboard
    And I click the settings link
    Then I should be on the settings page

  Scenario: Navigate to integrations
    When I navigate to the dashboard
    And I click the integrations link
    Then I should be on the integrations page
