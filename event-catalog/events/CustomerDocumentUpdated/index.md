---
name: CustomerDocumentUpdated
version: 1.0.0
summary: |
  Event represents when a customer document is updated
producers:
    - Customer Service
consumers:
    - Notifications Service
owners:
    - dboyne
---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is triggered when the customers document is uploaded successfully.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />