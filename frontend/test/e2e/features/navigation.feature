Feature: Navigation
  As a user of the SaaS platform
  I want to navigate between pages
  So that I can access different features

  Scenario: Navigate using bottom bar
    Given I am logged in
    When I am on the dashboard
    Then I should see the bottom navigation bar
    And I should see navigation icons for main sections

  Scenario: Navigate to Profile page
    Given I am logged in
    When I click the profile icon in the navigation
    Then I should be on the profile page

  Scenario: Navigate to Commerce page
    Given I am logged in
    When I click the commerce icon in the navigation
    Then I should be on the commerce page
    And I should see Stripe integration options

  Scenario: Navigate to Agent Chat
    Given I am logged in
    When I click the agent chat icon in the navigation
    Then I should be on the agent chat page

  Scenario: Navigate to Terms page
    Given I am on any page
    When I click the terms link in the footer
    Then I should be on the terms page

  Scenario: Navigate to Privacy page
    Given I am on any page
    When I click the privacy link in the footer
    Then I should be on the privacy page

  Scenario: Redirect unauthenticated user to login
    Given I am not logged in
    When I try to access the dashboard
    Then I should be redirected to the login page
