// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RemovalPolicy } from "aws-cdk-lib";
import {
  AuthorizationType,
  EndpointType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { GraphWidget } from "aws-cdk-lib/aws-cloudwatch";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import {
  createGraphWidget,
  createMetric,
} from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import { FraudEvents } from "../../fraud/infra/fraud-events";
import { CustomerEvents } from "./customer-events";
import { CreateCustomerStepFunction } from "./step-functions/createCustomer";
import { UpdatePolicyStepFunction } from "./step-functions/updatePolicy";

function addDefaultGatewayResponse(api: RestApi) {
  api.addGatewayResponse("default-4xx-response", {
    type: ResponseType.DEFAULT_4XX,
    responseHeaders: {
      "Access-Control-Allow-Origin": "'*'",
    },
    templates: {
      "application/json": '{"message":$context.error.messageString}',
    },
  });
}

interface CustomerServiceProps {
  bus: EventBus;
  documentsBucket: Bucket;
}

export class CustomerService extends Construct {
  public customerTable: Table;
  public policyTable: Table;
  public readonly customerMetricsWidget: GraphWidget;

  constructor(scope: Construct, id: string, props: CustomerServiceProps) {
    super(scope, id);

    console.log(props.bus.eventBusName);
    const bus = props.bus;

    const apiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "SignupAPIGWLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      })
    );

    this.customerTable = new Table(this, "CustomerTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.policyTable = new Table(this, "PolicyTable", {
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
        entry: `${__dirname}/../app/handlers/signup.js`,
        environment: {
          BUS_NAME: bus.eventBusName,
        },
      }
    );

    signupLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);

    

    // Create Create Customer Lambda reading from SQS
    const customerLambdaRole = new Role(this, "CustomerServiceFunctionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    const customerUpdateLambdaFunction = new NodejsFunction(
      this,
      "CustomerUpdateLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/update.js`,
        role: customerLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: this.customerTable.tableName,
        },
      }
    );

    customerUpdateLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);
    this.customerTable.grantWriteData(customerUpdateLambdaFunction);

    const validatorFunction = new NodejsFunction(scope, "ValidatorFunction", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/validator.js`,
    });

    const putPolicyRequestsFunction = new NodejsFunction(
      scope,
      "PutPolicyRequestsFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/putPolicyRequests.js`,
      }
    );

    const preSignedURLGeneratorFunction = new NodejsFunction(
      scope,
      "PreSignedURLGenerator",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/preSignedURLGenerator.js`,
      }
    );

    props.documentsBucket.grantWrite(preSignedURLGeneratorFunction);

    const createCustomerStepFunction = new CreateCustomerStepFunction(
      this,
      "create-customer",
      {
        requestTable: requestTable,
        customerTable: this.customerTable,
        policyTable: this.policyTable,
        putPolicyRequestsFunction: putPolicyRequestsFunction,
        validatorFunction: validatorFunction,
        documentsBucket: props.documentsBucket,
        psURLGeneratorFunction: preSignedURLGeneratorFunction,
        eventBus: bus,
      }
    );

    const updatePolicyStepFunction = new UpdatePolicyStepFunction(
      this,
      "update-policy-sf",
      {
        policyTable: this.policyTable,
      }
    );

    const getCustomerFunction = new NodejsFunction(
      scope,
      "GetCustomerFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/get.js`,
        environment: {
          CUSTOMER_TABLE_NAME: this.customerTable.tableName,
          POLICY_TABLE_NAME: this.policyTable.tableName,
        },
      }
    );

    this.customerTable.grantReadData(getCustomerFunction);
    this.policyTable.grantReadData(getCustomerFunction);

    const signupApi = new RestApi(this, "SignupApi", {
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
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

    const customerApi = new RestApi(scope, "CustomerApi", {
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: apiGWLogGroupDest,
      },
    });
    const customerResource = customerApi.root.addResource("customer");
    customerResource.addMethod(
      "GET",
      new LambdaIntegration(getCustomerFunction),
      { authorizationType: AuthorizationType.IAM }
    );

    addDefaultGatewayResponse(customerApi);

    new Rule(this, "CreateCustomerEventsRule", {
      eventBus: bus,
      ruleName: "CreateCustomerEventsRule",
      eventPattern: {
        detailType: [CustomerEvents.CUSTOMER_SUBMITTED],
      },
      targets: [new SfnStateMachine(createCustomerStepFunction)],
    });

    new Rule(this, "UpdateDLonFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "UpdateDLonFraudNotDetectedRule",
      eventPattern: {
        source: [FraudEvents.SOURCE],
        detailType: [FraudEvents.FRAUD_NOT_DETECTED],
        detail: {
          documentType: ["DRIVERS_LICENSE"],
          fraudType: ["DOCUMENT"],
        },
      },
      targets: [
        new LambdaFunction(customerUpdateLambdaFunction),
      ],
    });

    new Rule(this, "UpdateCustomerPolicyOnFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "UpdateCustomerPolicyOnFraudNotDetectedRule",
      eventPattern: {
        source: [FraudEvents.SOURCE],
        detailType: [FraudEvents.FRAUD_NOT_DETECTED],
        detail: {
          documentType: ["CAR"],
          fraudType: ["SIGNUP.CAR"],
        },
      },
      targets: [new SfnStateMachine(updatePolicyStepFunction)],
    });

    this.customerMetricsWidget = createGraphWidget("Customer Summary", [
      createMetric(
        CustomerEvents.CUSTOMER_ACCEPTED,
        CustomerEvents.CUSTOMER_SOURCE,
        "Customers Accepted"
      ),
      createMetric(
        CustomerEvents.CUSTOMER_REJECTED,
        CustomerEvents.CUSTOMER_SOURCE,
        "Customers Rejected"
      ),
      createMetric(
        CustomerEvents.CUSTOMER_SUBMITTED,
        CustomerEvents.SIGNUP_SOURCE,
        "Customers Submitted"
      ),
    ]);
  }
}
