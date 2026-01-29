// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { Buffer } from "node:buffer";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

// Nova 2 Lite inference profile
const MODEL_ID = "us.amazon.nova-2-lite-v1:0";

// Tool definitions for structured output
const tools = [
  {
    toolSpec: {
      name: "report_car_analysis",
      description: "Report the color and damage analysis results for a car image",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            vehicle_type: {
              type: "object",
              description: "The type of vehicle with confidence score",
              properties: {
                Name: {
                  type: "string",
                  description: "The vehicle type (e.g., sedan, suv, coupe, van, truck)"
                },
                Confidence: {
                  type: "number",
                  description: "Confidence score between 0 and 100"
                }
              },
              required: ["Name", "Confidence"]
            },
            color: {
              type: "object",
              description: "The primary color of the car with confidence score",
              properties: {
                Name: {
                  type: "string",
                  description: "The color name (e.g., red, blue, green, white, black, silver, gray)"
                },
                Confidence: {
                  type: "number",
                  description: "Confidence score between 0 and 100"
                }
              },
              required: ["Name", "Confidence"]
            },
            damage: {
              type: "object",
              description: "The damage status of the car with confidence score",
              properties: {
                Name: {
                  type: "string",
                  description: "The damage level: 'none', 'minor', 'moderate', or 'severe'"
                },
                Confidence: {
                  type: "number",
                  description: "Confidence score between 0 and 100"
                }
              },
              required: ["Name", "Confidence"]
            }
          },
          required: ["vehicle_type", "color", "damage"]
        }
      }
    }
  }
];

exports.handler = async function (event) {
  let resp = {};
  let analyzedFieldAndValues = {};

  const buffer = await getImageFromS3(event);

  // Determine if this is signup or claims based on filename
  let type = "";
  let analysisPrompt = "";
  
  if (event.detail.object.key.endsWith("car.jpg")) {
    type = "signup";
    analysisPrompt = "Analyze this car image and identify: 1) the vehicle type (sedan, suv, coupe, van, truck, etc.), 2) the primary color of the vehicle, and 3) assess if there is any visible damage. If no damage is visible, report 'none'. For each attribute, provide a confidence score between 0-100. Use the report_car_analysis tool to provide your findings.";
  } else if (event.detail.object.key.endsWith("damagedCar.jpg")) {
    type = "claims";
    analysisPrompt = "Analyze this car image carefully and identify: 1) the vehicle type (sedan, suv, coupe, van, truck, etc.), 2) the primary color, and 3) assess the damage level (none, minor, moderate, or severe). Look for dents, scratches, broken parts, or other damage. For each attribute, provide a confidence score between 0-100. Use the report_car_analysis tool to provide your findings.";
  } else {
    analysisPrompt = "Analyze this car image and identify: 1) the vehicle type, 2) the primary color, and 3) any visible damage. For each attribute, provide a confidence score between 0-100. Use the report_car_analysis tool to provide your findings.";
  }

  // Analyze the image using Nova 2 Lite with tool use
  const analysis = await analyzeCarWithNova(buffer, analysisPrompt);
  
  if (analysis.vehicle_type) {
    analyzedFieldAndValues["vehicle_type"] = analysis.vehicle_type;
  }
  
  if (analysis.color) {
    analyzedFieldAndValues["color"] = analysis.color;
  }
  
  if (analysis.damage) {
    analyzedFieldAndValues["damage"] = analysis.damage;
  }

  resp["analyzedFieldAndValues"] = analyzedFieldAndValues;
  resp["type"] = type;

  return resp;
};

async function analyzeCarWithNova(imageBuffer, prompt) {
  try {
    const input = {
      modelId: MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format: "jpeg",
                source: {
                  bytes: imageBuffer
                }
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      toolConfig: {
        tools: tools,
        toolChoice: {
          tool: {
            name: "report_car_analysis"
          }
        }
      }
    };

    console.log("Calling Nova 2 Lite for car analysis...");
    const command = new ConverseCommand(input);
    const response = await bedrockClient.send(command);

    console.log("Nova 2 Lite response:", JSON.stringify(response, null, 2));

    // Extract tool use results
    if (response.output?.message?.content) {
      for (const content of response.output.message.content) {
        if (content.toolUse) {
          const toolInput = content.toolUse.input;
          console.log("Tool use input:", JSON.stringify(toolInput, null, 2));
          return {
            vehicle_type: toolInput.vehicle_type || { Name: "unknown", Confidence: 0 },
            color: toolInput.color || { Name: "unknown", Confidence: 0 },
            damage: toolInput.damage || { Name: "none", Confidence: 0 }
          };
        }
      }
    }

    // Fallback if no tool use found
    console.warn("No tool use found in response, using defaults");
    return {
      vehicle_type: { Name: "unknown", Confidence: 0 },
      color: { Name: "unknown", Confidence: 0 },
      damage: { Name: "none", Confidence: 0 }
    };

  } catch (error) {
    console.error("Error analyzing car with Nova 2 Lite:", error);
    throw error;
  }
}

async function getImageFromS3(event) {
  const command = new GetObjectCommand({
    Bucket: event.detail.bucket.name,
    Key: event.detail.object.key,
  });

  const getObjectCommandOutput = await s3Client.send(command);

  const chunks = [];
  for await (const chunk of getObjectCommandOutput.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
