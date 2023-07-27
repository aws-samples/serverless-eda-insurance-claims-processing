---
name: Fraud Service
summary: |
  Fraud Service to verify if the uploaded document is valid 
owners:
    - dboyne
repository:
  language: JavaScript
  url: https://github.com/aws-samples/serverless-eda-insurance-claims-processing/tree/main/lib/services/fraud
---
Fraud Detection
1. The fraud service accesses Customer and Claims tables to compare data from the processed document versus data provided by the customer during on-boarding. 
2. If there’s a mismatch then the fraud service emits a Fraud.Detected event with the fraud type included in the event payload back to the custom event bus. 
3. When no document fraud is detected, the service emits a Fraud.Not.Detected event.

<NodeGraph />