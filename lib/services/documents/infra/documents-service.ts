// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { GraphWidget } from "aws-cdk-lib/aws-cloudwatch";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods, } from "aws-cdk-lib/aws-s3";
import {
  Choice,
  Condition,
  DefinitionBody,
  Errors,
  Fail,
  JsonPath,
  LogLevel,
  StateMachine,
  StateMachineType,
  TaskInput,
} from "aws-cdk-lib/aws-stepfunctions";
import {
  CallAwsService,
  EvaluateExpression,
  EventBridgePutEvents,
  LambdaInvoke,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import config from "../../../config";
import {
  createGraphWidget,
  createMetric,
} from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import { DocumentsEvents } from "./documents-events";

export interface DocumentServiceProps {
  readonly bus: EventBus;
}

export class DocumentService extends Construct {
  public readonly documentsBucket: Bucket;
  public readonly documentsMetricsWidget: GraphWidget;

  constructor(scope: Construct, id: string, props?: DocumentServiceProps) {
    super(scope, id);

    this.documentsBucket = this.createDocumentsBucket();

    const documentProcessingSM =
      this.createDocumentProcessingStateMachine(props);

    new Rule(this, "signupDocumentsRule", {
      // eventBus: bus, // Only available for default event bus
      eventPattern: {
        source: ["aws.s3"],
        detailType: ["Object Created"],
        detail: {
          bucket: {
            name: [this.documentsBucket.bucketName],
          },
        },
      },
      targets: [new SfnStateMachine(documentProcessingSM)],
    });

    this.documentsBucket.grantRead(documentProcessingSM);

    this.documentsMetricsWidget = createGraphWidget("Documents Summary", [
      createMetric(
        DocumentsEvents.DOCUMENT_PROCESSED,
        DocumentsEvents.SOURCE,
        "Documents Processed"
      ),
    ]);
  }

  private createDocumentProcessingStateMachine(
    props: DocumentServiceProps | undefined
  ) {
    const classifyImageTask = new CallAwsService(this, "DetectLabelsCommand", {
      service: "rekognition",
      action: "detectLabels",
      parameters: {
        Image: {
          S3Object: {
            Bucket: this.documentsBucket.bucketName,
            Name: JsonPath.stringAt("$.detail.object.key"),
          },
        },
      },
      iamResources: ["*"],
      resultSelector: {
        carlabels: JsonPath.stringAt("$.Labels[?(@.Name==Car)]"),
        drivingLicense: JsonPath.stringAt(
          "$.Labels[?(@.Name==Driving License)]]"
        ),
      },
      resultPath: JsonPath.stringAt("$.Labels"),
    });

    const failedState = new Fail(this, "FailedState");

    const carProcessed = new EventBridgePutEvents(this, "CarProcessedEvent", {
      entries: [
        {
          detailType: "Document.Processed",
          source: "document.service",
          eventBus: props?.bus,
          detail: TaskInput.fromObject({
            documentType: "CAR",
            customerId: JsonPath.stringAt("$.customerId"),
            analyzedFieldAndValues: JsonPath.objectAt(
              "$.analyzedFieldAndValues"
            ),
            "recordId.$":
              "States.ArrayGetItem(States.StringSplit($.detail.object.key, '/'),4)",
          }),
        },
      ],
    });

    const analyzeIdDocumentTask = new CallAwsService(
      this,
      "AnalyzeIdDocumentTask",
      {
        service: "textract",
        action: "analyzeID",
        parameters: {
          DocumentPages: [
            {
              S3Object: {
                Bucket: this.documentsBucket.bucketName,
                Name: JsonPath.stringAt("$.detail.object.key"),
              },
            },
          ],
        },
        iamResources: ["*"],
        resultPath: JsonPath.stringAt("$.analyzeID"),
        resultSelector: {
          IdentityDocuments: JsonPath.stringAt(
            "$.IdentityDocuments[*].IdentityDocumentFields"
          ),
        },
      }
    );

    const textractResponseTransformerLambda = new NodejsFunction(
      this,
      "TextractResponseTransformerLambda",
      {
        runtime: Runtime.NODEJS_22_X,
        memorySize: 128,
        logGroup: new LogGroup(this, "TextractResponseTransformerLogGroup", {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        handler: "handler",
        entry: `${__dirname}/../app/handlers/textractResponseTransformer.js`,
        timeout: Duration.seconds(10),
      }
    );

    const analyzeIDResponseTransformer = new LambdaInvoke(
      this,
      "AnalyzeIDResponseTransformer",
      {
        lambdaFunction: textractResponseTransformerLambda,
        inputPath: "$.analyzeID",
        resultPath: JsonPath.stringAt("$.transformedResponse"),
        resultSelector: {
          analyzeIDtransformedResponse: JsonPath.stringAt("$.Payload"),
        },
      }
    );

    const evaluateCustomerID = new EvaluateExpression(this, "ExtractID", {
      expression: "`${$.detail.object.key}`.split('/', 2)[1]",
      resultPath: JsonPath.stringAt("$.customerId"),
    });

    const licenseProcessedEvent = new EventBridgePutEvents(
      this,
      "LicenseProcessedEvent",
      {
        entries: [
          {
            detailType: "Document.Processed",
            source: "document.service",
            eventBus: props?.bus,
            detail: TaskInput.fromObject({
              documentType: "DRIVERS_LICENSE",
              analyzedFieldAndValues: JsonPath.stringAt(
                "$.transformedResponse.analyzeIDtransformedResponse"
              ),
              customerId: JsonPath.stringAt("$.customerId"),
            }),
          },
        ],
      }
    );

    const analyzeCarImageFunction = new NodejsFunction(
      this,
      "analyzeCarImageFunction",
      {
        runtime: Runtime.NODEJS_22_X,
        logGroup: new LogGroup(this, "AnalyzeCarImageLogGroup", {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        handler: "handler",
        entry: `${__dirname}/../app/handlers/analyzeCarImage.js`,
        environment: {
          COLOR_DETECT_API: config.COLOR_DETECT_API,
          DAMAGE_DETECT_API: config.DAMAGE_DETECT_API,
        },
        timeout: Duration.seconds(30),
      }
    );

    this.documentsBucket.grantRead(analyzeCarImageFunction);

    const analyzeCarImage = new LambdaInvoke(this, "Analyze Car Image", {
      lambdaFunction: analyzeCarImageFunction,
      resultPath: JsonPath.stringAt("$.analyzedFieldAndValues"),
      resultSelector: {
        "color.$": "$.Payload.analyzedFieldAndValues.color",
        "damage.$": "$.Payload.analyzedFieldAndValues.damage",
        "type.$": "$.Payload.type",
      },
    });

    analyzeCarImage.next(carProcessed);
    analyzeCarImage.addRetry({
      errors: [Errors.ALL],
      backoffRate: 2,
      interval: Duration.seconds(5),
      maxAttempts: 3,
    });

    const licenseProcessingPath = analyzeIdDocumentTask
      .next(analyzeIDResponseTransformer)
      .next(licenseProcessedEvent);

    const definition = evaluateCustomerID
      .next(classifyImageTask)
      .next(
        new Choice(this, "DecideOnLabel")
          .when(Condition.isPresent("$.Labels.carlabels[0]"), analyzeCarImage)
          .when(
            Condition.isPresent("$.Labels.drivingLicense[0]"),
            licenseProcessingPath
          )
          .otherwise(failedState)
      );

    const documentProcessingLogs = new LogGroup(
      this,
      "DocumentProcessingLogs",
      {
        retention: RetentionDays.FIVE_DAYS,
        removalPolicy: RemovalPolicy.DESTROY,
        logGroupName: "/aws/vendedlogs/states/DocumentProcessingSFN"
      }
    );

    return new StateMachine(
      this,
      "DocumentProcessingStateMachine",
      {
        timeout: Duration.minutes(2),
        stateMachineType: StateMachineType.EXPRESS,
        definitionBody: DefinitionBody.fromChainable(definition),
        logs: {
          level: LogLevel.ALL,
          destination: documentProcessingLogs,
          includeExecutionData: true,
        },
        tracingEnabled: true,
      }
    );
  }

  private createDocumentsBucket() {
    return new Bucket(this, "DocumentsBucket", {
      eventBridgeEnabled: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["*"],
        },
      ],
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });
  }
}
