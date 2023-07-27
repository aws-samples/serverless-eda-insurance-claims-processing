---
name: DocumentProcessed
version: 1.0.0
summary: |
  Event represents when the customer documennt is succesfully processed.
producers:
    - Documents Service
consumers:
    - Notifications Service
owners:
    - dboyne
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event represents when the customer documennt is succesfully processed.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />