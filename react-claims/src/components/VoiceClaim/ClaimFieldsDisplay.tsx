/**
 * ClaimFieldsDisplay Component
 * 
 * Displays extracted claim fields in a structured format.
 * Highlights newly updated fields with subtle animation.
 * Shows empty state for fields not yet collected.
 * 
 * Requirements: 3.4, 9.4, 13.5
 */

import React, { useEffect, useState } from 'react';
import { ClaimData } from './types';

interface ClaimFieldsDisplayProps {
  /** Partial claim data with fields that have been extracted */
  claimData: Partial<ClaimData>;
}

interface FieldUpdate {
  [key: string]: boolean;
}

/**
 * ClaimFieldsDisplay component shows extracted claim fields
 * in a structured format with visual hierarchy and animations.
 */
export const ClaimFieldsDisplay: React.FC<ClaimFieldsDisplayProps> = ({
  claimData
}) => {
  const [updatedFields, setUpdatedFields] = useState<FieldUpdate>({});
  const [previousData, setPreviousData] = useState<Partial<ClaimData>>({});

  // Track field updates for highlighting
  useEffect(() => {
    const newUpdates: FieldUpdate = {};
    
    // Check for changes in each field
    if (claimData.incident?.occurrenceDateTime !== previousData.incident?.occurrenceDateTime) {
      newUpdates['occurrenceDateTime'] = true;
    }
    if (claimData.incident?.location?.road !== previousData.incident?.location?.road) {
      newUpdates['location'] = true;
    }
    if (claimData.incident?.description !== previousData.incident?.description) {
      newUpdates['description'] = true;
    }
    if (claimData.policy?.id !== previousData.policy?.id) {
      newUpdates['policyId'] = true;
    }
    if (claimData.personalInformation?.driversLicenseNumber !== previousData.personalInformation?.driversLicenseNumber) {
      newUpdates['driversLicense'] = true;
    }
    if (claimData.personalInformation?.licensePlateNumber !== previousData.personalInformation?.licensePlateNumber) {
      newUpdates['licensePlate'] = true;
    }
    if (claimData.personalInformation?.numberOfPassengers !== previousData.personalInformation?.numberOfPassengers) {
      newUpdates['passengers'] = true;
    }
    if (claimData.personalInformation?.isInsurerDriver !== previousData.personalInformation?.isInsurerDriver) {
      newUpdates['wasDrivering'] = true;
    }
    if (claimData.policeReport?.isFiled !== previousData.policeReport?.isFiled) {
      newUpdates['policeFiled'] = true;
    }
    if (claimData.otherParty?.firstName !== previousData.otherParty?.firstName ||
        claimData.otherParty?.lastName !== previousData.otherParty?.lastName) {
      newUpdates['otherParty'] = true;
    }

    if (Object.keys(newUpdates).length > 0) {
      setUpdatedFields(newUpdates);
      setPreviousData(claimData);

      // Clear highlights after animation
      setTimeout(() => {
        setUpdatedFields({});
      }, 2000);
    }
  }, [claimData, previousData]);

  /**
   * Render a field with label and value
   */
  const renderField = (
    label: string,
    value: string | number | boolean | undefined | null,
    fieldKey: string
  ) => {
    const isEmpty = value === undefined || value === null || value === '';
    const isUpdated = updatedFields[fieldKey];
    
    return (
      <div 
        className={`claim-field ${isEmpty ? 'claim-field-empty' : ''} ${isUpdated ? 'claim-field-updated' : ''}`}
        key={fieldKey}
      >
        <div className="claim-field-label">{label}</div>
        <div className="claim-field-value">
          {isEmpty ? (
            <span className="claim-field-placeholder">Not yet provided</span>
          ) : (
            <span>{String(value)}</span>
          )}
        </div>
      </div>
    );
  };

  /**
   * Format location for display
   */
  const formatLocation = () => {
    const location = claimData.incident?.location;
    if (!location) return undefined;
    
    const parts = [
      location.road,
      location.city,
      location.state,
      location.zip,
      location.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : undefined;
  };

  /**
   * Format other party name
   */
  const formatOtherParty = () => {
    const otherParty = claimData.otherParty;
    if (!otherParty) return undefined;
    
    const name = [otherParty.firstName, otherParty.lastName].filter(Boolean).join(' ');
    const insurance = otherParty.insuranceCompany;
    
    if (name && insurance) {
      return `${name} (${insurance})`;
    } else if (name) {
      return name;
    } else if (insurance) {
      return insurance;
    }
    
    return undefined;
  };

  return (
    <div className="claim-fields-display">
      <h3>Collected Information</h3>
      
      <div className="claim-fields-grid">
        {/* Incident Information */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Incident Details</h4>
          {renderField('Date & Time', claimData.incident?.occurrenceDateTime, 'occurrenceDateTime')}
          {renderField('Location', formatLocation(), 'location')}
          {renderField('Description', claimData.incident?.description, 'description')}
        </div>

        {/* Personal Information */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Your Information</h4>
          {renderField('Policy Number', claimData.policy?.id, 'policyId')}
          {renderField("Driver's License", claimData.personalInformation?.driversLicenseNumber, 'driversLicense')}
          {renderField('License Plate', claimData.personalInformation?.licensePlateNumber, 'licensePlate')}
          {renderField('Number of Passengers', claimData.personalInformation?.numberOfPassengers, 'passengers')}
          {renderField('Were You Driving?', 
            claimData.personalInformation?.isInsurerDriver !== undefined 
              ? (claimData.personalInformation.isInsurerDriver ? 'Yes' : 'No')
              : undefined, 
            'wasDriving'
          )}
        </div>

        {/* Police Report */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Police Report</h4>
          {renderField('Police Report Filed?', 
            claimData.policeReport?.isFiled !== undefined 
              ? (claimData.policeReport.isFiled ? 'Yes' : 'No')
              : undefined, 
            'policeFiled'
          )}
          {claimData.policeReport?.isFiled && renderField('Report Available?', 
            claimData.policeReport?.reportOrReceiptAvailable !== undefined 
              ? (claimData.policeReport.reportOrReceiptAvailable ? 'Yes' : 'No')
              : undefined, 
            'policeReceipt'
          )}
        </div>

        {/* Other Party */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Other Party</h4>
          {renderField('Other Party', formatOtherParty(), 'otherParty')}
        </div>
      </div>
    </div>
  );
};
