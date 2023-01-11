// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { Divider, Flex, Button, Text, Image } from "@aws-amplify/ui-react";
import * as axios from "axios";

class UploadFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "Updates will go here.",
      readyToUpload: true,
      statusMessage: "",
      display: props.display,
      images: props.images,
      title: props.title,
    };

    this.uploadToS3 = this.uploadToS3.bind(this);
    this.selectImage = this.selectImage.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    return {
      s3url: props.s3URL,
      display: props.display,
    };
  }

  selectImage(event) {
    const index = parseInt(event.target.attributes.index.nodeValue);
    let images = this.state.images;
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (i === index) {
        image.selected = !image.selected;
      } else {
        image.selected = false;
      }
    }
    this.setState({
      images: images,
      selectedImgIndx: index,
      readyToUpload: true,
      statusMessage: "",
    });
  }

  uploadToS3() {
    if (this.state.selectedImgIndx !== undefined) {
      const image = this.state.images[this.state.selectedImgIndx];
      fetch(image.path)
        .then((res) => res.blob())
        .then((blob) => {
          axios
            .put(this.state.s3url, blob)
            .then((res) => {
              this.setState({
                readyToUpload: false,
                selectedFile: undefined,
                statusMessage: "File uploaded successfully.",
              });
            })
            .catch((err) => console.error(err));
        });
    }
  }

  render() {
    return (
      <div>
        <br></br>
        <Flex
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
          alignContent="flex-start"
          wrap="nowrap"
          gap="1rem"
          display={this.state.display}
        >
          <Text fontWeight="bold">{this.state.title}</Text>
          <Flex direction="row" wrap="wrap">
            <ImageOptions
              images={this.state.images}
              selectImage={this.selectImage}
            />
          </Flex>
          <Button
            variation="primary"
            onClick={this.uploadToS3}
            isDisabled={!this.state.readyToUpload}
          >
            Upload
          </Button>
          <Text>{this.state.statusMessage}</Text>

          <Divider size="large" orientation="horizontal" />
        </Flex>
      </div>
    );
  }
}

class ImageOptions extends React.Component {
  selectImage;

  constructor(props) {
    super(props);
    this.state = { images: props.images ? props.images : [] };
    this.selectImage = props.selectImage;
  }

  render() {
    let imageComponents = [];
    const images = this.state.images;
    let i = 0;
    if (images && images.length > 0) {
      images.forEach((image) => {
        imageComponents.push(
          <Image
            index={i}
            key={i}
            alt={image.path}
            src={image.path}
            backgroundColor="initial"
            height="25%"
            width="25%"
            opacity="100%"
            border={image.selected ? "5px solid #555" : ""}
            onClick={this.selectImage}
          />
        );
        i++;
      });
    }
    return imageComponents;
  }
}

export default UploadFile;
