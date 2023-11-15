---
name: CustomerDocumentUpdated
version: 1.0.0
summary: |
  Event represents when a customer document is updated
producers:
    - Customer Service
consumers:
    - Notifications Service
owners:
    - dhiraj
    - mythili
---

### Details

The Customer Service triggers CustomerDocumentUpdated event when the customers document (Driving license) is uploaded successfully. The Notifications Service utilizes this event to update the customer regarding the status of their request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />