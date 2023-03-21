// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async function (event) {
  let resp = {};
  if (event && event.urlreq && event.urlreq.length > 0) {
    for (let index = 0; index < event.urlreq.length; index++) {
      const id = event.urlreq[index].id;
      delete event.urlreq[index].id;
      const putObjectCommand = new PutObjectCommand(event.urlreq[index]);
      const url = await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: 3600,
      });
      resp[id] = url;
    }
  }

  return resp;
};
