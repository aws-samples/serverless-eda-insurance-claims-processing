// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import SignupForm from "./Signup";
import UpdateArea from "./Updates";
import UploadFile from "./UploadFile";
import React from "react";
import ClaimForm from "./Claim";
import { API, Auth } from "aws-amplify";
import StepWizard from "react-step-wizard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faNewspaper, faCircleXmark, faCarBurst } from '@fortawesome/free-solid-svg-icons';
import {
  Divider,
  Grid, 
  Link,
  Card,
  Button,
  Flex,
  Heading,
  withAuthenticator } from "@aws-amplify/ui-react";

import dl_AZ from "./DL/dl_AZ.jpg";
import dl_MA from "./DL/dl_MA.jpg";
import dl_OH from "./DL/dl_OH.jpg";
import damaged_car_1 from "./Vehicles/damaged_car_1.jpeg";
import damaged_car_2 from "./Vehicles/damaged_car_2.jpeg";
import red_car from "./Vehicles/red_car.jpg";
import green_car from "./Vehicles/green_car.jpg";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { uploadDL: false, displayClaimForm: false, key: 1 };
    this.updateState = this.updateState.bind(this);
  }

  async updateState(key, value) {
    console.log(key, value)
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

  signOut() {
    Auth.signOut();
  }

  render() {
    return (
      <>
        
        <Grid
          columnGap="0.5rem"
          rowGap="0.5rem"
          templateColumns="65% 0% 35%"
          templateRows="1fr"
        >
          <Card columnStart="1" columnEnd="-1"  backgroundColor='hsl(130, 33%, 37%)'>
            <Flex width="100%">
              <Heading width='90%' level={3} color='hsl(130, 60%, 95%)'>
                <Flex><FontAwesomeIcon icon={faCarBurst} size="lg"/>Insurance claim form</Flex>
              </Heading>
              <Button variation="secondary" onClick={this.signOut}>
                <Flex><FontAwesomeIcon icon={faCircleXmark} size="lg"/> Sign Out </Flex> 
              </Button>
            </Flex>
          </Card>

          <Card columnStart="1" columnEnd="2" key={this.state.key}>
            <StepWizard>

              <SignupForm
                updateState={this.updateState}
                getCustomer={this.getCustomer}
                completedReg={this.state.completedReg}
              />

              <UploadFile
                s3URL={this.state.driversLicenseImageUrl}
                images={[{ path: dl_AZ }, { path: dl_MA }, { path: dl_OH }]}
                title="Upload Drivers License"
              />

              <UploadFile
                s3URL={this.state.carImageUrl}
                images={[{ path: red_car }, { path: green_car }]}
                title="Upload Vehicle Image"
              />  

              <ClaimForm
                customer={this.state.customer}
              />

              <UploadFile
                s3URL={this.state.uploadCarDamageUrl}
                images={[
                  { path: damaged_car_1 },
                  { path: damaged_car_2 },
                  { path: red_car },
                ]}
                title="Upload Vehicle Image"
              />

              <h1>Claim Submitted!</h1>

            </StepWizard>
          
          </Card>


          <Card columnStart="3" columnEnd="-1" variation="outlined" marginRight='15px'>
            <UpdateArea updateState={this.updateState}/>
          </Card>
          <Divider orientation="vertical" />

          <Card columnStart="1" columnEnd="-1" backgroundColor='hsl(130, 33%, 37%)'>
            <Flex direction="column" alignItems="flex-start">
              <Link color='hsl(130, 60%, 95%)' href="https://github.com/aws-samples/serverless-eda-insurance-claims-processing/">
                <Flex><FontAwesomeIcon icon={faGithub} size="lg"/> Github repository </Flex>
              </Link>
              <Link color='hsl(130, 60%, 95%)' href="https://aws.amazon.com/blogs/industries/building-a-modern-event-driven-application-for-insurance-claims-processing-part-1/">
                <Flex><FontAwesomeIcon icon={faNewspaper} size="lg"/> Blog series </Flex>
              </Link>
            </Flex>
          </Card>
        </Grid>
        </>
    );
  }
}

export default withAuthenticator(App);
