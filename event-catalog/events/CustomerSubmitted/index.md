---
name: CustomerSubmitted
version: 1.0.0
summary: |
  Event represents when an customer request is submitted
producers:
    - Signup API
consumers:
    - Customer Service
owners:
    - dboyne

---

<Admonition>When firing this event make sure you set the `id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

Event represents when an customer request is submitted

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />