---
name: Settlement Service
summary: |
  Settlement service provides the customer and a repair vendor with their assessment details and finalizes on a settlement
owners:
    - dhiraj
    - mythili
repository:
  language: Java
  url: https://github.com/aws-samples/serverless-eda-insurance-claims-processing/tree/main/lib/services/settlement
---

Settlement Service Workflow
1. The Settlement service is built using Spring Boot application running on ECS Fargate. This shows that event-driven applications can be integrated with container workloads seamlessly.
2. When the customer files a claim and uploads damaged car images, and the application detects no document fraud, the settlement service subscribes to `Fraud.Not.Detected` event and applies its business logic. 
3. The settlement service emits an `Settlement.Finalized` event back which provides the customer and a repair vendor with their assessment details and finalizes on a settlement

<NodeGraph />