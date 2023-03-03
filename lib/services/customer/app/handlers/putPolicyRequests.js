// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { v4: uuidv4 } = require("uuid");
const { marshall } = require("@aws-sdk/util-dynamodb");

exports.handler = async function (event) {

  if (!event || !event.data || !event.data.cars || event.data.cars.length <= 0) {
    return [];
  }

  const cars = event.data.cars;
  const putRequests = cars.map(({ make, model, color, type, year, mileage, vin }) => {
    const policyId = uuidv4();
    const startDate = new Date();
    const futureDate = new Date();
    futureDate.setMonth(startDate.getMonth() + 6);
    return {
      PutRequest: {
        Item: marshall({
          PK: policyId,
          SK: `Customer|${event.uuid.uuid}`,
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
  });

  return putRequests;
};
