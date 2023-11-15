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
    - dhiraj
    - mythili
---

### Details

The Customer Service triggers CustomerRejected event when the new customer request is rejected due to validation failure. The Notifications Service utilizes this event to update the customer regarding the status of their request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />