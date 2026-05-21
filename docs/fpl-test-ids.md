# FPL test IDs

Real FPL accounts used for manual + prod testing of SimplyFPL. These are real entry/league IDs (semi-public via FPL standings and URLs), distinct from the synthetic e2e fixtures.

## Manager entry IDs

| Entry ID  | Manager        | Team   | Notes                                       |
| --------- | -------------- | ------ | ------------------------------------------- |
| `219895`  | Sam J          | #1     | Primary manual-test team (Ireland), ~43k OR |
| `4173513` | Cameron Hearne | gunmen | Second entry in the H2H prod test URL       |

H2H prod test URL: `https://simplyfpl.com/h2h/219895/4173513`

## Sam's leagues (entry `219895`)

Private invitational mini-leagues — small, good for league-table and season-archive tests:

| League ID | Members | Name                                                             |
| --------- | ------- | ---------------------------------------------------------------- |
| `936326`  | ~50+    | Armchair Football Fanatics — used for the 2025/26 season archive |
| `1029266` | 8       | HubSpot                                                          |
| `436348`  | 6       | OFA Admins League                                                |
| `1056663` | 2       | No Sams Club                                                     |
| `1057640` | 2       | Jts Vegas Hand Shandy                                            |
| `1058082` | 2       | Sam/Conor                                                        |

Global / system leagues (huge — never use for bounded archives): `314` Overall, `124` Ireland.

## Synthetic e2e fixtures (NOT real)

In `apps/web/e2e/fixtures/fpl/` — committed test data, not real accounts:

- Entries: `1` "FPL Test FC", `2` "FPL Rival FC", `1001` Seán O'Hara, `1002` Lukas Müller
- Leagues: `314` "Overall" (stands in for the global league), `1001` "Ireland", `200001` "The Office Bantz"
