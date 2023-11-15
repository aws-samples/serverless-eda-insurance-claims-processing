---
name: SettlementFinalized
version: 1.0.0
summary: |
  Event represents when the settlement is finalized based on the claim documents.
producers:
    - Settlement Service
consumers:
    - Vendor Service
    - Notifications Service
owners:
    - dhiraj
    - mythili
---

### Details

Event represents when the settlement is finalized based on the claim documents. The Vendor service then consumes this event to fingure out the temporary rental car. The Notifications Service also utilizes this event to update the customer regarding the status of their request. 

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />