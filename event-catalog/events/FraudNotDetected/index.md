---
name: FraudNotDetected
version: 1.0.0
summary: |
  Event represents when the fraud is not detected.
producers:
    - Fraud Service
consumers:
    - Notifications Service
    - Settlement Service
owners:
    - dhiraj
    - mythili
---

### Details

The Fraud Service triggers FraudDetected when the customer document is valid.  The Settlement service subscribes to this event and applies its business logic to finalize the settlement. The Notifications Service also utilizes this event to update the customer regarding the status of their request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />