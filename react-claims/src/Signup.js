// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Button, TextField, Flex } from "@aws-amplify/ui-react";
import { API, Auth } from "aws-amplify";
import ClearData from "./ClearData";

class SignupForm extends React.Component {
  initial_value = { value: "", hasError: false, errorMessage: "" };
  fields = [
    "first_name",
    "last_name",
    "email",
    "ssn",
    "address_street",
    "address_state",
    "address_city",
    "address_zip",
    "vehicle_make",
    "vehicle_color",
    "vehicle_milage",
    "vehicle_model",
    "vehicle_type",
    "vehicle_vin",
    "vehicle_year",
  ];
  updateParent;
  getCustomer;

  constructor(props) {
    super(props);
    this.state = {
      first_name: this.initial_value,
      last_name: this.initial_value,
      email: this.initial_value,
      ssn: this.initial_value,
      address_street: this.initial_value,
      address_state: this.initial_value,
      address_city: this.initial_value,
      address_zip: this.initial_value,
      vehicle_make: this.initial_value,
      vehicle_color: this.initial_value,
      vehicle_milage: this.initial_value,
      vehicle_model: this.initial_value,
      vehicle_type: this.initial_value,
      vehicle_vin: this.initial_value,
      vehicle_year: this.initial_value,
      signedUp: false,
    };

    this.updateParent = props.updateState;
    this.getCustomer = props.getCustomer;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.submitForm = this.submitForm.bind(this);
    this.validateInput = this.validateInput.bind(this);
    this.showClaimsForm = this.showClaimsForm.bind(this);
    this.reset = this.reset.bind(this);
  }

  async reset() {
    this.updateParent("key", new Date().getTime());
  }

  getValue(customer, field, defVal) {
    return {
      value: customer && customer[field] ? customer[field] : defVal,
    };
  }

  getPolicyValue(customer, field, defVal) {
    return {
      value:
        customer &&
        customer.policies &&
        customer.policies[0] &&
        customer.policies[0][field]
          ? customer.policies[0][field].S
          : defVal,
    };
  }

  async componentDidMount() {
    const user = await Auth.currentAuthenticatedUser();
    const customer = await this.getCustomer();

    await this.updateParent("customer", customer);

    this.setState({
      email: { value: user.attributes.email },
      first_name: this.getValue(customer, "firstname", "Connor"),
      last_name: this.getValue(customer, "lastname", "Sample"),
      ssn: this.getValue(customer, "ssn", "000000000"),
      address_street: this.getValue(customer, "street", "124 Main St"),
      address_city: this.getValue(customer, "city", "Phoenix"),
      address_state: this.getValue(customer, "state", "AZ"),
      address_zip: this.getValue(customer, "zip", "85007"),

      vehicle_make: this.getPolicyValue(customer, "make", "Honda"),
      vehicle_color: this.getPolicyValue(customer, "color", "Green"),
      vehicle_milage: this.getPolicyValue(customer, "mileage", "200000"),
      vehicle_model: this.getPolicyValue(customer, "model", "Accord"),
      vehicle_type: this.getPolicyValue(customer, "type", "Sedan"),
      vehicle_vin: this.getPolicyValue(customer, "vin", "1HGCF86461A130849"),
      vehicle_year: this.getPolicyValue(customer, "year", "2001"),

      signedUp: customer && customer.policies,
    });
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: { value: value },
    });
  }

  validateInput() {
    let is_valid = true;
    this.fields.forEach((field) => {
      if (!this.state[field].value) {
        this.setState({
          [field]: {
            value: "",
            hasError: true,
            errorMessage: "This field is mandatory",
          },
        });
        is_valid = false;
      }
    });
    return is_valid;
  }

  async submitForm() {
    if (!this.validateInput()) return;

    const apiName = "SignupAPI";
    const path = "signup";
    const myInit = {
      body: {
        firstname: this.state.first_name.value,
        lastname: this.state.last_name.value,
        identity: {
          email: this.state.email.value,
          ssn: this.state.ssn.value,
        },
        address: {
          street: this.state.address_street.value,
          city: this.state.address_city.value,
          state: this.state.address_state.value,
          zip: this.state.address_zip.value,
        },
        cars: [
          {
            make: this.state.vehicle_make.value,
            model: this.state.vehicle_model.value,
            color: this.state.vehicle_color.value,
            type: this.state.vehicle_type.value,
            year: this.state.vehicle_year.value,
            mileage: this.state.vehicle_milage.value,
            vin: this.state.vehicle_vin.value,
          },
        ],
      }, // replace this with attributes you need
      headers: {}, // OPTIONAL
    };

    await API.post(apiName, path, myInit);
  }

  async showClaimsForm() {
    await this.updateParent("displayClaimForm", true);
  }

  static getDerivedStateFromProps(props, state) {
    return {
      completedReg: props.completedReg,
    };
  }

  render() {
    return (
      <div>
        <Flex
          direction="column"
          justifyContent="space-between"
          alignItems="flex-start"
          alignContent="flex-start"
          wrap="nowrap"
          gap="1rem"
        >
          <Flex>
            <TextField
              label="First Name"
              value={this.state.first_name.value}
              name="first_name"
              onChange={this.handleInputChange}
              hasError={this.state.first_name.hasError}
              errorMessage={this.state.first_name.errorMessage}
            />
            <TextField
              label="Last Name"
              value={this.state.last_name.value}
              name="last_name"
              onChange={this.handleInputChange}
              hasError={this.state.last_name.hasError}
              errorMessage={this.state.last_name.errorMessage}
            />
            <TextField
              label="Email"
              value={this.state.email.value}
              name="email"
              onChange={this.handleInputChange}
              hasError={this.state.email.hasError}
              errorMessage={this.state.email.errorMessage}
            />
            <TextField
              label="SSN"
              value={this.state.ssn.value}
              name="ssn"
              onChange={this.handleInputChange}
              hasError={this.state.ssn.hasError}
              errorMessage={this.state.ssn.errorMessage}
            />
          </Flex>

          <Flex>
            <TextField
              label="Street"
              value={this.state.address_street.value}
              name="address_street"
              onChange={this.handleInputChange}
              hasError={this.state.address_street.hasError}
              errorMessage={this.state.address_street.errorMessage}
            />
            <TextField
              label="City"
              value={this.state.address_city.value}
              name="address_city"
              onChange={this.handleInputChange}
              hasError={this.state.address_city.hasError}
              errorMessage={this.state.address_city.errorMessage}
            />
            <TextField
              label="State"
              value={this.state.address_state.value}
              name="address_state"
              onChange={this.handleInputChange}
              hasError={this.state.address_state.hasError}
              errorMessage={this.state.address_state.errorMessage}
            />
            <TextField
              label="Zip"
              value={this.state.address_zip.value}
              name="address_zip"
              onChange={this.handleInputChange}
              hasError={this.state.address_zip.hasError}
              errorMessage={this.state.address_zip.errorMessage}
            />
          </Flex>

          <Flex>
            <TextField
              label="Make"
              value={this.state.vehicle_make.value}
              name="vehicle_make"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_make.hasError}
              errorMessage={this.state.vehicle_make.errorMessage}
            />
            <TextField
              label="Model"
              value={this.state.vehicle_model.value}
              name="vehicle_model"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_model.hasError}
              errorMessage={this.state.vehicle_model.errorMessage}
            />
            <TextField
              label="Color"
              value={this.state.vehicle_color.value}
              name="vehicle_color"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_color.hasError}
              errorMessage={this.state.vehicle_color.errorMessage}
            />
          </Flex>

          <Flex>
            <TextField
              label="Type"
              value={this.state.vehicle_type.value}
              name="vehicle_type"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_type.hasError}
              errorMessage={this.state.vehicle_type.errorMessage}
            />
            <TextField
              label="Year"
              value={this.state.vehicle_year.value}
              name="vehicle_year"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_year.hasError}
              errorMessage={this.state.vehicle_year.errorMessage}
            />
            <TextField
              label="Mileage"
              value={this.state.vehicle_milage.value}
              name="vehicle_milage"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_milage.hasError}
              errorMessage={this.state.vehicle_milage.errorMessage}
            />
            <TextField
              label="VIN"
              value={this.state.vehicle_vin.value}
              name="vehicle_vin"
              onChange={this.handleInputChange}
              hasError={this.state.vehicle_vin.hasError}
              errorMessage={this.state.vehicle_vin.errorMessage}
            />
          </Flex>

          <Flex>
            <Button
              variation="primary"
              onClick={this.submitForm}
            >
              Submit
            </Button>
          
            <ClearData reset={this.reset}> </ClearData>
          </Flex>
        </Flex>
      </div>
    );
  }
}

export default SignupForm;
