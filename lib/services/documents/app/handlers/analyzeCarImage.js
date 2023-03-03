// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const client = new S3Client({ region: process.env.AWS_REGION });
const https = require("node:https");
import { Buffer } from "node:buffer";

exports.handler = async function (event) {
  let resp = {};
  let analyzedFieldAndValues = {};

  if (!process.env.COLOR_DETECT_API || !process.env.DAMAGE_DETECT_API) {
    console.error(
      "Color or Damage detection API endpoint has not been specified under lib/config.ts"
    );
  }

  const buffer = await getImageFromS3(event);

  await analyzeForColor(buffer, analyzedFieldAndValues);

  await analyzeForDamage(buffer, analyzedFieldAndValues);

  resp["analyzedFieldAndValues"] = analyzedFieldAndValues;

  let type = "";
  if (event.detail.object.key.endsWith("car.jpg")) {
    type = "signup";
  } else if (event.detail.object.key.endsWith("damagedCar.jpg")) {
    type = "claims";
  }

  resp["type"] = type;

  return resp;
};

async function analyzeForDamage(buffer, analyzedFieldAndValues) {
  const getDamageAPIOptions = {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
    },
  };

  const getDamageResp = await callAPI(
    process.env.DAMAGE_DETECT_API,
    getDamageAPIOptions,
    buffer
  );
  const getDamageRespJson = JSON.parse(getDamageResp);

  if (containsPrediction(getDamageRespJson)) {
    analyzedFieldAndValues["damage"] = getDamageRespJson.Predictions[0];
  }
}

function containsPrediction(respJSON) {
  return (
    respJSON &&
    respJSON.Predictions &&
    respJSON.Predictions.length > 0 &&
    respJSON.Predictions[0]
  );
}

async function analyzeForColor(buffer, analyzedFieldAndValues) {
  const getColorAPIOptions = {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
    },
  };

  const getColorResp = await callAPI(
    process.env.COLOR_DETECT_API,
    getColorAPIOptions,
    buffer
  );
  const getColorRespJson = JSON.parse(getColorResp);
  if (containsPrediction(getColorRespJson)) {
    analyzedFieldAndValues["color"] = getColorRespJson.Predictions[0];
  }
}

async function getImageFromS3(event) {
  const command = new GetObjectCommand({
    Bucket: event.detail.bucket.name,
    Key: event.detail.object.key,
  });

  const getObjectCommandOutput = await client.send(command);

  const chunks = [];
  for await (const chunk of getObjectCommandOutput.Body) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  return buffer;
}

async function callAPI(url, options, buffer) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding("utf8");
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        console.log("No more data in response. chunks = ", chunks);
        resolve(chunks.join(""));
      });
    });

    req.on("error", (e) => {
      console.error(`problem with request: ${e.message}`);
      reject(e);
    });

    // Write data to request body
    req.write(buffer);
    req.end();
  });
}
