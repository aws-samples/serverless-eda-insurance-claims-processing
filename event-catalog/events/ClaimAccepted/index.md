---
name: ClaimAccepted
version: 1.0.0
summary: |
  Event represents when a claim request from customer is verified and accepted for further processing.
producers:
    - Claims Service
consumers:
    - Notifications Service
owners:
    - dhiraj
    - mythili

---

### Details

The Claims Service triggers ClaimAccepted event when a claim successfully passes validation and is accepted for further processing. The Notifications Service utilizes this event to inform the customer about the updated status of their claim. 

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />