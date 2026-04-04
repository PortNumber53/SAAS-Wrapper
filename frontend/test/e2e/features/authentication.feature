Feature: User Authentication
  As a user of the SaaS platform
  I want to authenticate using OAuth providers
  So that I can access my account securely

  Scenario: Display login page with OAuth options
    Given I am on the login page
    Then I should see a "Login" button
    And I should see a "Sign Up" button

  Scenario: Login button triggers Google OAuth popup
    Given I am on the login page
    When I click the "Login" button
    Then a popup window should open for OAuth

  Scenario: Sign Up button triggers Google OAuth popup
    Given I am on the login page
    When I click the "Sign Up" button
    Then a popup window should open for OAuth

  Scenario: Cancel OAuth flow
    Given I am on the login page
    When I click the "Login" button
    And I cancel the OAuth flow
    Then I should remain on the login page

  Scenario: Logout successfully
    Given I am logged in
    And API requests are intercepted for testing
    When I navigate to the dashboard
    And I click the logout button
    Then I should be redirected to the login page
