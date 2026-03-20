// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Amplify, Auth } from "aws-amplify";
import awsExports from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";
import { getEndpointUrl } from "./utils";
import { ThemeProvider, defaultDarkModeOverride } from "@aws-amplify/ui-react";

Amplify.configure(awsExports);
Amplify.configure({
  API: {
    endpoints: [
      {
        name: "SignupAPI",
        endpoint: getEndpointUrl("SignupApiEndpoint"),
        custom_header: async () => {
          const session = await Auth.currentSession();
          return { Authorization: session.getIdToken().getJwtToken() };
        },
      },
      {
        name: "CustomerApi",
        endpoint: getEndpointUrl("CustomerApiEndpoint"),
        custom_header: async () => {
          const session = await Auth.currentSession();
          return { Authorization: session.getIdToken().getJwtToken() };
        },
      },
      {
        name: "FnolApi",
        endpoint: getEndpointUrl("FnolApiEndpoint"),
        custom_header: async () => {
          const session = await Auth.currentSession();
          return { Authorization: session.getIdToken().getJwtToken() };
        },
      },
      {
        name: "CleanupApi",
        endpoint: getEndpointUrl("CleanupApiEndpoint"),
        custom_header: async () => {
          const session = await Auth.currentSession();
          return { Authorization: session.getIdToken().getJwtToken() };
        },
      },
    ],
  },
});

const theme = {
  name: 'insurance-theme',
  overrides: [defaultDarkModeOverride],
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ThemeProvider theme={theme} colorMode="light">
    <App />
  </ThemeProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
