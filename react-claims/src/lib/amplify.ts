// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Amplify v6 configuration helper.
 *
 * Amplify v6 uses the new `aws-amplify` package with tree-shakeable subpath
 * imports. We configure it once here and call configureAmplify() during app
 * bootstrap.
 *
 * Cognito config source of truth is `amplifyconfiguration.json` (the same file
 * the pre-migration app and the CDK context used). NEXT_PUBLIC_* env vars, if
 * set, take precedence — useful for CI or multi-environment builds.
 *
 * Deliberately NOT configuring identityPoolId: the app never uses AWS IAM
 * credentials (no direct-from-browser S3/IAM calls), and the original
 * pre-migration app (src/index.js) only ever configured the User Pool. Setting
 * identityPoolId makes Amplify v6 eagerly exchange the User Pool token for AWS
 * credentials via Cognito Identity on every auth session — an unused code path
 * that surfaced as `NotAuthorizedException: Invalid login token` in testing.
 *
 * Key API changes from v5 → v6:
 *   Auth.currentSession()            → fetchAuthSession()
 *   Auth.currentAuthenticatedUser()  → getCurrentUser()
 *   Auth.signOut()                   → signOut()
 *   session.getIdToken().getJwtToken() → session.tokens?.idToken?.toString()
 */

import { Amplify } from "aws-amplify";
import awsconfig from "../amplifyconfiguration.json";

let configured = false;

export function configureAmplify() {
  if (configured) return;
  configured = true;

  const userPoolId =
    process.env.NEXT_PUBLIC_USER_POOL_ID ?? awsconfig.aws_user_pools_id;
  const userPoolClientId =
    process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ??
    awsconfig.aws_user_pools_web_client_id;

  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          signUpVerificationMethod: "code",
          // This pool signs in by USERNAME (UsernameAttributes is null), not
          // email. The Authenticator UI renders a "Username" field based on
          // this.
          loginWith: { username: true },
        },
      },
    },
    { ssr: false }
  );
}
