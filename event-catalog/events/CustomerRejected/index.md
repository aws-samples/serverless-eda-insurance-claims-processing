---
name: CustomerRejected
version: 1.0.0
summary: |
  Event to hold the information on the customers rejection.
producers:
    - Customer Service
consumers:
    - Notifications Service
owners:
    - dboyne
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event to hold the information on the customers rejection.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />