---
name: DocumentProcessed
version: 1.0.0
summary: |
  Event represents when the customer documennt is succesfully processed.
producers:
    - Documents Service
consumers:
    - Fraud Service
    - Notifications Service
owners:
    - dhiraj
    - mythili
---

### Details

The Document Service triggers DocumentProcessed event upon completing the processing of customer documents.  The Fraud Service consumes this event and analyzes the document to identify the potential fraud. The Notifications Service also utilizes this event to update the customer regarding the status of their request.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />