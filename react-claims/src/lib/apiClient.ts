// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Authenticated API client — replaces the Amplify v5 `API` module.
 *
 * Fetches the current Cognito ID-token JWT and injects it as the
 * `Authorization` header on every request. Uses axios for HTTP.
 *
 * IMPORTANT: the API Gateway Lambda TokenAuthorizer (see the CDK
 * `TokenAuthorizer` constructs) reads `event.authorizationToken` and passes it
 * straight to `aws-jwt-verify`, which expects the RAW JWT with NO `Bearer `
 * prefix. Amplify v5's `API` module also sent the bare token. Adding a
 * `Bearer ` prefix makes the authorizer's verify() throw → Deny → HTTP 403.
 *
 * Equivalent v5 → v6 migration:
 *   API.get('CustomerApi', 'customer', {})
 *     → apiClient.get('customer', { baseURL: getEndpointUrl('CustomerApiEndpoint') })
 *   API.post('SignupAPI', 'signup', { body })
 *     → apiClient.post('signup', body, { baseURL: getEndpointUrl('SignupApiEndpoint') })
 *   API.del('CleanupApi', 'clearAllData', {})
 *     → apiClient.delete('clearAllData', { baseURL: getEndpointUrl('CleanupApiEndpoint') })
 */

import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

async function getAuthToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error("No auth session — user is not signed in");
  return token;
}

export const apiClient = axios.create();

// Attach the raw JWT (NO "Bearer " prefix) to every request automatically
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  config.headers.set("Authorization", token);
  return config;
});
