// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import {
  Flex,
  TextField,
  CheckboxField,
  Button,
} from "@aws-amplify/ui-react";
import date from 'date-and-time';
import { API } from "aws-amplify";

class TF extends React.Component {
  onChange;
  constructor(props) {
    super(props);
    this.state = {};
    this.onChange = props.onChange;
  }

  static getDerivedStateFromProps(props, state) {
    return {
      type: props.type,
      name: props.name,
      input: props.input,
    };
  }

  render() {
    return (
      <TextField
        label={this.state.name}
        value={this.state.input.value}
        name={this.state.name}
        type={this.state.type}
        onChange={this.onChange}
        hasError={this.state.input.hasError}
        errorMessage={this.state.input.errorMessage}
      />
    );
  }
}

class ClaimForm extends React.Component {
  constructor(props) {
    super(props);
    const futureDate = date.format(date.addDays(new Date(), 3), 'YYYY-MM-DD');
    const futureDate = date.format(date.addDays(new Date(), 3), 'YYYY-MM-DD');

    this.state = {
      display: props.display,
      occurrenceDateTime: { value: futureDate, hasError: false, errorMessage: "" },
      occurrenceDateTime: { value: futureDate, hasError: false, errorMessage: "" },
      country: { value: "US", hasError: false, errorMessage: "" },
      state: { value: "AZ", hasError: false, errorMessage: "" },
      city: { value: "Phoenix", hasError: false, errorMessage: "" },
      zip: { value: "85007", hasError: false, errorMessage: "" },
      road: { value: "124 Main St", hasError: false, errorMessage: "" },
      description: {
        value: "Rear-End Collision",
        hasError: false,
        errorMessage: "",
      },
      numberOfPassengers: { value: "1", hasError: false, errorMessage: "" },
      policeReport_isFiled: { value: true, hasError: false, errorMessage: "" },
      reportOrReceiptAvailable: {
        value: true,
        hasError: false,
        errorMessage: "",
      },
      other_insuranceId: {
        value: "111111111111",
        hasError: false,
        errorMessage: "",
      },
      other_insuranceCompany: {
        value: "Other Insurance Co.",
        hasError: false,
        errorMessage: "",
      },
      driversLicenseNumber: {
        value: "S99988801",
        hasError: false,
        errorMessage: "",
      },
      other_firstName: { value: "John", hasError: false, errorMessage: "" },
      other_lastName: { value: "Doe", hasError: false, errorMessage: "" },
    };

    this.submitClaim = this.submitClaim.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: { value: value },
    });
  }

  static getDerivedStateFromProps(props, state) {
    return {
      display: props.display,
      customer: props.customer,
      uploadCarDamageUrl: props.uploadCarDamageUrl,
    };
  }

  async submitClaim() {
    const body = {
      incident: {
        occurrenceDateTime: this.state.occurrenceDateTime.value,
        fnolDateTime: date.format(new Date(), 'YYYY-MM-DD'),
        fnolDateTime: date.format(new Date(), 'YYYY-MM-DD'),
        location: {
          country: this.state.country.value,
          state: this.state.state.value,
          city: this.state.city.value,
          zip: this.state.zip.value,
          road: this.state.road.value,
        },
        description: this.state.description.value,
      },
      policy: {
        id:
          this.state.customer && this.state.customer.policies
            ? this.state.customer.policies[0].PK.S
            : "",
      },
      personalInformation: {
        customerId: this.state.customer ? this.state.customer.PK : "",
        driversLicenseNumber: this.state.driversLicenseNumber.value, //"D08954142", //Where to get this value from?
        isInsurerDriver: true,
        licensePlateNumber: "",
        numberOfPassengers: this.state.numberOfPassengers.value,
      },
      policeReport: {
        isFiled: this.state.policeReport_isFiled.value ?? false,
        reportOrReceiptAvailable:
          this.state.reportOrReceiptAvailable.value ?? false,
      },
      otherParty: {
        insuranceId: this.state.other_insuranceId.value,
        insuranceCompany: this.state.other_insuranceCompany.value,
        firstName: this.state.other_firstName.value,
        lastName: this.state.other_lastName.value,
      },
    };

    const apiName = "FnolApi";
    const path = "fnol";
    const myInit = {
      body: body, // replace this with attributes you need
      headers: {}, // OPTIONAL
    };

    await API.post(apiName, path, myInit);
  }

  render() {
    return (
      <Flex
        direction="column"
        justifyContent="flex-start"
        alignItems="flex-start"
        alignContent="flex-start"
        wrap="nowrap"
        gap="1rem"
        display={this.state.display}
      >
        <TF
          name="occurrenceDateTime"
          type="date"
          input={this.state.occurrenceDateTime}
          onChange={this.handleInputChange}
        />
        <Flex direction="row">
          <TF
            name="country"
            type="text"
            input={this.state.country}
            onChange={this.handleInputChange}
          />
          <TF
            name="state"
            type="text"
            input={this.state.state}
            onChange={this.handleInputChange}
          />
          <TF
            name="city"
            type="text"
            input={this.state.city}
            onChange={this.handleInputChange}
          />
          <TF
            name="zip"
            type="text"
            input={this.state.zip}
            onChange={this.handleInputChange}
          />
          <TF
            name="road"
            type="text"
            input={this.state.road}
            onChange={this.handleInputChange}
          />
        </Flex>
        <Flex direction="row">
          <TF
            name="description"
            type="text"
            input={this.state.description}
            onChange={this.handleInputChange}
          />
          <TF
            name="numberOfPassengers"
            type="number"
            input={this.state.numberOfPassengers}
            onChange={this.handleInputChange}
          />
          <TF
            name="driversLicenseNumber"
            type="text"
            input={this.state.driversLicenseNumber}
            onChange={this.handleInputChange}
          />
          <CheckboxField
            name="policeReport_isFiled"
            label="policeReport_isFiled"
            onChange={this.handleInputChange}
            checked={this.state.policeReport_isFiled.value}
          />
          <CheckboxField
            name="reportOrReceiptAvailable"
            label="reportOrReceiptAvailable"
            onChange={this.handleInputChange}
            checked={this.state.reportOrReceiptAvailable.value}
          />
        </Flex>
        <Flex direction="row">
          <TF
            name="other_insuranceId"
            type="text"
            input={this.state.other_insuranceId}
            onChange={this.handleInputChange}
          />
          <TF
            name="other_insuranceCompany"
            type="text"
            input={this.state.other_insuranceCompany}
            onChange={this.handleInputChange}
          />
          <TF
            name="other_firstName"
            type="text"
            input={this.state.other_firstName}
            onChange={this.handleInputChange}
          />
          <TF
            name="other_lastName"
            type="text"
            input={this.state.other_lastName}
            onChange={this.handleInputChange}
          />
        </Flex>
        <Button variation="primary" onClick={this.submitClaim}>
          Submit Claim
        </Button>
      </Flex>
    );
  }
}

export default ClaimForm;