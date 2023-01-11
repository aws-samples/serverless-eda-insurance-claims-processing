// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Get Message from SQS
// Validate email, ssn, address
// Persist Customer in database upon successful validation
// Create S3 Pre-signed URL to upload DL and Car pictures
// Put Events (Customer.Accepted)

const {
  DynamoDBClient,
  PutItemCommand,
  BatchWriteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const crypto = require("crypto");
const docClient = new DynamoDBClient();

const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

exports.handler = async function (event, context) {
  // TODO: Eventually below logic will move to Sync Express workflow. Avoiding premature optimization.

  // {
  //   "firstname": "John",
  //   "lastname": "Miller",
  //   "identity": {
  //     "email": "jmiller@example.com",
  //     "ssn": "123-45-6789"
  //   },
  //   "address": {
  //     "street": "123 Main St",
  //     "city": "Columbus",
  //     "state": "OH",
  //     "zip": "43219"
  //   },
  //   "cars": [
  //     {
  //       "make": "Honda",
  //       "model": "Accord",
  //       "color": "Silver",
  //       "type": "Sedan",
  //       "year": 2012,
  //       "mileage": 100000,
  //       "vin": ""
  //     }
  //   ]
  // }

  console.log("Message from SQS: " + JSON.stringify(event));
  const ebEvent = JSON.parse(event.Records[0].body);

  console.log("Actual EB Payload: " + JSON.stringify(ebEvent));
  const { cognitoIdentityId, data } = ebEvent.detail;
  const payload = JSON.parse(data);
  console.log("Actual Detail Payload: " + JSON.stringify(payload));

  const { firstname, lastname, cars } = payload;

  // Verify Identity - email, SSN, phone number, address, etc

  // Address
  const { street, city, state, zip } = payload.address;
  console.log(`Address information: ${street}, ${city}, ${state} - ${zip}`);

  const addressApproved = [street, city, state, zip].every(
    (i) => i?.trim().length > 0
  );

  const { ssn, email } = payload.identity;
  console.log(`SSN: ${ssn} and email: ${email}`);

  const identityApproved = ssnRegex.test(ssn) && emailRegex.test(email);

  if (!addressApproved || !identityApproved) {
    // Eventually, put Event about validation failure
    const command = new PutEventsCommand({
      Entries: [
        {
          DetailType: "Customer.Rejected",
          Source: "customer.service",
          EventBusName: process.env.BUS_NAME,
          Detail: JSON.stringify({
            error: "Address or Identity Validation Failed",
          }),
        },
      ],
    });

    try {
      const response = await ebClient.send(command);
    } catch (error) {
      console.error(error);
    }

    return "Customer Rejected";
  }

  // TODO: Check for idempotency. If email address is already present, the customer has already been signed up.
  // TODO: In that case, PutEvents Customer.Duplicate.Identified

  const customerId = crypto.randomUUID();

  // Create customer in DDB
  const customerRequests = [
    {
      PutRequest: {
        Item: marshall({
          PK: customerId,
          SK: email,
          firstname,
          lastname,
          ssn,
          street,
          city,
          state,
          zip,
        }),
      },
    },
    {
      PutRequest: {
        Item: marshall({
          PK: customerId,
          SK: "COGNITO_IDENTITY_ID",
          cognitoIdentityId,
        }),
      },
    },
  ];

  // Create Policy (Eventually this can go to Policy Service)
  const policyRequests = createPolicies(cars, customerId);

  const result = await docClient.send(
    new BatchWriteItemCommand({
      RequestItems: {
        [process.env.CUSTOMER_TABLE_NAME]: customerRequests,
        [process.env.POLICY_TABLE_NAME]: policyRequests,
      },
    })
  );

  // Create pre-signed URL
  const [driversLicenseImageUrl, carImageUrl] = await Promise.all(
    ["dl", "car"].map(async (id) => {
      const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `customers/${customerId}/documents/${id}.jpg`,
        ContentType: "application/jpg",
      });
      return await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: 3600,
      });
    })
  );

  // Put Events with pre-signed URL
  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Customer.Accepted",
        Source: "customer.service",
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify({
          customerId,
          driversLicenseImageUrl,
          carImageUrl,
        }),
      },
    ],
  });

  try {
    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 201,
    body: "Customer Accepted",
  };
};

function createPolicies(cars, customerId) {
  if (!Array.isArray(cars) || !cars.length) {
    console.log("No cars to add to policy");
    return;
  }

  const putRequests = cars.map(
    ({ make, model, color, type, year, mileage, vin }) => {
      const policyId = crypto.randomUUID();
      const startDate = new Date();
      const futureDate = new Date();
      futureDate.setMonth(startDate.getMonth() + 6);

      return {
        PutRequest: {
          Item: marshall({
            PK: policyId,
            SK: `Customer|${customerId}`,
            make,
            model,
            color,
            type,
            year,
            mileage,
            vin,
            startDate: startDate.toISOString(),
            endDate: futureDate.toISOString(),
          }),
        },
      };
    }
  );

  return putRequests;
}
