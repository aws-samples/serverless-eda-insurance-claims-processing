// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Lambda TOKEN authorizer for API Gateway REST APIs.
 *
 * Validates Cognito JWTs (both ID tokens and access tokens) using aws-jwt-verify.
 * - ID tokens:     validated via `aud`      == USER_POOL_CLIENT_ID
 * - Access tokens: validated via `client_id` == USER_POOL_CLIENT_ID
 * Returns `sub` as authorizer context so Lambda handlers read it from
 * event.requestContext.authorizer.sub regardless of token type.
 */

const { CognitoJwtVerifier } = require("aws-jwt-verify");

const Effect = Object.freeze({ ALLOW: "Allow", DENY: "Deny" });

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  clientId: process.env.USER_POOL_CLIENT_ID,
  tokenUse: null, // accept both "id" and "access"
});

const denyPolicy = (methodArn) => ({
  principalId: "unauthorized",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [{ Action: "execute-api:Invoke", Effect: Effect.DENY, Resource: methodArn }],
  },
});

exports.handler = async (event) => {
  const token = event.authorizationToken;

  if (!token) {
    // No token present — throw to return 401 Unauthorized per OAuth2 spec
    throw new Error("Unauthorized");
  }

  try {
    const payload = await verifier.verify(token);

    return {
      principalId: payload.sub,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [{ Action: "execute-api:Invoke", Effect: Effect.ALLOW, Resource: event.methodArn }],
      },
      context: { sub: payload.sub },
    };
  } catch (err) {
    // Verification failed (expired, invalid signature, wrong issuer, etc.)
    // Return explicit Deny policy — results in 403 ACCESS_DENIED, not 500
    console.error("Token verification failed:", err.message);
    return denyPolicy(event.methodArn);
  }
};
