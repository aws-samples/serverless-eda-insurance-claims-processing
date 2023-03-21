// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  Choice,
  Condition,
  InputType,
  JsonPath,
  LogLevel,
  Parallel,
  Pass,
  StateMachine,
  StateMachineType,
  TaskInput,
} from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import {
  DynamoPutItem,
  DynamoPutItemProps,
  DynamoAttributeValue,
  DynamoDeleteItemProps,
  DynamoDeleteItem,
  LambdaInvoke,
  CallAwsService,
  EventBridgePutEvents,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as logs from "aws-cdk-lib/aws-logs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Bucket } from "aws-cdk-lib/aws-s3";

export interface CreateCustomerStepFunctionProps {
  requestTable: Table;
  customerTable: Table;
  policyTable: Table;
  putPolicyRequestsFunction: NodejsFunction;
  validatorFunction: NodejsFunction;
  psURLGeneratorFunction: NodejsFunction;
  documentsBucket: Bucket;
  eventBus: EventBus;
}

export class CreateCustomerStepFunction extends StateMachine {
  constructor(
    scope: Construct,
    id: string,
    props: CreateCustomerStepFunctionProps
  ) {
    const logGroup = new logs.LogGroup(scope, "CreateCustomerSFLogGroup");

    const parseDataState = createParseDataState(scope);
    const saveReqInDBStep = createSaveReqInDBStep(props, scope);
    const validationStep = createValidationStep(scope, props);
    const generateUUIDStep = createGenerateUUIDStep(scope);
    const saveCustomerStep = createSaveCustomerStep(scope, props);
    const errorHandler = createErrorHandler(scope);
    const getPutPolicyReqStep = createGetPutPolicyReqStep(scope, props);
    const savePoliciesStep = createSavePoliciesStep(scope, props);
    const generatePreSignedURLsStep = createGeneratePresignedURLStep(
      scope,
      props
    );
    const deleteItemStep = createDeleteItemStep(props, scope);
    const acceptCustomerChoice = createAcceptCustomerChoice(
      scope,
      generateUUIDStep,
      props,
      deleteItemStep
    );
    const putCustomerAcceptedEventStep = createPutCustomerAcceptedEventStep(
      scope,
      props,
      deleteItemStep,
      errorHandler
    );

    generateUUIDStep.next(saveCustomerStep);
    saveCustomerStep.addCatch(errorHandler);
    savePoliciesStep.addCatch(errorHandler);
    getPutPolicyReqStep.next(savePoliciesStep);
    saveCustomerStep.next(getPutPolicyReqStep);
    savePoliciesStep.next(generatePreSignedURLsStep);
    generatePreSignedURLsStep.next(putCustomerAcceptedEventStep);
    saveReqInDBStep.next(validationStep);
    validationStep.next(acceptCustomerChoice);
    parseDataState.next(saveReqInDBStep);

    super(scope, id, {
      definition: parseDataState,
      stateMachineType: StateMachineType.EXPRESS,
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true,
    });
  }
}

function createErrorHandler(scope: Construct): Pass {
  return new Pass(scope, "Error Handler", {
    result: { value: { savedCustomer: false } },
  });
}

function createPutCustomerAcceptedEventStep(
  scope: Construct,
  props: CreateCustomerStepFunctionProps,
  deleteItemStep: DynamoDeleteItem,
  errorHandler: Pass
): Choice {
  const processSuccessChoice = new Choice(scope, "Processing Successful?")
    .when(
      Condition.and(
        Condition.isPresent("$.presignedURLs.dlURL"),
        Condition.stringGreaterThan("$.presignedURLs.dlURL", ""),
        Condition.isPresent("$.presignedURLs.vehicleURL"),
        Condition.stringGreaterThan("$.presignedURLs.vehicleURL", "")
      ),
      new EventBridgePutEvents(scope, "Put Customer Accepted Event", {
        resultPath: "$.putAcceptedEventResult",
        entries: [
          {
            detail: TaskInput.fromObject({
              "customerId.$": "$.uuid.uuid",
              "driversLicenseImageUrl.$": "$.presignedURLs.dlURL",
              "carImageUrl.$": "$.presignedURLs.vehicleURL",
            }),
            eventBus: props.eventBus,
            detailType: "Customer.Accepted",
            source: "customer.service",
          },
        ],
      }).next(deleteItemStep)
    )
    .otherwise(errorHandler);

  return processSuccessChoice;
}

function createGeneratePresignedURLStep(
  scope: Construct,
  props: CreateCustomerStepFunctionProps
): LambdaInvoke {
  return new LambdaInvoke(scope, "Generate PreSigned URLs", {
    lambdaFunction: props.psURLGeneratorFunction,
    resultPath: "$.presignedURLs",
    payload: {
      type: InputType.OBJECT,
      value: {
        urlreq: [
          {
            Bucket: props.documentsBucket.bucketName,
            "Key.$":
              "States.Format('customers/{}/documents/dl.jpg', $.uuid.uuid)",
            ContentType: "application/jpg",
            id: "dlURL",
          },
          {
            Bucket: props.documentsBucket.bucketName,
            "Key.$":
              "States.Format('customers/{}/documents/policies/{}/car.jpg', $.uuid.uuid, $.putPolicyReq.payload[0].PutRequest.Item.PK.S)",
            ContentType: "application/jpg",
            id: "vehicleURL",
          },
        ],
      },
    },
    resultSelector: {
      "dlURL.$": "$.Payload.dlURL",
      "vehicleURL.$": "$.Payload.vehicleURL",
    },
  });
}

function createSavePoliciesStep(
  scope: Construct,
  props: CreateCustomerStepFunctionProps
): CallAwsService {
  return new CallAwsService(scope, "Save Policies", {
    service: "dynamodb",
    action: "batchWriteItem",
    iamResources: [props.policyTable.tableArn],
    parameters: {
      RequestItems: {
        [`${props.policyTable.tableName}.$`]: "$.putPolicyReq.payload",
      },
    },
    resultPath: "$.savePoliciesResult",
  });
}

function createGetPutPolicyReqStep(
  scope: Construct,
  props: CreateCustomerStepFunctionProps
): LambdaInvoke {
  return new LambdaInvoke(scope, "Get PutPolicy Req", {
    lambdaFunction: props.putPolicyRequestsFunction,
    resultPath: "$.putPolicyReq",
    resultSelector: { "payload.$": "$.Payload" },
  });
}

function createSaveCustomerStep(
  scope: Construct,
  props: CreateCustomerStepFunctionProps
): CallAwsService {
  return new CallAwsService(scope, "Save Customer", {
    service: "dynamodb",
    action: "batchWriteItem",
    iamResources: [props.customerTable.tableArn],
    parameters: {
      RequestItems: {
        [props.customerTable.tableName]: [
          {
            PutRequest: {
              Item: {
                PK: {
                  "S.$": "$.uuid.uuid",
                },
                SK: {
                  S: "COGNITO_IDENTITY_ID",
                },
                cognitoIdentityId: {
                  "S.$": "$.cognitoIdentityId",
                },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                PK: {
                  "S.$": "$.uuid.uuid",
                },
                SK: {
                  "S.$": "$.data.identity.email",
                },
                firstname: {
                  "S.$": "$.data.firstname",
                },
                lastname: {
                  "S.$": "$.data.lastname",
                },
                ssn: {
                  "S.$": "$.data.identity.ssn",
                },
                street: {
                  "S.$": "$.data.address.street",
                },
                city: {
                  "S.$": "$.data.address.city",
                },
                state: {
                  "S.$": "$.data.address.state",
                },
                zip: {
                  "S.$": "$.data.address.zip",
                },
              },
            },
          },
        ],
      },
    },
    resultPath: "$.saveCustomerResult",
  });
}

function createGenerateUUIDStep(scope: Construct): Pass {
  return new Pass(scope, "GenerateUUID", {
    resultPath: "$.uuid",
    parameters: {
      "uuid.$": "States.UUID()",
    },
  });
}

function createAcceptCustomerChoice(
  scope: Construct,
  saveDataStep: Pass,
  props: CreateCustomerStepFunctionProps,
  deleteItemStep: DynamoDeleteItem
): Choice {
  const putRejectEventStep = new EventBridgePutEvents(
    scope,
    "Put Reject Customer Event",
    {
      resultPath: "$.putRejectedEventResult",
      entries: [
        {
          detail: TaskInput.fromObject({
            error: "Address or Identity Validation Failed",
          }),
          eventBus: props.eventBus,
          detailType: "Customer.Rejected",
          source: "customer.service",
        },
      ],
    }
  );

  putRejectEventStep.next(deleteItemStep);

  const acceptCustomerChoice = new Choice(scope, "Accept Customer?")
    .when(
      Condition.and(
        Condition.booleanEquals("$.validationResults.validAddress", true),
        Condition.booleanEquals("$.validationResults.validIdentity", true)
      ),
      saveDataStep
    )
    .otherwise(putRejectEventStep);
  return acceptCustomerChoice;
}

function createValidationStep(
  scope: Construct,
  props: CreateCustomerStepFunctionProps
): Parallel {
  const validation = new Parallel(scope, "Validation", {
    resultPath: "$.validationResults",
    resultSelector: {
      "validAddress.$": "$.[0].validAddress",
      "validIdentity.$": "$.[1].validIdentity",
    },
  });

  const validateAddress = new Choice(scope, "Validate Address")
    .when(
      Condition.and(
        Condition.isPresent("$.data.address.street"),
        Condition.stringGreaterThan("$.data.address.street", ""),
        Condition.isPresent("$.data.address.city"),
        Condition.stringGreaterThan("$.data.address.city", ""),
        Condition.isPresent("$.data.address.state"),
        Condition.stringGreaterThan("$.data.address.state", ""),
        Condition.isPresent("$.data.address.zip"),
        Condition.stringGreaterThan("$.data.address.zip", "")
      ),
      new Pass(scope, "Valid Address", {
        result: { value: { validAddress: true } },
      })
    )
    .otherwise(
      new Pass(scope, "Invalid Address", {
        result: { value: { validAddress: false } },
      })
    );

  const validateIdentity = new LambdaInvoke(scope, "Validate Identity", {
    lambdaFunction: props.validatorFunction,
    resultPath: "$",
    resultSelector: { "validIdentity.$": "$.Payload" },
    payload: {
      value: [
        {
          "value.$": "$.data.identity.email",
          type: "email",
        },
        {
          "value.$": "$.data.identity.ssn",
          type: "ssn",
        },
      ],
      type: InputType.OBJECT,
    },
  });
  validation.branch(validateAddress, validateIdentity);
  return validation;
}

function createDeleteItemStep(
  props: CreateCustomerStepFunctionProps,
  scope: Construct
): DynamoDeleteItem {
  const deleteItemProps: DynamoDeleteItemProps = {
    table: props.requestTable,
    key: {
      PK: DynamoAttributeValue.fromString(JsonPath.stringAt("$.PK")),
      SK: DynamoAttributeValue.fromString(JsonPath.stringAt("$.SK")),
    },
  };
  const deleteItemStep = new DynamoDeleteItem(
    scope,
    "DeleteItemStep",
    deleteItemProps
  );
  return deleteItemStep;
}

function createSaveReqInDBStep(
  props: CreateCustomerStepFunctionProps,
  scope: Construct
): DynamoPutItem {
  const putItemProps: DynamoPutItemProps = {
    table: props.requestTable,
    item: {
      PK: DynamoAttributeValue.fromString(JsonPath.stringAt("$.PK")),
      SK: DynamoAttributeValue.fromString(JsonPath.stringAt("$.SK")),
      data: DynamoAttributeValue.fromString(
        JsonPath.stringAt("States.JsonToString($.data)")
      ),
    },
    resultPath: "$.PutItemResult",
    resultSelector: {
      "HttpStatusCode.$": "$.SdkHttpMetadata.HttpStatusCode",
    },
  };

  const putItemStep = new DynamoPutItem(
    scope,
    "Save Request in DB",
    putItemProps
  );
  return putItemStep;
}

function createParseDataState(scope: Construct): Pass {
  return new Pass(scope, "Parse Data", {
    parameters: {
      "PK.$": "$.id",
      "SK.$": "$.detail-type",
      "data.$": "States.StringToJson($.detail.data)",
      "cognitoIdentityId.$": "$.detail.cognitoIdentityId",
    },
  });
}
