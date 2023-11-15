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
    - dhiraj
    - mythili
---

### Details

The Signup API triggers the CustomerSubmitted event when a request is made to add a new customer. The Customer Service subscribes to this event and proceeds to process the request for adding a new customer.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />