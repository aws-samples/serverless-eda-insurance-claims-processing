// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
"use client";

/**
 * Root page — bootstraps Amplify v6 and renders the authenticated app.
 *
 * Amplify v6 `withAuthenticator` HOC is imported from @aws-amplify/ui-react
 * and works identically to v5's version. The HOC wraps the app in a
 * Cognito-managed sign-in/sign-up UI, then renders the child component once
 * the user is authenticated.
 *
 * The ThemeProvider (light color mode) reproduces the wrapper the original
 * CRA entry point (src/index.js) provided so Amplify UI components inherit the
 * same theme context.
 */

import {
  withAuthenticator,
  ThemeProvider,
  defaultDarkModeOverride,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { configureAmplify } from "../src/lib/amplify";
import App from "../src/App";

// Configure Amplify once at module load (safe to call multiple times)
configureAmplify();

const theme = {
  name: "insurance-theme",
  overrides: [defaultDarkModeOverride],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AuthenticatedApp = withAuthenticator(App as any);

export default function Page() {
  return (
    <ThemeProvider theme={theme} colorMode="light">
      <AuthenticatedApp />
    </ThemeProvider>
  );
}
