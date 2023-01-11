// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";

var cdk_outputs_file = require("./cdk-outputs.json");

Amplify.configure(awsExports);
Amplify.configure({
  API: {
    endpoints: [
      {
        name: "SignupAPI",
        endpoint:
          cdk_outputs_file.ClaimsProcessingStack.signupapiendpoint,
      },
      {
        name: "IOTApi",
        endpoint: cdk_outputs_file.ClaimsProcessingStack.iotapiendpoint,
      },
      {
        name: "CustomerApi",
        endpoint:
          cdk_outputs_file.ClaimsProcessingStack.customerapiendpoint,
      },
      {
        name: "FnolApi",
        endpoint:
          cdk_outputs_file.ClaimsProcessingStack.fnolapiendpoint,
      },
    ],
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
