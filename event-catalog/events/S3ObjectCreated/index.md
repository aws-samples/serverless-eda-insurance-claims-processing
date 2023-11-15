---
name: S3ObjectCreated
version: 1.0.0
summary: |
  Event holds the information on customer document upload into s3.
producers:
    - AWS S3 Event Notification
consumers:
    - Documents Service
owners:
    - dhiraj
    - mythili
---

### Details

Event holds the information on customer document upload into s3. The Documents Service consumes this event and processes the document. 

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />