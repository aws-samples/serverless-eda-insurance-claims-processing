// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  DynamoDBClient,
  BatchWriteItemCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");

const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async function (event, context) {
  let dbDataDeleteResp = {};
  let s3ObjectsDelResp = {};
  const findCustomerParams = {
    FilterExpression: "SK = :sk AND cognitoIdentityId = :identifier",
    ExpressionAttributeValues: {
      ":sk": { S: "COGNITO_IDENTITY_ID" },
      ":identifier": { S: event.requestContext.identity.cognitoIdentityId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  const { Items: idRecords } = await ddbClient.send(
    new ScanCommand(findCustomerParams)
  );

  if (idRecords && idRecords.length > 0) {
    const uItem = unmarshall(idRecords["0"]);
    const customerUUID = uItem.PK;

    dbDataDeleteResp = await deleteDBRecords(customerUUID);
    s3ObjectsDelResp = await deleteS3Objects(customerUUID);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      dbDataDeleteResp: dbDataDeleteResp,
      s3ObjectsDelResp: s3ObjectsDelResp,
    }),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};

async function deleteS3Objects(customerUUID) {
  let deleteS3ObjResp = {};

  const listObjectsInput = {
    Bucket: process.env.DOCUMENT_BUCKET_NAME,
    Prefix: `customers/${customerUUID}`,
  };

  const listResp = await s3Client.send(
    new ListObjectsV2Command(listObjectsInput)
  );

  if (listResp.Contents && listResp.Contents.length > 0) {
    const objtsToDelete = [];

    listResp.Contents.forEach((content) => {
      objtsToDelete.push({
        Key: content.Key,
      });
    });

    const deleteObjectsInput = {
      Bucket: process.env.DOCUMENT_BUCKET_NAME,
      Delete: {
        Objects: objtsToDelete,
        Quiet: false,
      },
    };

    deleteS3ObjResp = await s3Client.send(
      new DeleteObjectsCommand(deleteObjectsInput)
    );
  }

  return deleteS3ObjResp;
}

async function deleteDBRecords(customerUUID) {
  const getCustDetailsInput = {
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: customerUUID },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  const { Items: customerRecords } = await ddbClient.send(
    new QueryCommand(getCustDetailsInput)
  );

  const deleteCustReqs = [];
  const deletePolicyReqs = [];
  const deleteClaimReqs = [];

  prepareDeleteCustReqs(customerRecords, customerUUID, deleteCustReqs);

  await prepareDeletePolicyReqs(customerUUID, deletePolicyReqs);

  await prepareDeleteClaimsReqs(customerUUID, deleteClaimReqs);

  const batchWriteCmdInput = {
    RequestItems: {
      [process.env.CUSTOMER_TABLE_NAME]: deleteCustReqs,
      [process.env.POLICY_TABLE_NAME]: deletePolicyReqs,
    },
  };

  if (deleteClaimReqs.length > 0) {
    batchWriteCmdInput.RequestItems[process.env.CLAIMS_TABLE_NAME] =
      deleteClaimReqs;
  }

  const dbDataDeleteResp = await ddbClient.send(
    new BatchWriteItemCommand(batchWriteCmdInput)
  );
  return dbDataDeleteResp;
}

async function prepareDeleteClaimsReqs(customerUUID, deleteClaimReqs) {
  const findCustomerClaimsInput = {
    FilterExpression: "SK = :sk",
    ExpressionAttributeValues: {
      ":sk": { S: `Customer|${customerUUID}` },
    },
    TableName: process.env.CLAIMS_TABLE_NAME,
  };

  const { Items: claims } = await ddbClient.send(
    new ScanCommand(findCustomerClaimsInput)
  );

  claims.forEach((claim) => {
    const uClaim = unmarshall(claim);
    const delClaimReq = {
      DeleteRequest: {
        Key: {
          PK: {
            S: uClaim.PK,
          },
          SK: {
            S: uClaim.SK,
          },
        },
      },
    };
    deleteClaimReqs.push(delClaimReq);
  });
}

async function prepareDeletePolicyReqs(customerUUID, deletePolicyReqs) {
  const findCustomerPoliciesInput = {
    FilterExpression: "SK = :sk",
    ExpressionAttributeValues: {
      ":sk": { S: `Customer|${customerUUID}` },
    },
    TableName: process.env.POLICY_TABLE_NAME,
  };

  const { Items: policies } = await ddbClient.send(
    new ScanCommand(findCustomerPoliciesInput)
  );

  policies.forEach((policy) => {
    const uPolicy = unmarshall(policy);
    const delPolicyReq = {
      DeleteRequest: {
        Key: {
          PK: {
            S: uPolicy.PK,
          },
          SK: {
            S: uPolicy.SK,
          },
        },
      },
    };
    deletePolicyReqs.push(delPolicyReq);
  });
}

function prepareDeleteCustReqs(customerRecords, customerUUID, deleteCustReqs) {
  customerRecords.forEach((customerRecord) => {
    const uCustRecord = unmarshall(customerRecord);
    const delCustReq = {
      DeleteRequest: {
        Key: {
          PK: {
            S: customerUUID,
          },
          SK: {
            S: uCustRecord.SK,
          },
        },
      },
    };
    deleteCustReqs.push(delCustReq);
  });
}
