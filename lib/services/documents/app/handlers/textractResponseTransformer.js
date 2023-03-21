// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

exports.handler = async (event) => {
  let result = {};

  if (
    !event.IdentityDocuments ||
    !Array.isArray(event.IdentityDocuments) ||
    !event.IdentityDocuments.length
  ) {
    return result;
  }

  return event.IdentityDocuments[0]
    .filter((val) => val.ValueDetection.Confidence > 95)
    .map((val) => ({ [val.Type.Text]: val.ValueDetection.Text }))
    .reduce((obj, item) => {
      const key = Object.keys(item)[0];
      return {
        ...obj,
        [key]: item[key],
      };
    }, result);
};
