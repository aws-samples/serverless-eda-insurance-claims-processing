---
name: AWS S3 Event Notification
summary: |
  Amazon S3 sends event notifications to Eventbridge when the customer document is uploaded to S3 bucket
owners:
    - dhiraj
    - mythili
repository:
  url: https://github.com/aws-samples/serverless-eda-insurance-claims-processing/tree/main/lib/services/customer
---

AWS S3 Event Notification
1. Amazon S3 can send events to Amazon EventBridge when the customer document is uploaded to S3 bucket. After EventBridge is enabled, all events related to objects are sent to EventBridge. 
2. Once the images are uploaded to the policy documents S3 bucket using pre-signed URLs provided during the signup process, Amazon S3 triggers an `Object.Created` event to the default EventBridge event bus.
3. An EventBridge rule matches the Object.Created event type and invokes the document processing Step Functions workflow that is used to classify and analyze the image in the S3 bucket.
4. Once the document processing is complete, the Step Functions workflow emits a `Document.Processed` event to the custom event bus with data from the analysis added to the event payload.

<NodeGraph />