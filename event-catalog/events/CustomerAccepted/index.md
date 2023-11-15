---
name: CustomerAccepted
version: 1.0.0
summary: |
  Event represents when the request for new customer is accepted.
producers:
    - Customer Service
consumers:
    - Notifications Service
owners:
    - dhiraj
    - mythili
---

### Details

The Customer Service triggers CustomerAccepted event upon the successful processing and acceptance of a new customer request. The Notifications Service utilizes this event to update the customer regarding the status of their request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />