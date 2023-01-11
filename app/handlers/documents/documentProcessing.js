// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  TextractClient,
  AnalyzeIDCommand,
} = require("@aws-sdk/client-textract");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const {
  RekognitionClient,
  DetectLabelsCommand,
} = require("@aws-sdk/client-rekognition");
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const textractClient = new TextractClient({ region: process.env.AWS_REGION });
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
});

// Process DL

// Process Car Pictures

// Process Damage Car Picture

// Put Events (Event Types are based on results and type of document processed)
// Insurance.Document.Processed
// Claims.Document.Processed

const DocumentTypes = {
  DL: "DRIVERS_LICENSE",
  CAR: "CAR",
};

exports.handler = async function (event, context) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Document Processing Lambda Function Called");

  const {
    detail: {
      bucket: { name },
      object: { key },
    },
  } = event;
  const customerId = key.split("/")[1];
  let result = "Document Type Not Supported";

  // Classify the type of document before analyzing
  const detectLabelsCommand = new DetectLabelsCommand({
    MinConfidence: 97,
    MaxLabels: 5,
    Image: {
      S3Object: {
        Bucket: name,
        Name: key,
      },
    },
  });

  try {
    const rekResponse = await rekognitionClient.send(detectLabelsCommand);
    console.log("Detect Labels Response: " + JSON.stringify(rekResponse));

    const documentType = rekResponse.Labels.some(
      (label) => label.Name === "Car"
    )
      ? DocumentTypes.CAR
      : rekResponse.Labels.some((label) => label.Name === "Driving License")
      ? DocumentTypes.DL
      : "";

    console.log("Document Type: " + documentType);

    switch (documentType) {
      case DocumentTypes.DL:
        result = await analyzeIdDocument(name, key, customerId, documentType);
        break;
      case DocumentTypes.CAR:
        result = await analyzeCarPhoto(name, key, customerId, documentType);
        break;
      default:
        break;
    }
  } catch (error) {
    console.log(error);
  }

  return result;
};

async function analyzeIdDocument(bucketName, key, customerId, documentType) {
  console.log("Analyzing " + documentType);

  const analyzeIdCommand = new AnalyzeIDCommand({
    DocumentPages: [
      {
        S3Object: {
          Bucket: bucketName,
          Name: key,
        },
      },
    ],
  });

  const textractResponse = await textractClient.send(analyzeIdCommand);
  console.log(JSON.stringify(textractResponse));

  const analyzedFieldAndValues =
    textractResponse.IdentityDocuments[0].IdentityDocumentFields.filter(
      (val) => val.ValueDetection.Confidence > 95
    )
      .map((val) => ({ [val.Type.Text]: val.ValueDetection.Text }))
      .reduce((obj, item) => {
        const key = Object.keys(item)[0];
        return {
          ...obj,
          [key]: item[key],
        };
      }, {});

  console.log(
    "Analyzed Fields and Values: " + JSON.stringify(analyzedFieldAndValues)
  );

  // Put Events with analyzed data and the customer key
  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Document.Processed",
        Source: "document.service",
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify({
          customerId,
          documentType,
          analyzedFieldAndValues,
        }),
      },
    ],
  });

  const response = await ebClient.send(command);
  return response;
}

async function analyzeCarPhoto(bucketName, key, customerId, documentType) {
  // TODO: Custom Labels [color of the car, etc]

  // Put Events with analyzed data and the customer key
  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Document.Processed",
        Source: "document.service",
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify({
          customerId,
          documentType,
          // analyzedValues
        }),
      },
    ],
  });

  return await ebClient.send(command);
}
