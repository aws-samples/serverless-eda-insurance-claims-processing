// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
const validator = require("email-validator");

exports.handler = async function (event, context) {
  let isValid = false;

  if (event && event.length && event.length > 0) {
    for (let index = 0; index < event.length; index++) {
      const element = event[index];
      switch (element.type) {
        case "email":
          isValid = validator.validate(element.value);
          break;
        case "ssn":
          isValid = ssnRegex.test(element.value);
          break;
        default:
          isValid = false;
      }
      if (!isValid) break;
    }
  }

  console.log("event = ", event);
  return isValid;
};
