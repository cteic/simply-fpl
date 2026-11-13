Feature: Legal content disclosures

  The App Store, Play Store and Stripe each check that the privacy policy
  names every third party that handles user data and gives a way to reach
  us. These scenarios keep those disclosures from silently dropping out.

  Scenario: The privacy policy names every data processor and a contact
    Given the privacy policy content
    Then it mentions each of "Supabase, Stripe, PostHog, Anthropic, Cloudflare"
    And it gives the support email address
    And it explains how to delete an account

  Scenario: The terms name Irish law, the payment provider and the accuracy limit
    Given the terms of service content
    Then it mentions each of "Ireland, Stripe"
    And it says live rank figures are estimates
    And it gives the support email address

  Scenario: The support page gives a contact and a short FAQ
    Given the support FAQ content
    Then it has between 3 and 5 entries
    And every entry has a question and an answer
    And the contact instructions give the support email address
