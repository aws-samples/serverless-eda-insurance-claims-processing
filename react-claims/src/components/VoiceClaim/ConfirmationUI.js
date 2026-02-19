import React from 'react';
import './styles.css';

/**
 * ConfirmationUI - Component for displaying complete claim data and confirming submission
 * 
 * This component shows all collected claim information in a structured, readable format
 * and allows the user to confirm submission or return to edit.
 * 
 * Requirements: 5.1, 5.2
 * 
 * @param {Object} props - Component props
 * @param {Object} props.claimData - Complete claim data to display for confirmation
 * @param {Function} props.onConfirm - Callback when user confirms and wants to submit
 * @param {Function} props.onEdit - Callback when user wants to edit/change information
 */
export const ConfirmationUI = ({ claimData, onConfirm, onEdit }) => {
  const { incident, policy, personalInformation, policeReport, otherParty } = claimData;

  /**
   * Format date/time for display
   * @param {string} isoString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  /**
   * Format location for display
   * @returns {string} Formatted location string
   */
  const formatLocation = () => {
    if (!incident?.location) return 'Not provided';
    
    const { road, city, state, zip, country } = incident.location;
    const parts = [road, city, state, zip, country].filter(Boolean);
    return parts.join(', ') || 'Not provided';
  };

  return (
    <div className="confirmation-ui">
      <div className="confirmation-header">
        <h2>Review Your Claim</h2>
        <p className="confirmation-subtitle">
          Please review the information below and confirm it's correct before submitting.
        </p>
      </div>

      <div className="confirmation-content">
        {/* Incident Details Section */}
        <div className="confirmation-section">
          <h3 className="confirmation-section-title">Incident Details</h3>
          <div className="confirmation-fields">
            <div className="confirmation-field">
              <span className="confirmation-field-label">When did it happen?</span>
              <span className="confirmation-field-value">
                {incident?.occurrenceDateTime 
                  ? formatDateTime(incident.occurrenceDateTime)
                  : 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Where did it happen?</span>
              <span className="confirmation-field-value">{formatLocation()}</span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">What happened?</span>
              <span className="confirmation-field-value">
                {incident?.description || 'Not provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="confirmation-section">
          <h3 className="confirmation-section-title">Your Information</h3>
          <div className="confirmation-fields">
            <div className="confirmation-field">
              <span className="confirmation-field-label">Policy Number</span>
              <span className="confirmation-field-value">
                {policy?.id || 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Driver's License</span>
              <span className="confirmation-field-value">
                {personalInformation?.driversLicenseNumber || 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">License Plate</span>
              <span className="confirmation-field-value">
                {personalInformation?.licensePlateNumber || 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Were you driving?</span>
              <span className="confirmation-field-value">
                {personalInformation?.isInsurerDriver !== undefined
                  ? personalInformation.isInsurerDriver ? 'Yes' : 'No'
                  : 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Number of Passengers</span>
              <span className="confirmation-field-value">
                {personalInformation?.numberOfPassengers !== undefined
                  ? personalInformation.numberOfPassengers
                  : 'Not provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Police Report Section */}
        <div className="confirmation-section">
          <h3 className="confirmation-section-title">Police Report</h3>
          <div className="confirmation-fields">
            <div className="confirmation-field">
              <span className="confirmation-field-label">Was a police report filed?</span>
              <span className="confirmation-field-value">
                {policeReport?.isFiled !== undefined
                  ? policeReport.isFiled ? 'Yes' : 'No'
                  : 'Not provided'}
              </span>
            </div>
            {policeReport?.isFiled && (
              <div className="confirmation-field">
                <span className="confirmation-field-label">Report/Receipt Available?</span>
                <span className="confirmation-field-value">
                  {policeReport.reportOrReceiptAvailable !== undefined
                    ? policeReport.reportOrReceiptAvailable ? 'Yes' : 'No'
                    : 'Not provided'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Other Party Section (if applicable) */}
        {(otherParty?.firstName || otherParty?.lastName || otherParty?.insuranceCompany) && (
          <div className="confirmation-section">
            <h3 className="confirmation-section-title">Other Party Information</h3>
            <div className="confirmation-fields">
              {(otherParty.firstName || otherParty.lastName) && (
                <div className="confirmation-field">
                  <span className="confirmation-field-label">Name</span>
                  <span className="confirmation-field-value">
                    {[otherParty.firstName, otherParty.lastName].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {otherParty.insuranceCompany && (
                <div className="confirmation-field">
                  <span className="confirmation-field-label">Insurance Company</span>
                  <span className="confirmation-field-value">
                    {otherParty.insuranceCompany}
                  </span>
                </div>
              )}
              {otherParty.insuranceId && (
                <div className="confirmation-field">
                  <span className="confirmation-field-label">Insurance ID</span>
                  <span className="confirmation-field-value">
                    {otherParty.insuranceId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="confirmation-actions">
        <button 
          className="btn-confirmation-edit"
          onClick={onEdit}
          aria-label="Go back to edit claim information"
        >
          ← Edit Information
        </button>
        <button 
          className="btn-confirmation-submit"
          onClick={onConfirm}
          aria-label="Confirm and submit claim"
        >
          Confirm and Submit
        </button>
      </div>
    </div>
  );
};
