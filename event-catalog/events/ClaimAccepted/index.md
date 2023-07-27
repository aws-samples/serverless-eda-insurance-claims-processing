---
name: ClaimAccepted
version: 1.0.0
summary: |
  Event represents when a claim request from customer is verified and accepted for further processing.
producers:
    - Claims Service
consumers:
    - Notifications Service
owners:
    - dboyne

---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition> 

### Details

This event is triggered when a claim is accepted. 

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />