---
name: FNOL API
summary: |
  The FNOL API emits the `Claim.Requested` event when the customer submit the new clain request from front end.
owners:
    - dhiraj
    - mythili
repository:
  language: JavaScript
  url: https://github.com/aws-samples/serverless-eda-insurance-claims-processing/tree/main/lib/services/claims
---

FNOL API workflow
1. Once the new customer is onboadrd successfully, now the customer can file an insurance claim. The first step in the claims process is First Notice of Loss (FNOL).
The customer submits the details of the incident (date of incident, number of parties involved, location of incident, etc.) through the frontend application.
2. This claim submission invokes the FNOL API, which emits a `Claim.Requested` event. 

<NodeGraph />