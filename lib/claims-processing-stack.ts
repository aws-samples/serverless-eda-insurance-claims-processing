// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import {
  AuthorizationType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import {
  CloudWatchLogGroup,
  LambdaFunction,
  SqsQueue,
  SfnStateMachine,
} from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { EventSourceMapping, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import createCustomerAPI from "./api/customer";
import create_iot_api from "./api/iot";
import create_iot_policy from "./iot/iotPolicy";
import createGetCustomerFunction from "./lambda/getCustomer";
import createUpdateIOTPolicyFunction from "./lambda/updateIOTPolicy";
import { DocumentServiceStack } from "./services/documents-service";
import { CreateCustomerStepFunction } from "./stepFunctions/createCustomer";
import createValidatorFunction from "./lambda/validator";
import createPutPolicyReqsFunction from "./lambda/putPolicyReqs";
import createPSURLGeneratorFunction from "./lambda/psURLGenerator";
import createMetricsFunction from "./lambda/createMetric";
import { ClaimsProcessingCWDashboard } from "./cloudwatchDashboard/claimsProcessingCWDashboard";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { UpdatePolicyStepFunction } from "./stepFunctions/updatePolicy";
import { UpdateClaimsStepFunction } from "./stepFunctions/updateClaims";

export class ClaimsProcessingStack extends Stack {
  lambdaFunctions: NodejsFunction[] = [];
  apis: RestApi[] = [];
  rules: string[] = [];
  stateMachines: StateMachine[] = [];

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create Custom Event Bus
    const bus = new EventBus(this, "CustomBus", {
      eventBusName: "ClaimsProcessingBus",
    });

    // Create S3 bucket for DL, Car photos, Car damage photos
    // EventBridge Rule to trigger a Step Functions on Object Created event
    const documentService = new DocumentServiceStack(this, "DocumentService", {
      claimsBus: bus,
    });

    const allEventsLogGroup = new LogGroup(this, "AllEventsLogGroup", {
      retention: RetentionDays.ONE_WEEK,
      logGroupName: "/aws/events/claimsProcessingEvents",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "APIGWLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        logGroupName: "/aws/events/claimsProcessingAPIGateway",
        removalPolicy: RemovalPolicy.DESTROY,
      })
    );

    const lambdaToPublishIoTEventsPolicy = new PolicyStatement({
      actions: ["iot:Publish"],
      resources: [
        "arn:aws:iot:" +
          process.env.CDK_DEFAULT_REGION +
          ":" +
          process.env.CDK_DEFAULT_ACCOUNT +
          ":*",
      ],
      effect: Effect.ALLOW,
    });

    const customerTable = new Table(this, "CustomerTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const claimsTable = new Table(this, "ClaimsTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const policyTable = new Table(this, "PolicyTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const requestTable = new Table(this, "RequestTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Notifications Lambda function (needs IoT support)
    const notificationLambdaFunction = new NodejsFunction(
      this,
      "NotificationLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/notifications/notifications.js",
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
        },
      }
    );
    notificationLambdaFunction.addToRolePolicy(lambdaToPublishIoTEventsPolicy);
    customerTable.grantReadData(notificationLambdaFunction);

    const addDefaultGatewayResponse = function (api: RestApi) {
      api.addGatewayResponse("default-4xx-response", {
        type: ResponseType.DEFAULT_4XX,
        responseHeaders: {
          "Access-Control-Allow-Origin": "'*'",
        },
        templates: {
          "application/json": '{"message":$context.error.messageString}',
        },
      });
    };

    const updateIOTPolicyFunction = createUpdateIOTPolicyFunction(this);
    const iotApi = create_iot_api(this, {
      updateIOTPolicyFunction: updateIOTPolicyFunction,
      accessLogDestination: apiGWLogGroupDest,
    });
    addDefaultGatewayResponse(iotApi);
    create_iot_policy(this);

    const getIoTEndpoint = new AwsCustomResource(this, "IoTEndpoint", {
      onCreate: {
        service: "Iot",
        action: "describeEndpoint",
        physicalResourceId: PhysicalResourceId.fromResponse("endpointAddress"),
        parameters: {
          endpointType: "iot:Data-ATS",
        },
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    const iot_endpoint_address =
      getIoTEndpoint.getResponseField("endpointAddress");
    new CfnOutput(this, "iot-endpoint-address", {
      value: iot_endpoint_address,
      exportName: "iot-endpoint-address",
    });

    const lambdaToPutEventsPolicy = new PolicyStatement({
      actions: ["events:PutEvents"],
      resources: [bus.eventBusArn],
      effect: Effect.ALLOW,
    });

    // Create Signup Lambda function
    const signupLambdaFunction = new NodejsFunction(
      this,
      "SignupLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/signup/signup.js",
        environment: {
          BUS_NAME: bus.eventBusName,
        },
      }
    );

    signupLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);

    // Create Signup POST API
    const signupApi = new RestApi(this, "SignupApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["POST"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: apiGWLogGroupDest,
      },
    });
    const signupResource = signupApi.root.addResource("signup");
    signupResource.addMethod(
      "POST",
      new LambdaIntegration(signupLambdaFunction),
      { authorizationType: AuthorizationType.IAM }
    );
    addDefaultGatewayResponse(signupApi);
    new CfnOutput(this, "signup-api-endpoint", {
      value: signupApi.url,
      exportName: "signup-api-endpoint",
    });

    // Create SQS for Claims Service
    const claimsQueue = new Queue(this, "ClaimsQueue", { enforceSSL: true });

    // Create Create Customer Lambda reading from SQS
    const customerLambdaRole = new Role(this, "CustomerServiceFunctionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    const customerCreateLambdaFunction = new NodejsFunction(
      this,
      "CustomerCreateLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/customer/create.js",
        role: customerLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
          POLICY_TABLE_NAME: policyTable.tableName,
          BUCKET_NAME: documentService.documentsBucket.bucketName,
        },
      }
    );

    // Give Lambda permission to upload documents to bucket. Same permission will be used on pre-signed URL
    documentService.documentsBucket.grantWrite(customerCreateLambdaFunction);
    customerCreateLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);
    customerTable.grantWriteData(customerCreateLambdaFunction);
    policyTable.grantWriteData(customerCreateLambdaFunction);

    const customerUpdateLambdaFunction = new NodejsFunction(
      this,
      "CustomerUpdateLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/customer/update.js",
        role: customerLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
        },
      }
    );

    customerUpdateLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);
    customerTable.grantWriteData(customerUpdateLambdaFunction);

    const docProcessingLambdaRole = new Role(
      this,
      "DocProcessingFunctionRole",
      {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
        inlinePolicies: {
          tePolicy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: ["textract:AnalyzeID"],
                resources: ["*"],
              }),
            ],
          }),
          s3Policy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${documentService.documentsBucket.bucketArn}/*`],
              }),
            ],
          }),
        },
      }
    );

    // Create documentProcessing Lambda Handler that uses AI/ML services to get structured data from unstructured documents
    const docProcessingLambda = new NodejsFunction(
      this,
      "DocProcessingLambda",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/documents/documentProcessing.js",
        role: docProcessingLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
        },
        timeout: Duration.seconds(30),
      }
    );

    docProcessingLambda.addToRolePolicy(lambdaToPutEventsPolicy);
    docProcessingLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["rekognition:DetectLabels"],
        resources: ["*"],
        effect: Effect.ALLOW,
      })
    );

    // Create fraudDetection Lambda handler
    const fraudDetectorLambda = new NodejsFunction(
      this,
      "FraudDetectorLambda",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/fraud/fraudDetection.js",
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
          CLAIMS_TABLE_NAME: claimsTable.tableName,
          POLICY_TABLE_NAME: policyTable.tableName,
        },
      }
    );

    customerTable.grantReadData(fraudDetectorLambda);
    claimsTable.grantReadData(fraudDetectorLambda);
    policyTable.grantReadData(fraudDetectorLambda);

    fraudDetectorLambda.addToRolePolicy(lambdaToPutEventsPolicy);

    // Create FNOL Lambda function
    const firstNoticeOfLossLambda = new NodejsFunction(this, "FNOLLambda", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: "app/handlers/fnol/fnol.js",
      environment: {
        BUS_NAME: bus.eventBusName,
      },
    });

    firstNoticeOfLossLambda.addToRolePolicy(lambdaToPutEventsPolicy);

    // Create Claims FNOL POST API
    const fnolApi = new RestApi(this, "FnolApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["POST"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: apiGWLogGroupDest,
      },
    });
    const fnolResource = fnolApi.root.addResource("fnol");
    fnolResource.addMethod(
      "POST",
      new LambdaIntegration(firstNoticeOfLossLambda),
      { authorizationType: AuthorizationType.IAM }
    );
    addDefaultGatewayResponse(fnolApi);
    new CfnOutput(this, "fnol-api-endpoint", {
      value: fnolApi.url,
      exportName: "fnol-api-endpoint",
    });

    // Create Claims Lambda function polling from Claims queue, accept FNOL, puts event (Claims.FNOL.Accepted)
    // (should return a pre-signed url to upload photos of car damage)
    const claimsLambdaRole = new Role(this, "ClaimsQueueConsumerFunctionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaSQSQueueExecutionRole"
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    const claimsLambdaFunction = new NodejsFunction(
      this,
      "ClaimsLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: "app/handlers/claims/claimsProcessing.js",
        role: claimsLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
          BUCKET_NAME: documentService.documentsBucket.bucketName,
          CLAIMS_TABLE_NAME: claimsTable.tableName,
          POLICY_TABLE_NAME: policyTable.tableName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
        },
      }
    );

    documentService.documentsBucket.grantWrite(claimsLambdaFunction);
    claimsTable.grantWriteData(claimsLambdaFunction);
    policyTable.grantReadData(claimsLambdaFunction);
    customerTable.grantReadData(claimsLambdaFunction);
    claimsLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);

    new EventSourceMapping(this, "ClaimsQueueFunctionESM", {
      target: claimsLambdaFunction,
      batchSize: 1,
      eventSourceArn: claimsQueue.queueArn,
    });

    const validatorFunction = createValidatorFunction(this);
    const putPolicyReqsFunction = createPutPolicyReqsFunction(this);

    const psURLGeneratorFunction = createPSURLGeneratorFunction(this);
    documentService.documentsBucket.grantWrite(psURLGeneratorFunction);

    const createCustomerStepFunction = new CreateCustomerStepFunction(
      this,
      "create-customer",
      {
        requestTable: requestTable,
        customerTable: customerTable,
        policyTable: policyTable,
        putPolicyReqsFunction: putPolicyReqsFunction,
        validatorFunction: validatorFunction,
        documentsBucket: documentService.documentsBucket,
        psURLGeneratorFunction: psURLGeneratorFunction,
        eventBus: bus,
      }
    );

    const updatePolicyStepFunction = new UpdatePolicyStepFunction(
      this,
      "update-policy-sf",
      {
        policyTable: policyTable,
      }
    );

    const updateClaimsStepFunction = new UpdateClaimsStepFunction(
      this,
      "update-claims-sf",
      {
        claimsTable: claimsTable,
      }
    );

    const createMetricsLambdaFunction = createMetricsFunction(this);

    /********************************************************
     ******************* EB RULES ****************************
     *********************************************************/

    // Custom Event Bus Rule for customer signup (Event Type: Customer.Submitted)
    new Rule(this, "CustomerEventsRule", {
      eventBus: bus,
      ruleName: "CustomerEventsRule",
      eventPattern: {
        detailType: ["Customer.Submitted"],
      },
      targets: [
        new LambdaFunction(notificationLambdaFunction),
        new SfnStateMachine(createCustomerStepFunction),
      ],
    });

    // Custom Event Bus Rule (Event Type: Customer.Accepted)
    new Rule(this, "CustomerAcceptedEventsRule", {
      eventBus: bus,
      ruleName: "CustomerAcceptedEventsRule",
      eventPattern: {
        detailType: ["Customer.Accepted"],
      },
      targets: [new LambdaFunction(notificationLambdaFunction)],
    });

    // Custom Event Bus Rule (Event Type: Customer.Rejected)
    new Rule(this, "CustomerRejectedEventsRule", {
      eventBus: bus,
      ruleName: "CustomerRejectedEventsRule",
      eventPattern: {
        detailType: ["Customer.Rejected"],
      },
      targets: [new LambdaFunction(notificationLambdaFunction)],
    });

    // Create Event Bus Rule (Event Type: Claims.FNOL.Requested) to trigger message to SQS (Claims Queue)
    new Rule(this, "FNOLEventsRule", {
      eventBus: bus,
      ruleName: "FNOLEventsRule",
      eventPattern: {
        detailType: ["Claim.Requested"],
      },
      targets: [new SqsQueue(claimsQueue)],
    });

    // Create Rule for Claims.Accepted
    new Rule(this, "ClaimsAcceptedRule", {
      eventBus: bus,
      ruleName: "ClaimsAcceptedRule",
      eventPattern: {
        detailType: ["Claim.Accepted"],
      },
      targets: [new LambdaFunction(notificationLambdaFunction)],
    });

    // Claims Rejected Rule
    new Rule(this, "ClaimsRejectedRule", {
      eventBus: bus,
      ruleName: "ClaimsRejectedRule",
      eventPattern: {
        detailType: ["Claim.Rejected"],
      },
      targets: [new LambdaFunction(notificationLambdaFunction)],
    });

    // Documents Accepted Rule
    new Rule(this, "DocumentsAcceptedRule", {
      eventBus: bus,
      ruleName: "DocumentsAcceptedRule",
      eventPattern: {
        detailType: ["Documents.Accepted"],
      },
      targets: [
        new LambdaFunction(notificationLambdaFunction),
        new LambdaFunction(claimsLambdaFunction),
      ],
    });

    // Custom Event Bus Rule on *.Document.Processed event should trigger fraudDetection Lambda handler and notification handler
    const fraudRule = new Rule(this, "FraudRule", {
      eventBus: bus,
      ruleName: "FraudRule",
      eventPattern: {
        source: ["document.service"],
        detailType: ["Document.Processed"],
      },
      targets: [
        new LambdaFunction(fraudDetectorLambda),
        new LambdaFunction(notificationLambdaFunction),
      ],
    });

    // Custom Event Bus Rule on Claims.Fraud.Detected event should trigger notification Lambda
    new Rule(this, "FraudDetectedRule", {
      eventBus: bus,
      ruleName: "FraudDetectedRule",
      eventPattern: {
        source: ["fraud.service"],
        detailType: ["Fraud.Detected"],
      },
      targets: [
        new LambdaFunction(notificationLambdaFunction),
        new LambdaFunction(claimsLambdaFunction), // Call this target if document fraud is related to claims
      ],
    });

    // Custom Event Bus Rule on Claims.Fraud.Not.Detected event should trigger claims Lambda
    new Rule(this, "FraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "FraudNotDetectedRule",
      eventPattern: {
        source: ["fraud.service"],
        detailType: ["Fraud.Not.Detected"],
        detail: {
          documentType: ["DRIVERS_LICENSE"],
          fraudType: ["DOCUMENT"],
        },
      },
      targets: [
        new LambdaFunction(customerUpdateLambdaFunction), // Call this target to update customer item with latest document information
      ],
    });

    // Custom Event Bus Rule on Claims.Fraud.Not.Detected event should trigger claims Lambda
    new Rule(this, "PolicyFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "PolicyFraudNotDetectedRule",
      eventPattern: {
        source: ["fraud.service"],
        detailType: ["Fraud.Not.Detected"],
        detail: {
          documentType: ["CAR"],
          fraudType: ["SIGNUP.CAR"],
        },
      },
      targets: [
        new LambdaFunction(notificationLambdaFunction),
        new SfnStateMachine(updatePolicyStepFunction),
      ],
    });

    new Rule(this, "ClaimFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "ClaimFraudNotDetectedRule",
      eventPattern: {
        source: ["fraud.service"],
        detailType: ["Fraud.Not.Detected"],
        detail: {
          documentType: ["CAR"],
          fraudType: ["CLAIMS"],
        },
      },
      targets: [
        new LambdaFunction(notificationLambdaFunction),
        new SfnStateMachine(updateClaimsStepFunction),
      ],
    });

    // Capture all events in CW LogGroup
    new Rule(this, "AllEventLogsRule", {
      eventBus: bus,
      ruleName: "allEventLogsRule",
      eventPattern: {
        source: [
          "signup.service",
          "customer.service",
          "fnol.service",
          "claims.service",
          "document.service",
          "fraud.service",
          "aws.s3",
        ],
      },
      targets: [
        new CloudWatchLogGroup(allEventsLogGroup),
        new LambdaFunction(createMetricsLambdaFunction),
      ],
    });

    const getCustomerFunction = createGetCustomerFunction(this, {
      customerTable: customerTable,
      policyTable: policyTable,
    });
    const customerApi = createCustomerAPI(this, {
      getCustomerFunction: getCustomerFunction,
      accessLogDestination: apiGWLogGroupDest,
    });
    addDefaultGatewayResponse(customerApi);

    this.lambdaFunctions.push(psURLGeneratorFunction);
    this.lambdaFunctions.push(putPolicyReqsFunction);
    this.lambdaFunctions.push(updateIOTPolicyFunction);
    this.lambdaFunctions.push(getCustomerFunction);
    this.lambdaFunctions.push(claimsLambdaFunction);
    this.lambdaFunctions.push(firstNoticeOfLossLambda);
    this.lambdaFunctions.push(fraudDetectorLambda);
    this.lambdaFunctions.push(docProcessingLambda);
    this.lambdaFunctions.push(customerUpdateLambdaFunction);
    this.lambdaFunctions.push(customerCreateLambdaFunction);
    this.lambdaFunctions.push(signupLambdaFunction);
    this.lambdaFunctions.push(notificationLambdaFunction);
    this.lambdaFunctions.push(documentService.analyzeCarImageFunction);

    this.apis.push(signupApi);
    this.apis.push(fnolApi);
    this.apis.push(customerApi);
    this.apis.push(iotApi);

    this.rules.push("FraudRule");
    this.rules.push("FnolEventsRule");
    this.rules.push("CustomerAcceptedEventsRule");
    this.rules.push("CustomerEventsRule");
    this.rules.push("CustomerRejectedEventsRule");
    this.rules.push("ClaimsAcceptedRule");
    this.rules.push("ClaimsRejectedRule");
    this.rules.push("DocumentsAcceptedRule");
    this.rules.push("FraudDetectedRule");
    this.rules.push("FraudNotDetectedRule");
    this.rules.push("AllEventLogsRule");

    this.stateMachines.push(documentService.documentProcessingSM);
    this.stateMachines.push(createCustomerStepFunction);
    this.stateMachines.push(updatePolicyStepFunction);
    this.stateMachines.push(updateClaimsStepFunction);

    new ClaimsProcessingCWDashboard(this, "Claims Processing Dashboard", {
      dashboardName: "Claims-Processing-Dashboard",
      lambdaFunctions: this.lambdaFunctions,
      apis: this.apis,
      rules: this.rules,
      stateMachines: this.stateMachines,
    });
  }
}
