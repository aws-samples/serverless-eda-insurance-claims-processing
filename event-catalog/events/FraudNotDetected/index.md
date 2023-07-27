---
name: FraudNotDetected
version: 1.0.0
summary: |
  Event represents when the fraud is not detected.
producers:
    - Fraud Service
consumers:
    - Notifications Service
owners:
    - dboyne
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event represents when the fraud is not detected.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />