// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from "react";
import { Flex, Button, Heading, Text } from "@aws-amplify/ui-react";
import ClaimForm from "./Claim";
import { VoiceClaimComponent } from "./components/VoiceClaim";
import { getWebSocketEndpoint } from "./utils";

/**
 * ClaimWithVoice - Wrapper component that provides both voice and form-based claim submission
 * 
 * This component allows users to choose between:
 * 1. Voice-enabled claim submission (new feature)
 * 2. Traditional form-based claim submission (existing)
 * 
 * After voice claim submission, the component waits for IoT Core events
 * (handled by Updates.js) to determine if claim was accepted or rejected.
 * On acceptance, the wizard automatically advances to the next step.
 * 
 * Requirements: 2.1, 2.2
 */
const ClaimWithVoice = ({ customer, updateState }) => {
  const [mode, setMode] = useState('choice'); // 'choice', 'voice', 'form'

  // Get WebSocket endpoint from CDK outputs
  // Falls back to environment variable if CDK output is not available
  const webSocketEndpoint = getWebSocketEndpoint();
  const webSocketUrl = process.env.REACT_APP_VOICE_FNOL_WS_URL || webSocketEndpoint;
  
  // Get auth token from Amplify Auth
  const [authToken, setAuthToken] = useState('');
  
  // Get customer ID from customer prop
  const customerId = customer?.PK || '';
  
  // Get policy ID from customer's first policy
  // Policy ID will be passed to backend and used in extract_claim tool
  const policyId = customer?.policies?.[0]?.PK?.S || '';

  // Load auth token on mount
  React.useEffect(() => {
    const loadAuthToken = async () => {
      try {
        const { Auth } = await import('aws-amplify');
        const session = await Auth.currentSession();
        const token = session.getIdToken().getJwtToken();
        setAuthToken(token);
      } catch (error) {
        console.error('Failed to get auth token:', error);
      }
    };
    loadAuthToken();
  }, []);

  /**
   * Handle successful voice claim submission
   * Note: This is called when the claim is submitted to the API,
   * but we don't advance to next step yet. We wait for IoT Core
   * to confirm the claim was accepted.
   */
  const handleVoiceClaimSubmitted = (claimRef) => {
    console.log('Voice claim submitted with reference:', claimRef);
    // Don't change mode - stay in voice mode and show waiting state
    // The VoiceClaimComponent will handle the waiting UI
  };

  /**
   * Handle advancing to next step
   * This is called by Updates.js via updateState when Claim.Accepted event arrives
   */
  const handleNextStep = () => {
    console.log('Claim accepted - advancing to next step');
    if (updateState) {
      updateState('nextStep', true);
    }
  };

  /**
   * Handle fallback to form-based input
   */
  const handleFallbackToForm = () => {
    setMode('form');
  };

  /**
   * Handle form claim submission
   */
  const handleFormClaimSubmitted = () => {
    // Form submission already triggers nextStep via its own logic
    console.log('Form claim submitted');
  };

  // Show choice screen
  if (mode === 'choice') {
    // console.log('Rendering choice screen');
    // console.log('WebSocket URL:', webSocketUrl);
    // console.log('Auth Token:', authToken ? 'Present' : 'Not present');
    // console.log('Customer ID:', customerId);
    // console.log('Policy ID:', policyId);
    
    return (
      <Flex
        direction="column"
        justifyContent="center"
        alignItems="center"
        gap="2rem"
        padding="2rem"
      >
        <Heading level={3}>How would you like to submit your claim?</Heading>
        
        <Flex direction="row" gap="2rem" wrap="wrap" justifyContent="center">
          {/* Voice Claim Option */}
          <Flex
            direction="column"
            alignItems="center"
            gap="1rem"
            padding="2rem"
            backgroundColor="var(--amplify-colors-background-secondary)"
            borderRadius="12px"
            style={{ maxWidth: '300px', cursor: 'pointer' }}
            onClick={() => {
              console.log('Voice claim card clicked');
              setMode('voice');
            }}
          >
            <div style={{ fontSize: '3rem' }}>🎤</div>
            <Heading level={4}>Voice Claim</Heading>
            <Text textAlign="center">
              Tell us about your accident in your own words. We'll guide you through the process.
            </Text>
            <Button 
              variation="primary" 
              onClick={(e) => {
                console.log('Voice claim button clicked');
                e.stopPropagation();
                setMode('voice');
              }}
            >
              Start Voice Claim
            </Button>
          </Flex>

          {/* Form Option */}
          <Flex
            direction="column"
            alignItems="center"
            gap="1rem"
            padding="2rem"
            backgroundColor="var(--amplify-colors-background-secondary)"
            borderRadius="12px"
            style={{ maxWidth: '300px', cursor: 'pointer' }}
            onClick={() => setMode('form')}
          >
            <div style={{ fontSize: '3rem' }}>📝</div>
            <Heading level={4}>Form Claim</Heading>
            <Text textAlign="center">
              Fill out the traditional claim form with all the details.
            </Text>
            <Button variation="secondary" onClick={() => setMode('form')}>
              Use Form
            </Button>
          </Flex>
        </Flex>
      </Flex>
    );
  }

  // Show voice claim component
  if (mode === 'voice') {
    console.log('Rendering voice claim component');
    console.log('Props:', { webSocketUrl, authToken: authToken ? 'Present' : 'Not present', customerId, policyId });
    
    return (
      <Flex direction="column" gap="1rem">
        <Button 
          variation="link" 
          onClick={() => setMode('choice')}
          style={{ alignSelf: 'flex-start' }}
        >
          ← Back to options
        </Button>
        <VoiceClaimComponent
          onClaimSubmitted={handleVoiceClaimSubmitted}
          onFallbackToForm={handleFallbackToForm}
          onNextStep={handleNextStep}
          webSocketUrl={webSocketUrl}
          authToken={authToken}
          customerId={customerId}
          policyId={policyId}
        />
      </Flex>
    );
  }

  // Show form
  if (mode === 'form') {
    return (
      <Flex direction="column" gap="1rem">
        <Button 
          variation="link" 
          onClick={() => setMode('choice')}
          style={{ alignSelf: 'flex-start' }}
        >
          ← Back to options
        </Button>
        <ClaimForm 
          customer={customer}
          onSubmit={handleFormClaimSubmitted}
        />
      </Flex>
    );
  }

  return null;
};

export default ClaimWithVoice;
