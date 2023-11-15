---
name: ClaimRejected
version: 1.0.0
summary: |
  Event represents when a claim request from customer is rejected.
producers:
    - Claims Service
consumers:
    - Notifications Service
owners:
    - dhiraj
    - mythili

---

### Details

When a claim gets rejected along with detailed rejection messaging, the Claims Service initiates ClaimRejected event. The Notifications Service utilizes this event to update the customer regarding the status of their claim.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />