// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  CachePolicy,
  ResponseHeadersPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

/**
 * FrontendHostingService
 *
 * Hosts the Next.js static export (`react-claims/out`) on a private S3 bucket
 * fronted by CloudFront with Origin Access Control (OAC). This is the AWS
 * best-practice pattern for a client-side SPA:
 *   - S3 bucket is fully private (no public access, no website hosting)
 *   - CloudFront reaches it via OAC (the modern replacement for OAI)
 *   - SPA routing: 403/404 are rewritten to /index.html
 *
 * Build the frontend first:  cd react-claims && npm ci && npm run build
 * That produces react-claims/out, which BucketDeployment uploads on deploy.
 */
export class FrontendHostingService extends Construct {
  public readonly distribution: Distribution;
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const stackName = Stack.of(this).stackName;

    // Private bucket — CloudFront-only access via OAC
    this.bucket = new Bucket(this, "FrontendBucket", {
      bucketName: `${stackName.toLowerCase()}-frontend-${Stack.of(this).account}`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution with OAC (S3BucketOrigin.withOriginAccessControl
    // provisions the OAC and wires the bucket policy automatically).
    this.distribution = new Distribution(this, "FrontendDistribution", {
      comment: `${stackName} frontend`,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy:
          ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
      },
      // SPA fallback: serve index.html for client-side routes / missing keys
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
      ],
    });

    // Only deploy assets if the static export exists. This lets `cdk synth`
    // and backend-only deploys succeed before the frontend has been built.
    const assetPath = path.join(__dirname, "../../../../react-claims/out");
    if (fs.existsSync(assetPath)) {
      new BucketDeployment(this, "FrontendDeployment", {
        sources: [Source.asset(assetPath)],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ["/*"],
      });
    }

    new CfnOutput(this, "FrontendUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "CloudFront URL for the Next.js frontend",
      exportName: `${stackName}-FrontendUrl`,
    });

    new CfnOutput(this, "FrontendBucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket hosting the frontend static assets",
    });
  }
}
