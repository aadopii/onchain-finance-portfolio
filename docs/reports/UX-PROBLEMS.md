# UX problems found since the last package update

Context: this log covers the work after the package was republished (versions 2.2.0-315 and 2.2.0-316, blueprint portfolio-v11). It records every place the flow made a real user do work the product should have done, or led them somewhere wrong.

The eight problems below are ordered roughly by where they hit in the journey.

---

## 1. Updating the package does not update the project

What happened: after running the global install, the CLI updated but the project kept its old scripts and skills. The agent had to copy files out of the global package by hand, then re-download the blueprint release and diff it against the project to find what changed.

Why it hurts: a normal user has no way to know this step exists. They update, see a new version number, and their agent still behaves the old way. The fix the agent ran is a multi-step manual process, not a command.

Suggested fix: one command that syncs a project to the current package and blueprint in a single step. A real `update` path, not a copy and diff ritual.

---

## 2. A leftover process stole the dashboard port and broke signing

What happened: an orphaned Sailor process from a deleted copy of the same project folder kept holding the project's port. The fresh dashboard silently opened on a different port, but every signing link still printed the old one. Every signature timed out, and three deploy attempts failed before the cause was found.

Why it hurts: the user saw "waiting for signature" with a link that led nowhere. There was no error telling them the port was wrong or that an old process was running. This is the kind of failure that reads as "the product is broken" with no explanation.

Suggested fix: when a port is taken, detect it and either clean up the orphan or print the actual port in the signing link. Never let a signing link point at a port the dashboard is not on.

---

## 3. The shipped swap permissions and the runtime disagree on which swap to use

What happened: the portfolio runtime calls one swap function (the multi-hop form), but the shared swap permissions only recognize a different, single-hop form. A mandate built from the shared templates would deny every trade the runtime sends.

Why it hurts: this is a blueprint bug. The runtime gained Aerodrome support in v11, but the swap permissions did not catch up. A user who follows the default path ends up with a mandate that looks complete and simulates clean, then silently blocks every buy and rebalance.

Suggested fix: extend the shared swap permissions to recognize the multi-hop swap function, or ship a swap permission that matches what the runtime actually calls. The runtime and the permission templates must be tested against each other as one unit.

---

## 4. Writing a custom permission by hand is fragile

What happened: to work around problem 3, the agent wrote a custom swap permission. The first version had a wrong data layout. Its own unit tests passed, because the test data was encoded the same wrong way. The live simulation, which uses the real encoding, caught it. This forced a redeploy and a second round of owner signatures.

Why it hurts: the user paid gas and signed twice for one permission. More importantly, the only reason this path existed at all is problem 3. A user should never have to hand-author a swap permission for a standard portfolio.

Suggested fix: solve problem 3 first. A shared, tested swap permission removes this entire failure mode.

---

## 5. Replacing a bad permission leaves clutter the tools cannot clean

What happened: after redeploying the corrected permission, the old deploy records (never registered, harmless but dead) stayed in the tracked list. The list and the sign command kept showing them, and there is no command to remove an unregistered record. The agent had to edit the state file by hand.

Why it hurts: the user's project view shows six permissions when four are real, and the sign step tries to register the dead ones. Confusing state with no cleanup tool.

Suggested fix: a command to forget or drop an unregistered deploy record, or make the sign step skip records that were never registered.

---

## 6. The token approvals have no tooling at all

What happened: the safe default for the portfolio (the owner sets one approval sized to a year) requires roughly ten separate token approvals across two chains. There is no dashboard button, no CLI command, and no generated batch. The user has to build each approval by hand in the Safe app's transaction builder.

Why it hurts: this is the single biggest remaining friction. The product promise is that the user gives a portfolio and the agent handles the plumbing. The approval setup is the exact opposite: manual, error-prone, and split across two chains. Ten transactions for a step the user should be able to do in one.

Suggested fix: generate the approval batch as part of onboarding, ideally one multisend per chain, with the exact tokens, spenders, and amounts pre-filled. At minimum, a paste-ready list.

---

## 7. The liquidity resolver reported real liquidity as suspicious

What happened: one asset's real pool (millions in liquidity, millions in daily volume) was flagged as zero-volume and suspicious by a stale map entry. The agent initially steered the user to the wrong chain based on that, and only a manual live lookup proved the correct chain.

Why it hurts: the resolver is the agent's source of truth for where liquidity lives. When it is wrong, the onboarding makes a wrong routing decision and the user ends up with a worse setup (thinner liquidity, higher cost) than they should have.

Suggested fix: when a map entry is stale or shows zero volume, fall through to a live scan automatically instead of reporting "suspicious." The map should be a positive cache, never a source of false negatives.

---

## 8. "Swap ready" did not mean the agent could actually swap

What happened: an asset was reported swap-ready, but the runtime could not execute its venue until v11 added support. The agent's early guidance was based on the resolver's swap-ready flag, not on what the runtime could actually run, which led to a wrong recommendation that had to be corrected later.

Why it hurts: the resolver and the runtime spoke different languages about the same asset. The user got guidance, then a correction, which reads as the product not knowing its own answer.

Suggested fix: separate "has liquidity" from "the runtime can execute this venue." Never show "swap-ready" for a venue the runtime does not support. The resolver should answer the runtime's real capability, not a broader liquidity question.

---

## Summary of the highest-leverage fixes

1. One command to sync a project after a package update (problem 1).
2. Make the swap permissions and the runtime match, tested together (problems 3 and 4).
3. Generate the token approval batch at onboarding (problem 6).
4. The resolver falls through to live data instead of reporting stale "suspicious" results (problems 7 and 8).
5. Clean up orphaned processes and always print the real port in signing links (problem 2).
