// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const config = {
  // Green Color Car
  // Return: { "Predictions": [{ "Name": "green", "Confidence": 95.76799774169922 }] }
  COLOR_DETECT_API:
    "https://webhook.site/7991c04c-02f9-413c-a0bc-2f39f90e6568",

  // Red Color Car
  // Return: { "Predictions": [{ "Name": "red", "Confidence": 97.56799774169922 }] }
  // COLOR_DETECT_API: "https://webhook.site/fb720eb9-e701-4376-9ffc-3f30f7691632/",

  // No Damage
  // Return: { "Predictions": [{ "Name": "unknown", "Confidence": 99.98300170898438 }] }
  // DAMAGE_DETECT_API: "https://webhook.site/b02ce4de-739a-4cb8-bae1-c904b4516aa5/",

  // Bumper Dent
  // Return: { "Predictions": [{ "Name": "bumper_dent", "Confidence": 84.26200103759766 }] }
  DAMAGE_DETECT_API:
    "https://webhook.site/7991c04c-02f9-413c-a0bc-2f39f90e6568",
};

export default config;
