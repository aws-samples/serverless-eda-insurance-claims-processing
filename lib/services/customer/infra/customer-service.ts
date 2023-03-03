// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  CfnOutput,
  RemovalPolicy,
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
  SfnStateMachine,
} from "aws-cdk-lib/aws-events-targets";
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
import { Construct } from "constructs";
import { CreateCustomerStepFunction } from "./step-functions/createCustomer";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { UpdatePolicyStepFunction } from "./step-functions/updatePolicy";
import { Bucket } from "aws-cdk-lib/aws-s3";


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
};

interface CustomerServiceProps {
  allEventsLogGroup: LogGroup;
  bus: EventBus;
  documentsBucket: Bucket;

  lambdaFunctions: NodejsFunction[];
  apis: RestApi[];
  rules: string[];
  stateMachines: StateMachine[];
}

export class CustomerService extends Construct {
  public customerTable: Table;
  public policyTable: Table;
  public customerUpdateLambdaFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: CustomerServiceProps) {
    super(scope, id);

    console.log(props.bus.eventBusName);
    const bus = props.bus;

    const apiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "SignupAPIGWLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        logGroupName: "/aws/events/customerSignupAPIGateway",
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
    const signupLambdaFunction = new NodejsFunction(this, "SignupLambdaFunction", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/signup.js`,
      environment: {
        BUS_NAME: bus.eventBusName,
      },
    });

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

    // Create Create Customer Lambda reading from SQS
    const customerLambdaRole = new Role(
      this,
      "CustomerServiceFunctionRole",
      {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    const customerCreateLambdaFunction = new NodejsFunction(
      this,
      "CustomerCreateLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/create.js`,
        role: customerLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: this.customerTable.tableName,
          POLICY_TABLE_NAME: this.policyTable.tableName,
          BUCKET_NAME: props.documentsBucket.bucketName,
        },
      }
    );

    // Give Lambda permission to upload documents to bucket. Same permission will be used on pre-signed URL
    props.documentsBucket.grantWrite(customerCreateLambdaFunction);
    customerCreateLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);
    this.customerTable.grantWriteData(customerCreateLambdaFunction);
    this.policyTable.grantWriteData(customerCreateLambdaFunction);

    this.customerUpdateLambdaFunction = new NodejsFunction(
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

    this.customerUpdateLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);
    this.customerTable.grantWriteData(this.customerUpdateLambdaFunction);

    const validatorFunction = new NodejsFunction(scope, "ValidatorFunction", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/validator.js`,
    });

    const putPolicyRequestsFunction = new NodejsFunction(scope, "PutPolicyRequestsFunction", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/putPolicyRequests.js`,
    });

    const preSignedURLGeneratorFunction = new NodejsFunction(scope, "PreSignedURLGenerator", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/preSignedURLGenerator.js`,
    });

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

    // const createMetricsLambdaFunction = createMetricsFunction(this);

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
      targets: [
        //new LambdaFunction(notificationLambdaFunction)
      ],
    });

    // Custom Event Bus Rule (Event Type: Customer.Rejected)
    new Rule(this, "CustomerRejectedEventsRule", {
      eventBus: bus,
      ruleName: "CustomerRejectedEventsRule",
      eventPattern: {
        detailType: ["Customer.Rejected"],
      },
      targets: [
        //new LambdaFunction(notificationLambdaFunction)
      ],
    });

    new Rule(this, "UpdateCustomerPolicyOnFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "UpdateCustomerPolicyOnFraudNotDetectedRule",
      eventPattern: {
        source: ["fraud.service"],
        detailType: ["Fraud.Not.Detected"],
        detail: {
          documentType: ["CAR"],
          fraudType: ["SIGNUP.CAR"],
        },
      },
      targets: [
        new SfnStateMachine(updatePolicyStepFunction),
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
        ],
      },
      targets: [
        new CloudWatchLogGroup(props.allEventsLogGroup),
        // new LambdaFunction(createMetricsLambdaFunction),
      ],
    });

    const getCustomerFunction = new NodejsFunction(scope, "GetCustomerFunction", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/get.js`,
      environment: {
        CUSTOMER_TABLE_NAME: this.customerTable.tableName,
        POLICY_TABLE_NAME: this.policyTable.tableName,
      },
    });

    this.customerTable.grantReadData(getCustomerFunction);
    this.policyTable.grantReadData(getCustomerFunction);

    const customerApi = new RestApi(scope, "CustomerApi", {
      defaultCorsPreflightOptions: { allowOrigins: ["*"], allowMethods: ["GET"] },
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
    new CfnOutput(scope, "customer-api-endpoint", {
      value: customerApi.url,
      exportName: "customer-api-endpoint",
    });

    addDefaultGatewayResponse(customerApi);

    props.lambdaFunctions.push(preSignedURLGeneratorFunction);
    props.lambdaFunctions.push(putPolicyRequestsFunction);
    props.lambdaFunctions.push(getCustomerFunction);
    props.lambdaFunctions.push(this.customerUpdateLambdaFunction);
    props.lambdaFunctions.push(customerCreateLambdaFunction);
    props.lambdaFunctions.push(signupLambdaFunction);

    props.apis.push(signupApi);
    props.apis.push(customerApi);

    props.rules.push("CustomerAcceptedEventsRule");
    props.rules.push("CustomerEventsRule");
    props.rules.push("CustomerRejectedEventsRule");
    props.rules.push("AllEventLogsRule");

    props.stateMachines.push(createCustomerStepFunction);
    props.stateMachines.push(updatePolicyStepFunction);

    // TODO: Create Customer Service specific Business and Operational Metrics

    // new ClaimsProcessingCWDashboard(this, "Claims Processing Dashboard", {
    //   dashboardName: "Claims-Processing-Dashboard",
    //   lambdaFunctions: this.lambdaFunctions,
    //   apis: this.apis,
    //   rules: this.rules,
    //   stateMachines: this.stateMachines,
    // });
  }
}
