// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { Consumer } = require('sqs-consumer');

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const queueURL = process.env.VENDOR_QUEUE_URL;
const eventSource = process.env.VENDOR_EVENT_SOURCE
const detailType = process.env.VENDOR_EVENT_TYPE

const app = Consumer.create({
  queueUrl: queueURL,
  handleMessage: async (message) => {
    let event = JSON.parse(message.Body);
    console.log(event);

    const { claimId, customerId } = event.detail;
    const vendorMessage =
      `Multiple car rental vendors were contacted for claim with id ${claimId}. Enterprise Rental car has been finalized for you to temporarily use until your car is repaired.`

    // Sent processed messages back to EventBridge bus
    try {
      const putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            EventBusName: process.env.BUS_NAME,
            Source: eventSource,
            DetailType: detailType,
            Detail: JSON.stringify({
              customerId,
              vendorMessage
            }),
          },
        ],
      });

      const data = await ebClient.send(putEventsCommand);
      console.log("Success", data.Entries);
    } catch (error) {
      console.log("Error", error);
    }
  }
});

app.on('error', (err) => {
  console.error(err.message);
});

app.on('processing_error', (err) => {
  console.error(err.message);
});

app.start();