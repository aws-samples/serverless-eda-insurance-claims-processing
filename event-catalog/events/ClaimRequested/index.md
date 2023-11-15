---
name: ClaimRequested
version: 1.0.0
summary: |
  Event represents when a claim is requested.
producers:
    - FNOL API
consumers:
    - Claims Service
owners:
    - dhiraj
    - mythili

---

### Details

The FNOL API initiates ClaimRequested event upon a customer's submission of a claim for an incident or accident. The Claim Service subscribes to this event and process the claim request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />