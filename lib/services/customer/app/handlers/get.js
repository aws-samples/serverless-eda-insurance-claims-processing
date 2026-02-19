// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async function (event, context) {
  // console.log(JSON.stringify(event, 2, null));
  let cognitoIdentityId;
  
  // Option 1: From API Gateway request context (existing React app flow)
  if (event.requestContext?.identity?.cognitoIdentityId) {
    cognitoIdentityId = event.requestContext.identity.cognitoIdentityId;
  }
  // Option 2: From custom header (new voice agent flow)
  else if (event.headers?.['X-Cognito-Identity-Id']) {
    cognitoIdentityId = event.headers['X-Cognito-Identity-Id'];
  }
  
  if (!cognitoIdentityId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Cognito Identity ID not found" }),
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      isBase64Encoded: false,
    };
  }
  
  const findCustomerParams = {
    FilterExpression: "SK = :sk AND cognitoIdentityId = :identifier",
    ExpressionAttributeValues: {
      ":sk": { S: "COGNITO_IDENTITY_ID" },
      ":identifier": { S: cognitoIdentityId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  let custDetails, driversLicense = {};
  const { Items: idRecord } = await ddbClient.send(
    new ScanCommand(findCustomerParams)
  );

  if (idRecord && idRecord.length > 0) {
    const uItem = unmarshall(idRecord["0"]);
    const PK = uItem.PK;

    const getCustDetailsParams = {
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: PK },
      },
      TableName: process.env.CUSTOMER_TABLE_NAME,
    };

    const { Items: customerRecords } = await ddbClient.send(
      new QueryCommand(getCustDetailsParams)
    );
    
    customerRecords.forEach((customerRecord) => {
      const uCustRec = unmarshall(customerRecord);
      
      // Handle driver's license record separately
      if (uCustRec.SK === "DRIVERS_LICENSE") {
        driversLicense = {
          documentNumber: uCustRec.DOCUMENT_NUMBER,
          firstName: uCustRec.FIRST_NAME,
          middleName: uCustRec.MIDDLE_NAME || "",
          dateOfBirth: uCustRec.DATE_OF_BIRTH,
          address: uCustRec.ADDRESS,
          city: uCustRec.CITY_IN_ADDRESS,
          state: uCustRec.STATE_IN_ADDRESS,
          zipCode: uCustRec.ZIP_CODE_IN_ADDRESS,
          stateName: uCustRec.STATE_NAME,
          expirationDate: uCustRec.EXPIRATION_DATE,
          dateOfIssue: uCustRec.DATE_OF_ISSUE,
          class: uCustRec.CLASS,
          idType: uCustRec.ID_TYPE,
          restrictions: uCustRec.RESTRICTIONS,
          endorsements: uCustRec.ENDORSEMENTS
        };
      } else if (uCustRec.SK !== "COGNITO_IDENTITY_ID") {
        // Preserve existing behavior: overwrite custDetails with customer profile
        // This maintains backward compatibility with existing frontend code
        custDetails = uCustRec;
      }
    });

    const getPoliciesParams = {
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: {
        ":sk": { S: `Customer|${custDetails.PK}` },
      },
      TableName: process.env.POLICY_TABLE_NAME,
    };

    const { Items: policies } = await ddbClient.send(
      new ScanCommand(getPoliciesParams)
    );

    custDetails["driversLicense"] = driversLicense;
    custDetails["policies"] = policies;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(custDetails),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
