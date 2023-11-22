---
name: FraudDetected
version: 1.0.0
summary: |
  Event represents when the fraud is detected.
producers:
    - Fraud Service
consumers:
    - Notifications Service
owners:
    - dhiraj
    - mythili
---

### Details

The Fraud Service triggers FraudDetected when fraud is detected in the customer document uploaded. The Notifications Service utilizes this event to update the customer regarding the status of their request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />