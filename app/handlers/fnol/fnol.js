// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

exports.handler = async function (event, context) {
  console.log(JSON.stringify(event, 2, null));
  console.log("FNOL Lambda Function Called");

  const {
    incident: {
      occurrenceDateTime,
      fnolDateTime,
      location: { country, state, city, zip, road },
      description,
    },
    policy: { id },
    personalInformation: {
      insurerId,
      driversLicenseNumber,
      isInsurerDriver,
      licensePlateNumber,
      numberOfPassengers,
    },
    policeReport: { isFiled, reportOrReceiptAvailable },
    otherParty: { insuranceId, insuranceCompany, firstName, lastName },
  } = JSON.parse(event.body);

  // Extra validation if needed

  // PutEvents (detailType: Claim.Requested)
  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Claim.Requested",
        Source: "fnol.service",
        EventBusName: process.env.BUS_NAME,
        Detail: event.body,
      },
    ],
  });

  try {
    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: "Claim Requested",
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
