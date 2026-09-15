// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insurance Claims Processing",
  description: "Serverless EDA Insurance Claims Processing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
