---
name: SettlementFinalized
version: 1.0.0
summary: |
  Event represents when the settlement is finalized based on the claim documents.
producers:
    - Settlement Service
consumers:
    - Notifications Service
owners:
    - dboyne
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event represents when the settlement is finalized based on the claim documents.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />