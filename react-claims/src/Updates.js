// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Button, Flex } from "@aws-amplify/ui-react";
import { PubSub, Auth, API, Amplify } from "aws-amplify";
import { AWSIoTProvider } from "@aws-amplify/pubsub";
import awsmobile from "./aws-exports";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

class UpdateArea extends React.Component {
  updateParent;

  constructor(props) {
    super(props);
    this.state = {
      messages: [],
    };

    this.updateParent = props.updateState;
    this.componentDidMount = this.componentDidMount.bind(this);
    this.updateMessages = this.updateMessages.bind(this);
    this.resetMessages = this.resetMessages.bind(this);
  }

  async resetMessages() {
    this.setState({
      messages: [],
    });
  }

  async updateMessages(data) {
    let messages = this.state.messages;
    messages.push(JSON.stringify(data.value, null, " "));
    this.setState({
      messages: messages,
    });

    const respData = data.value.detail;
    if (data.value["detail-type"] === "Customer.Accepted") {
      if (respData.driversLicenseImageUrl) {
        this.updateParent(
          "driversLicenseImageUrl",
          respData.driversLicenseImageUrl
        );
        this.updateParent("uploadDL", true);
      }
      if (respData.carImageUrl) {
        this.updateParent("carImageUrl", respData.carImageUrl);
      }
    } else if (respData.uploadCarDamageUrl) {
      this.updateParent("uploadCarDamageUrl", respData.uploadCarDamageUrl);
    } else if (
      respData.documentType === "DRIVERS_LICENSE" &&
      !respData.fraudType
    ) {
      this.updateParent("completedReg", true);
    }
  }

  async componentDidMount() {
    createSubscription(this.updateMessages);
  }

  render() {
    return (
      <div>
        <Flex
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          alignContent="flex-start"
          gap="1rem"
          style={{ overflowWrap: "anywhere" }}
        >
          <Button onClick={this.resetMessages}>Clear</Button>
          <Notifications messages={this.state.messages}></Notifications>
        </Flex>
      </div>
    );
  }
}

export default UpdateArea;

function createSubscription(nextFunc, isRetry) {
  var cdk_outputs_file = require("./cdk-outputs.json");

  Auth.currentCredentials().then(async (res) => {
    PubSub.removePluggable("AWSIoTProvider");
    Amplify.addPluggable(
      new AWSIoTProvider({
        aws_pubsub_region: awsmobile.aws_project_region,
        aws_pubsub_endpoint:
          "wss://" +
          cdk_outputs_file.ClaimsProcessingStack.iotendpointaddress +
          "/mqtt",
      })
    );

    await updateCustomer(res.identityId);

    PubSub.subscribe(res.identityId).subscribe({
      next: async (data) => {
        await nextFunc(data);
      },
      error: async (error) => {
        if (error.error.errorCode === 8 && !isRetry) {
          await updateCustomer(res.identityId);
          createSubscription(nextFunc, true);
        } else {
          console.error(error);
        }
      },
      complete: () => {},
    });
  });
}

async function updateCustomer() {
  const apiName = "IOTApi";
  const path = "iotPolicy";
  const myInit = {
    body: {},
    headers: {},
  };

  const resp = await API.put(apiName, path, myInit);
  return resp;
}

class Notifications extends React.Component {
  constructor(props) {
    super(props);
    this.state = { messages: props.messages ? props.messages : [] };
    this.onChange = props.onChange;
  }

  static getDerivedStateFromProps(props, state) {
    return {
      messages: props.messages,
    };
  }

  render() {
    let texts = [];
    const messages = this.state.messages;
    let i = 0;
    if (messages && messages.length > 0) {
      messages.forEach((message) => {
        texts.push(
          <SyntaxHighlighter
            key={++i}
            language="json"
            style={docco}
            wrapLongLines={true}
          >
            {message}
          </SyntaxHighlighter>
        );
      });
    }
    return texts.reverse();
  }
}
