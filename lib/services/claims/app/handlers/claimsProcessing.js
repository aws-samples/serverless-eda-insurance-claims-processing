// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const crypto = require("crypto");
const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

// Create Claims Lambda function polling from Claims queue,
// Verify FNOL information
// Validate Policy (start and end date)
// Validate Personal Information
// Persist in Claims Table (PK = UUID, SK = Customer|<customerId>)
// put events (Claim.Accepted) (should provide a pre-signed url to upload photos of damaged car)
exports.handler = async function (event, context) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Claims Processing Lambda Function Called");

  try {
    const {
      "detail-type": detailType,
      detail: {
        incident: {
          occurrenceDateTime,
          fnolDateTime,
          location: { country, state, city, zip, road },
          description,
        },
        policy: { id },
        personalInformation: {
          customerId,
          driversLicenseNumber,
          isInsurerDriver,
          licensePlateNumber,
          numberOfPassengers,
        },
        policeReport: { isFiled, reportOrReceiptAvailable },
        otherParty: { insuranceId, insuranceCompany, firstName, lastName },
      },
    } = JSON.parse(event.Records[0].body);

    if (detailType !== "Claim.Requested") {
      console.log("Unsupported Detail Type: " + event.detailType);
      return;
    }

    const eventPayload = {
      source: "claims.service",
      detailType: "",
      detail: { customerId },
    };

    // Get Policies from customer Id
    const queryCommand = new GetItemCommand({
      TableName: process.env.POLICY_TABLE_NAME,
      Key: marshall({
        PK: id,
        SK: `Customer|${customerId}`,
      }, { removeUndefinedValues: true }),
    });

    const { Item } = await docClient.send(queryCommand);
    console.log("Results from DDB Query: " + JSON.stringify(Item));

    const policy = unmarshall(Item);
    console.log("Policies from FNOL data: " + JSON.stringify(policy));

    const policyStartDate = new Date(policy.startDate);
    const policyEndDate = new Date(policy.endDate);
    const incidentDate = new Date(occurrenceDateTime);
    const isValidPolicy =
      policyStartDate < incidentDate && incidentDate < policyEndDate;

    if (!isValidPolicy) {
      eventPayload.detailType = "Claim.Rejected";
      eventPayload.detail = {
        ...eventPayload.detail,
        message:
          "Policy provided for customer does not match or the incident happened outside policy active period",
      };

      await putEvents(eventPayload);
      return;
    }

    const isValidPersonalInformation = await verifyPersonalInformation(
      customerId,
      driversLicenseNumber
    );

    if (!isValidPersonalInformation) {
      eventPayload.detailType = "Claim.Rejected";
      eventPayload.detail = {
        ...eventPayload.detail,
        message: "Personal information (Driver's License) does not match",
      };

      await putEvents(eventPayload);
      return;
    }

    const claimId = crypto.randomUUID();

    // Else persist Claims information
    const claimPutItemCommand = new PutItemCommand({
      TableName: process.env.CLAIMS_TABLE_NAME,
      Item: marshall({
        PK: claimId,
        SK: `Customer|${customerId}`,
        occurrenceDateTime,
        fnolDateTime,
        country,
        state,
        city,
        zip,
        road,
        description,
        driversLicenseNumber,
        isInsurerDriver,
        licensePlateNumber,
        numberOfPassengers,
        policeReportFiled: isFiled,
        policeReportReceiptAvailable: reportOrReceiptAvailable,
        otherPartyInsuranceId: insuranceId,
        otherPartyInsuranceCompany: insuranceCompany,
        otherPartyFirstName: firstName,
        otherPartyLastName: lastName,
        policyId: id,
      }, { removeUndefinedValues: true }),
    });

    const result = await docClient.send(claimPutItemCommand);

    //Create pre-signed url to upload car damage pictures
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `customers/${customerId}/documents/claims/${claimId}/damagedCar.jpg`,
      ContentType: "application/jpg",
    });

    const uploadCarDamageUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600,
    });

    eventPayload.detailType = "Claim.Accepted";
    eventPayload.detail = {
      ...eventPayload.detail,
      claimId,
      uploadCarDamageUrl,
      message: "Claim Information has been accepted",
    };

    await putEvents(eventPayload);
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 201,
    body: "Claim Accepted",
  };
};

async function putEvents(eventPayload) {
  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        DetailType: eventPayload.detailType,
        Source: eventPayload.source,
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify(eventPayload.detail),
      },
    ],
  });

  return await ebClient.send(putEventsCommand);
}

async function verifyPersonalInformation(customerId, driversLicenseNumber) {
  const customerDocumentCommand = new GetItemCommand({
    TableName: process.env.CUSTOMER_TABLE_NAME,
    Key: marshall({
      PK: customerId,
      SK: "DRIVERS_LICENSE",
    }, { removeUndefinedValues: true }),
    ProjectionExpression: "DOCUMENT_NUMBER",
  });

  const { Item } = await docClient.send(customerDocumentCommand);
  let item;
  if (Item) item = unmarshall(Item);
  console.log("Drivers License from Customer Table: " + JSON.stringify(item));

  return (
    item &&
    driversLicenseNumber &&
    item.DOCUMENT_NUMBER === driversLicenseNumber
  );
}
