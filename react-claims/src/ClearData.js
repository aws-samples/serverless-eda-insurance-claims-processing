// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Button, Loader, Flex } from "@aws-amplify/ui-react";
import { API } from "aws-amplify";

class ClearData extends React.Component {
  reset;

  constructor(props) {
    super(props);
    this.state = { deleteInProgress: false };
    this.reset = props.reset;

    this.toggleState = this.toggleState.bind(this);
    this.clearAllData = this.clearAllData.bind(this);
  }

  toggleState() {
    this.setState({ deleteInProgress: !this.state.deleteInProgress });
  }
  async clearAllData() {
    this.toggleState();

    return new Promise((resolve, reject) => {
      const apiName = "CleanupApi";
      const path = "clearAllData";
      const myInit = {
        headers: {},
      };

      API.del(apiName, path, myInit)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          this.toggleState();
          this.reset();
        });
    });
  }

  render() {
    return (
      <Flex>
        <Button
          variation="destructive"
          onClick={this.clearAllData}
          display={!this.state.deleteInProgress ? "" : "none"}
        >
          CLEAR ALL DATA
        </Button>

        <Loader
          width="3rem"
          height="3rem"
          display={this.state.deleteInProgress ? "" : "none"}
        />
      </Flex>
    );
  }
}

export default ClearData;
