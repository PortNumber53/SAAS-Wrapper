Feature: User Authentication
  As a user of the SaaS platform
  I want to authenticate using OAuth providers
  So that I can access my account securely

  Scenario: Display login page with OAuth options
    Given I am on the login page
    Then I should see a "Sign in with Google" button
    And I should see a "Sign in with Instagram" button

  Scenario: Successfully login with Google OAuth
    Given I am on the login page
    When I click the "Sign in with Google" button
    And I complete the Google OAuth flow
    Then I should be redirected to the dashboard
    And I should see my profile information

  Scenario: Successfully login with Instagram OAuth
    Given I am on the login page
    When I click the "Sign in with Instagram" button
    And I complete the Instagram OAuth flow
    Then I should be redirected to the dashboard
    And I should see my Instagram account connected

  Scenario: Cancel OAuth flow
    Given I am on the login page
    When I click the "Sign in with Google" button
    And I cancel the OAuth flow
    Then I should remain on the login page
    And I should see an error message

  Scenario: Logout successfully
    Given I am logged in
    When I click the logout button
    Then I should be redirected to the login page
    And my session should be cleared
