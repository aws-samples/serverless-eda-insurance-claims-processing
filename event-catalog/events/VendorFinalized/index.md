---
name: VendorFinalized
version: 1.0.0
summary: |
  Event represents when the settlement is finalized based on the claim documents.
producers:
    - Vendor Service
consumers:
    - Notifications Service
owners:
    - dhiraj
    - mythili
---

### Details

The VendorFinalized event get triggered when the vendor Service figures out a temporary rental car for the customer after the settlement is finalized.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />