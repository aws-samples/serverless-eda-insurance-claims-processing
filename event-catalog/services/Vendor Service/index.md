---
name: Vendor Service
summary: |
  The Vendor Service figures out a temporary rental car for the policyholder once the settlement process has been completed.
owners:
    - dhiraj
    - mythili
repository:
  language: JavaScript
  url: https://github.com/aws-samples/serverless-eda-insurance-claims-processing/tree/main/lib/services/vendor
---

Vendor Service Workflow
1. Vendor Service subscribes to `Settlement.Finalized` event. When a settlement is finalized, the vendor service figures out a temporary rental car for the insurer. 
2. Ideally, the vendor domain/service would call 3rd party car rental service APIs to get quote on the rental cost. Based on its business logic, it decides which rental car option will be optimal for the insurer. 
3. Vendor service is built using a NodeJS Express application running on an EKS Spot cluster. EKS pods scale up and down based on an SQS queue depth using KEDA scaler. This shows that event-driven applications can be integrated with container workloads seamlessly that can run on EKS too.

<NodeGraph />