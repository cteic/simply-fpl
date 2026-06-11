Feature: Pro status determination

  Scenario: Active Pro with no expiry is recognised as Pro
    Given a profile with is_pro true and no pro_until date
    When I compute the Pro status
    Then the result should be Pro

  Scenario: Active Pro within expiry window is recognised as Pro
    Given a profile with is_pro true and pro_until set to a future date
    When I compute the Pro status
    Then the result should be Pro

  Scenario: Expired Pro subscription is not recognised as Pro
    Given a profile with is_pro true and pro_until set to a past date
    When I compute the Pro status
    Then the result should not be Pro

  Scenario: Free user is never recognised as Pro
    Given a profile with is_pro false and no pro_until date
    When I compute the Pro status
    Then the result should not be Pro
