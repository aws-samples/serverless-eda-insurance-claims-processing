---
name: ClaimRequested
version: 1.0.0
summary: |
  Event represents when a claim is requested.
producers:
    - FNOL API
consumers:
    - Claims Service
owners:
    - dboyne
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event represents when a claim is requested. 

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />