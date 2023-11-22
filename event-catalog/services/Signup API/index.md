---
name: Signup API
summary: |
  The Signup API emits the `Customer.Submitted` event when the customer submit the onboarding request.
owners:
    - dhiraj
    - mythili
repository:
  language: JavaScript
  url: https://github.com/aws-samples/serverless-eda-insurance-claims-processing/tree/main/lib/services/customer
---

Signup API workflow
When a customer submits the request for onboarding from frontend, the Signup API emits a `Customer.Submitted` event which will be processed by Customer Service. 

<NodeGraph />