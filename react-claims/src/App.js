// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import SignupForm from "./Signup";
import UpdateArea from "./Updates";
import { Divider, Grid, Card } from "@aws-amplify/ui-react";
import { withAuthenticator } from "@aws-amplify/ui-react";
import React from "react";
import ClaimForm from "./Claim";
import { API } from "aws-amplify";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { uploadDL: false, displayClaimForm: false, key: 1 };
    this.updateState = this.updateState.bind(this);
  }

  async updateState(key, value) {
    this.setState({ [key]: value });
    if (key === "completedReg" && value === true) {
      const customer = await this.getCustomer();
      this.setState({ customer: customer });
    }
  }

  getCustomer() {
    return new Promise((resolve, reject) => {
      const apiName = "CustomerApi";
      const path = "customer";
      const myInit = {
        headers: {},
      };
      API.get(apiName, path, myInit)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  render() {
    return (
      <div>
        <Grid
          columnGap="0.5rem"
          rowGap="0.5rem"
          templateColumns="60% 0% 40%"
          templateRows="1fr"
        >
          <Card columnStart="1" columnEnd="2" key={this.state.key}>
            <SignupForm
              updateState={this.updateState}
              driversLicenseImageUrl={this.state.driversLicenseImageUrl}
              getCustomer={this.getCustomer}
              completedReg={this.state.completedReg}
              carImageUrl={this.state.carImageUrl}
            />
            <ClaimForm
              display={this.state.displayClaimForm ? "" : "none"}
              customer={this.state.customer}
              uploadCarDamageUrl={this.state.uploadCarDamageUrl}
            />
          </Card>

          <Divider orientation="vertical" />

          <Card columnStart="3" columnEnd="-1">
            <UpdateArea updateState={this.updateState} />
          </Card>
          <Divider orientation="vertical" />
        </Grid>
      </div>
    );
  }
}

export default withAuthenticator(App);
