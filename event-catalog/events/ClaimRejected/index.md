---
name: ClaimRejected
version: 1.0.0
summary: |
  Event represents when a claim request from customer is rejected.
producers:
    - Claims Service
consumers:
    - Notifications Service
owners:
    - dboyne    
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event represents when a claim request from customer is rejected.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />