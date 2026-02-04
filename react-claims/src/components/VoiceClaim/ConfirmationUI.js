"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationUI = void 0;
const react_1 = require("react");
require("./styles.css");
/**
 * ConfirmationUI - Component for displaying complete claim data and confirming submission
 *
 * This component shows all collected claim information in a structured, readable format
 * and allows the user to confirm submission or return to edit.
 *
 * Requirements: 5.1, 5.2
 */
const ConfirmationUI = ({ claimData, onConfirm, onEdit }) => {
    const { incident, policy, personalInformation, policeReport, otherParty } = claimData;
    /**
     * Format date/time for display
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
        }
        catch (_a) {
            return isoString;
        }
    };
    /**
     * Format location for display
     */
    const formatLocation = () => {
        if (!(incident === null || incident === void 0 ? void 0 : incident.location))
            return 'Not provided';
        const { road, city, state, zip, country } = incident.location;
        const parts = [road, city, state, zip, country].filter(Boolean);
        return parts.join(', ') || 'Not provided';
    };
    return (<div className="confirmation-ui">
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
                {(incident === null || incident === void 0 ? void 0 : incident.occurrenceDateTime)
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
                {(incident === null || incident === void 0 ? void 0 : incident.description) || 'Not provided'}
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
                {(policy === null || policy === void 0 ? void 0 : policy.id) || 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Driver's License</span>
              <span className="confirmation-field-value">
                {(personalInformation === null || personalInformation === void 0 ? void 0 : personalInformation.driversLicenseNumber) || 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">License Plate</span>
              <span className="confirmation-field-value">
                {(personalInformation === null || personalInformation === void 0 ? void 0 : personalInformation.licensePlateNumber) || 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Were you driving?</span>
              <span className="confirmation-field-value">
                {(personalInformation === null || personalInformation === void 0 ? void 0 : personalInformation.isInsurerDriver) !== undefined
            ? personalInformation.isInsurerDriver ? 'Yes' : 'No'
            : 'Not provided'}
              </span>
            </div>
            <div className="confirmation-field">
              <span className="confirmation-field-label">Number of Passengers</span>
              <span className="confirmation-field-value">
                {(personalInformation === null || personalInformation === void 0 ? void 0 : personalInformation.numberOfPassengers) !== undefined
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
                {(policeReport === null || policeReport === void 0 ? void 0 : policeReport.isFiled) !== undefined
            ? policeReport.isFiled ? 'Yes' : 'No'
            : 'Not provided'}
              </span>
            </div>
            {(policeReport === null || policeReport === void 0 ? void 0 : policeReport.isFiled) && (<div className="confirmation-field">
                <span className="confirmation-field-label">Report/Receipt Available?</span>
                <span className="confirmation-field-value">
                  {policeReport.reportOrReceiptAvailable !== undefined
                ? policeReport.reportOrReceiptAvailable ? 'Yes' : 'No'
                : 'Not provided'}
                </span>
              </div>)}
          </div>
        </div>

        {/* Other Party Section (if applicable) */}
        {((otherParty === null || otherParty === void 0 ? void 0 : otherParty.firstName) || (otherParty === null || otherParty === void 0 ? void 0 : otherParty.lastName) || (otherParty === null || otherParty === void 0 ? void 0 : otherParty.insuranceCompany)) && (<div className="confirmation-section">
            <h3 className="confirmation-section-title">Other Party Information</h3>
            <div className="confirmation-fields">
              {(otherParty.firstName || otherParty.lastName) && (<div className="confirmation-field">
                  <span className="confirmation-field-label">Name</span>
                  <span className="confirmation-field-value">
                    {[otherParty.firstName, otherParty.lastName].filter(Boolean).join(' ')}
                  </span>
                </div>)}
              {otherParty.insuranceCompany && (<div className="confirmation-field">
                  <span className="confirmation-field-label">Insurance Company</span>
                  <span className="confirmation-field-value">
                    {otherParty.insuranceCompany}
                  </span>
                </div>)}
              {otherParty.insuranceId && (<div className="confirmation-field">
                  <span className="confirmation-field-label">Insurance ID</span>
                  <span className="confirmation-field-value">
                    {otherParty.insuranceId}
                  </span>
                </div>)}
            </div>
          </div>)}
      </div>

      <div className="confirmation-actions">
        <button className="btn-confirmation-edit" onClick={onEdit} aria-label="Go back to edit claim information">
          ← Edit Information
        </button>
        <button className="btn-confirmation-submit" onClick={onConfirm} aria-label="Confirm and submit claim">
          Confirm and Submit
        </button>
      </div>
    </div>);
};
exports.ConfirmationUI = ConfirmationUI;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29uZmlybWF0aW9uVUkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDb25maXJtYXRpb25VSS50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaUNBQTBCO0FBRTFCLHdCQUFzQjtBQWdCdEI7Ozs7Ozs7R0FPRztBQUNJLE1BQU0sY0FBYyxHQUFrQyxDQUFDLEVBQzVELFNBQVMsRUFDVCxTQUFTLEVBQ1QsTUFBTSxFQUNQLEVBQUUsRUFBRTtJQUNILE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFdEY7O09BRUc7SUFDSCxNQUFNLGNBQWMsR0FBRyxDQUFDLFNBQWlCLEVBQVUsRUFBRTtRQUNuRCxJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFO2dCQUNsQyxJQUFJLEVBQUUsU0FBUztnQkFDZixLQUFLLEVBQUUsTUFBTTtnQkFDYixHQUFHLEVBQUUsU0FBUztnQkFDZCxJQUFJLEVBQUUsU0FBUztnQkFDZixNQUFNLEVBQUUsU0FBUztnQkFDakIsTUFBTSxFQUFFLElBQUk7YUFDYixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQUMsV0FBTSxDQUFDO1lBQ1AsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUMsQ0FBQztJQUVGOztPQUVHO0lBQ0gsTUFBTSxjQUFjLEdBQUcsR0FBVyxFQUFFO1FBQ2xDLElBQUksQ0FBQyxDQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxRQUFRLENBQUE7WUFBRSxPQUFPLGNBQWMsQ0FBQztRQUUvQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFDOUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUM7SUFDNUMsQ0FBQyxDQUFDO0lBRUYsT0FBTyxDQUNMLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FDOUI7TUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQ2xDO1FBQUEsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUN6QjtRQUFBLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FDbEM7O1FBQ0YsRUFBRSxDQUFDLENBQ0w7TUFBQSxFQUFFLEdBQUcsQ0FFTDs7TUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQ25DO1FBQUEsQ0FBQyw4QkFBOEIsQ0FDL0I7UUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQ25DO1VBQUEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FDL0Q7VUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQ2xDO1lBQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUNqQztjQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQ3BFO2NBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUN4QztnQkFBQSxDQUFDLENBQUEsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLGtCQUFrQjtZQUMzQixDQUFDLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQztZQUM3QyxDQUFDLENBQUMsY0FBYyxDQUNwQjtjQUFBLEVBQUUsSUFBSSxDQUNSO1lBQUEsRUFBRSxHQUFHLENBQ0w7WUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQ2pDO2NBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FDckU7Y0FBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FDckU7WUFBQSxFQUFFLEdBQUcsQ0FDTDtZQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FDakM7Y0FBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsY0FBYyxFQUFFLElBQUksQ0FDL0Q7Y0FBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQ3hDO2dCQUFBLENBQUMsQ0FBQSxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUUsV0FBVyxLQUFJLGNBQWMsQ0FDMUM7Y0FBQSxFQUFFLElBQUksQ0FDUjtZQUFBLEVBQUUsR0FBRyxDQUNQO1VBQUEsRUFBRSxHQUFHLENBQ1A7UUFBQSxFQUFFLEdBQUcsQ0FFTDs7UUFBQSxDQUFDLGtDQUFrQyxDQUNuQztRQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FDbkM7VUFBQSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUMvRDtVQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FDbEM7WUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQ2pDO2NBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQzlEO2NBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUN4QztnQkFBQSxDQUFDLENBQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLEVBQUUsS0FBSSxjQUFjLENBQy9CO2NBQUEsRUFBRSxJQUFJLENBQ1I7WUFBQSxFQUFFLEdBQUcsQ0FDTDtZQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FDakM7Y0FBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUNqRTtjQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FDeEM7Z0JBQUEsQ0FBQyxDQUFBLG1CQUFtQixhQUFuQixtQkFBbUIsdUJBQW5CLG1CQUFtQixDQUFFLG9CQUFvQixLQUFJLGNBQWMsQ0FDOUQ7Y0FBQSxFQUFFLElBQUksQ0FDUjtZQUFBLEVBQUUsR0FBRyxDQUNMO1lBQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUNqQztjQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUM5RDtjQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FDeEM7Z0JBQUEsQ0FBQyxDQUFBLG1CQUFtQixhQUFuQixtQkFBbUIsdUJBQW5CLG1CQUFtQixDQUFFLGtCQUFrQixLQUFJLGNBQWMsQ0FDNUQ7Y0FBQSxFQUFFLElBQUksQ0FDUjtZQUFBLEVBQUUsR0FBRyxDQUNMO1lBQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUNqQztjQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQ2xFO2NBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUN4QztnQkFBQSxDQUFDLENBQUEsbUJBQW1CLGFBQW5CLG1CQUFtQix1QkFBbkIsbUJBQW1CLENBQUUsZUFBZSxNQUFLLFNBQVM7WUFDakQsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQ3BELENBQUMsQ0FBQyxjQUFjLENBQ3BCO2NBQUEsRUFBRSxJQUFJLENBQ1I7WUFBQSxFQUFFLEdBQUcsQ0FDTDtZQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FDakM7Y0FBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUNyRTtjQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FDeEM7Z0JBQUEsQ0FBQyxDQUFBLG1CQUFtQixhQUFuQixtQkFBbUIsdUJBQW5CLG1CQUFtQixDQUFFLGtCQUFrQixNQUFLLFNBQVM7WUFDcEQsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLGtCQUFrQjtZQUN4QyxDQUFDLENBQUMsY0FBYyxDQUNwQjtjQUFBLEVBQUUsSUFBSSxDQUNSO1lBQUEsRUFBRSxHQUFHLENBQ1A7VUFBQSxFQUFFLEdBQUcsQ0FDUDtRQUFBLEVBQUUsR0FBRyxDQUVMOztRQUFBLENBQUMsMkJBQTJCLENBQzVCO1FBQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUNuQztVQUFBLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUM1RDtVQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FDbEM7WUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQ2pDO2NBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FDM0U7Y0FBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQ3hDO2dCQUFBLENBQUMsQ0FBQSxZQUFZLGFBQVosWUFBWSx1QkFBWixZQUFZLENBQUUsT0FBTyxNQUFLLFNBQVM7WUFDbEMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUNyQyxDQUFDLENBQUMsY0FBYyxDQUNwQjtjQUFBLEVBQUUsSUFBSSxDQUNSO1lBQUEsRUFBRSxHQUFHLENBQ0w7WUFBQSxDQUFDLENBQUEsWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLE9BQU8sS0FBSSxDQUN4QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQ2pDO2dCQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQzFFO2dCQUFBLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FDeEM7a0JBQUEsQ0FBQyxZQUFZLENBQUMsd0JBQXdCLEtBQUssU0FBUztnQkFDbEQsQ0FBQyxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUN0RCxDQUFDLENBQUMsY0FBYyxDQUNwQjtnQkFBQSxFQUFFLElBQUksQ0FDUjtjQUFBLEVBQUUsR0FBRyxDQUFDLENBQ1AsQ0FDSDtVQUFBLEVBQUUsR0FBRyxDQUNQO1FBQUEsRUFBRSxHQUFHLENBRUw7O1FBQUEsQ0FBQyx5Q0FBeUMsQ0FDMUM7UUFBQSxDQUFDLENBQUMsQ0FBQSxVQUFVLGFBQVYsVUFBVSx1QkFBVixVQUFVLENBQUUsU0FBUyxNQUFJLFVBQVUsYUFBVixVQUFVLHVCQUFWLFVBQVUsQ0FBRSxRQUFRLENBQUEsS0FBSSxVQUFVLGFBQVYsVUFBVSx1QkFBVixVQUFVLENBQUUsZ0JBQWdCLENBQUEsQ0FBQyxJQUFJLENBQ2xGLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FDbkM7WUFBQSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUN0RTtZQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FDbEM7Y0FBQSxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDaEQsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUNqQztrQkFBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FDckQ7a0JBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUN4QztvQkFBQSxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FDeEU7a0JBQUEsRUFBRSxJQUFJLENBQ1I7Z0JBQUEsRUFBRSxHQUFHLENBQUMsQ0FDUCxDQUNEO2NBQUEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLElBQUksQ0FDOUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUNqQztrQkFBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUNsRTtrQkFBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQ3hDO29CQUFBLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUM5QjtrQkFBQSxFQUFFLElBQUksQ0FDUjtnQkFBQSxFQUFFLEdBQUcsQ0FBQyxDQUNQLENBQ0Q7Y0FBQSxDQUFDLFVBQVUsQ0FBQyxXQUFXLElBQUksQ0FDekIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUNqQztrQkFBQSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FDN0Q7a0JBQUEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUN4QztvQkFBQSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQ3pCO2tCQUFBLEVBQUUsSUFBSSxDQUNSO2dCQUFBLEVBQUUsR0FBRyxDQUFDLENBQ1AsQ0FDSDtZQUFBLEVBQUUsR0FBRyxDQUNQO1VBQUEsRUFBRSxHQUFHLENBQUMsQ0FDUCxDQUNIO01BQUEsRUFBRSxHQUFHLENBRUw7O01BQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUNuQztRQUFBLENBQUMsTUFBTSxDQUNMLFNBQVMsQ0FBQyx1QkFBdUIsQ0FDakMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQ2hCLFVBQVUsQ0FBQyxtQ0FBbUMsQ0FFOUM7O1FBQ0YsRUFBRSxNQUFNLENBQ1I7UUFBQSxDQUFDLE1BQU0sQ0FDTCxTQUFTLENBQUMseUJBQXlCLENBQ25DLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNuQixVQUFVLENBQUMsMEJBQTBCLENBRXJDOztRQUNGLEVBQUUsTUFBTSxDQUNWO01BQUEsRUFBRSxHQUFHLENBQ1A7SUFBQSxFQUFFLEdBQUcsQ0FBQyxDQUNQLENBQUM7QUFDSixDQUFDLENBQUM7QUE5TFcsUUFBQSxjQUFjLGtCQThMekIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQ2xhaW1EYXRhIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgJy4vc3R5bGVzLmNzcyc7XG5cbi8qKlxuICogUHJvcHMgZm9yIENvbmZpcm1hdGlvblVJIGNvbXBvbmVudFxuICovXG5pbnRlcmZhY2UgQ29uZmlybWF0aW9uVUlQcm9wcyB7XG4gIC8qKiBDb21wbGV0ZSBjbGFpbSBkYXRhIHRvIGRpc3BsYXkgZm9yIGNvbmZpcm1hdGlvbiAqL1xuICBjbGFpbURhdGE6IENsYWltRGF0YTtcbiAgXG4gIC8qKiBDYWxsYmFjayB3aGVuIHVzZXIgY29uZmlybXMgYW5kIHdhbnRzIHRvIHN1Ym1pdCAqL1xuICBvbkNvbmZpcm06ICgpID0+IHZvaWQ7XG4gIFxuICAvKiogQ2FsbGJhY2sgd2hlbiB1c2VyIHdhbnRzIHRvIGVkaXQvY2hhbmdlIGluZm9ybWF0aW9uICovXG4gIG9uRWRpdDogKCkgPT4gdm9pZDtcbn1cblxuLyoqXG4gKiBDb25maXJtYXRpb25VSSAtIENvbXBvbmVudCBmb3IgZGlzcGxheWluZyBjb21wbGV0ZSBjbGFpbSBkYXRhIGFuZCBjb25maXJtaW5nIHN1Ym1pc3Npb25cbiAqIFxuICogVGhpcyBjb21wb25lbnQgc2hvd3MgYWxsIGNvbGxlY3RlZCBjbGFpbSBpbmZvcm1hdGlvbiBpbiBhIHN0cnVjdHVyZWQsIHJlYWRhYmxlIGZvcm1hdFxuICogYW5kIGFsbG93cyB0aGUgdXNlciB0byBjb25maXJtIHN1Ym1pc3Npb24gb3IgcmV0dXJuIHRvIGVkaXQuXG4gKiBcbiAqIFJlcXVpcmVtZW50czogNS4xLCA1LjJcbiAqL1xuZXhwb3J0IGNvbnN0IENvbmZpcm1hdGlvblVJOiBSZWFjdC5GQzxDb25maXJtYXRpb25VSVByb3BzPiA9ICh7XG4gIGNsYWltRGF0YSxcbiAgb25Db25maXJtLFxuICBvbkVkaXRcbn0pID0+IHtcbiAgY29uc3QgeyBpbmNpZGVudCwgcG9saWN5LCBwZXJzb25hbEluZm9ybWF0aW9uLCBwb2xpY2VSZXBvcnQsIG90aGVyUGFydHkgfSA9IGNsYWltRGF0YTtcblxuICAvKipcbiAgICogRm9ybWF0IGRhdGUvdGltZSBmb3IgZGlzcGxheVxuICAgKi9cbiAgY29uc3QgZm9ybWF0RGF0ZVRpbWUgPSAoaXNvU3RyaW5nOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoaXNvU3RyaW5nKTtcbiAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHtcbiAgICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgICBtb250aDogJ2xvbmcnLFxuICAgICAgICBkYXk6ICdudW1lcmljJyxcbiAgICAgICAgaG91cjogJ251bWVyaWMnLFxuICAgICAgICBtaW51dGU6ICcyLWRpZ2l0JyxcbiAgICAgICAgaG91cjEyOiB0cnVlXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBpc29TdHJpbmc7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBGb3JtYXQgbG9jYXRpb24gZm9yIGRpc3BsYXlcbiAgICovXG4gIGNvbnN0IGZvcm1hdExvY2F0aW9uID0gKCk6IHN0cmluZyA9PiB7XG4gICAgaWYgKCFpbmNpZGVudD8ubG9jYXRpb24pIHJldHVybiAnTm90IHByb3ZpZGVkJztcbiAgICBcbiAgICBjb25zdCB7IHJvYWQsIGNpdHksIHN0YXRlLCB6aXAsIGNvdW50cnkgfSA9IGluY2lkZW50LmxvY2F0aW9uO1xuICAgIGNvbnN0IHBhcnRzID0gW3JvYWQsIGNpdHksIHN0YXRlLCB6aXAsIGNvdW50cnldLmZpbHRlcihCb29sZWFuKTtcbiAgICByZXR1cm4gcGFydHMuam9pbignLCAnKSB8fCAnTm90IHByb3ZpZGVkJztcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLXVpXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1oZWFkZXJcIj5cbiAgICAgICAgPGgyPlJldmlldyBZb3VyIENsYWltPC9oMj5cbiAgICAgICAgPHAgY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLXN1YnRpdGxlXCI+XG4gICAgICAgICAgUGxlYXNlIHJldmlldyB0aGUgaW5mb3JtYXRpb24gYmVsb3cgYW5kIGNvbmZpcm0gaXQncyBjb3JyZWN0IGJlZm9yZSBzdWJtaXR0aW5nLlxuICAgICAgICA8L3A+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tY29udGVudFwiPlxuICAgICAgICB7LyogSW5jaWRlbnQgRGV0YWlscyBTZWN0aW9uICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uXCI+XG4gICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uLXRpdGxlXCI+SW5jaWRlbnQgRGV0YWlsczwvaDM+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGRzXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5XaGVuIGRpZCBpdCBoYXBwZW4/PC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtdmFsdWVcIj5cbiAgICAgICAgICAgICAgICB7aW5jaWRlbnQ/Lm9jY3VycmVuY2VEYXRlVGltZSBcbiAgICAgICAgICAgICAgICAgID8gZm9ybWF0RGF0ZVRpbWUoaW5jaWRlbnQub2NjdXJyZW5jZURhdGVUaW1lKVxuICAgICAgICAgICAgICAgICAgOiAnTm90IHByb3ZpZGVkJ31cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5XaGVyZSBkaWQgaXQgaGFwcGVuPzwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+e2Zvcm1hdExvY2F0aW9uKCl9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5XaGF0IGhhcHBlbmVkPzwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAge2luY2lkZW50Py5kZXNjcmlwdGlvbiB8fCAnTm90IHByb3ZpZGVkJ31cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiBQZXJzb25hbCBJbmZvcm1hdGlvbiBTZWN0aW9uICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uXCI+XG4gICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uLXRpdGxlXCI+WW91ciBJbmZvcm1hdGlvbjwvaDM+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGRzXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5Qb2xpY3kgTnVtYmVyPC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtdmFsdWVcIj5cbiAgICAgICAgICAgICAgICB7cG9saWN5Py5pZCB8fCAnTm90IHByb3ZpZGVkJ31cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5Ecml2ZXIncyBMaWNlbnNlPC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtdmFsdWVcIj5cbiAgICAgICAgICAgICAgICB7cGVyc29uYWxJbmZvcm1hdGlvbj8uZHJpdmVyc0xpY2Vuc2VOdW1iZXIgfHwgJ05vdCBwcm92aWRlZCd9XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGRcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLWxhYmVsXCI+TGljZW5zZSBQbGF0ZTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAge3BlcnNvbmFsSW5mb3JtYXRpb24/LmxpY2Vuc2VQbGF0ZU51bWJlciB8fCAnTm90IHByb3ZpZGVkJ31cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5XZXJlIHlvdSBkcml2aW5nPzwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAge3BlcnNvbmFsSW5mb3JtYXRpb24/LmlzSW5zdXJlckRyaXZlciAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICA/IHBlcnNvbmFsSW5mb3JtYXRpb24uaXNJbnN1cmVyRHJpdmVyID8gJ1llcycgOiAnTm8nXG4gICAgICAgICAgICAgICAgICA6ICdOb3QgcHJvdmlkZWQnfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZC1sYWJlbFwiPk51bWJlciBvZiBQYXNzZW5nZXJzPC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtdmFsdWVcIj5cbiAgICAgICAgICAgICAgICB7cGVyc29uYWxJbmZvcm1hdGlvbj8ubnVtYmVyT2ZQYXNzZW5nZXJzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgID8gcGVyc29uYWxJbmZvcm1hdGlvbi5udW1iZXJPZlBhc3NlbmdlcnNcbiAgICAgICAgICAgICAgICAgIDogJ05vdCBwcm92aWRlZCd9XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7LyogUG9saWNlIFJlcG9ydCBTZWN0aW9uICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uXCI+XG4gICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uLXRpdGxlXCI+UG9saWNlIFJlcG9ydDwvaDM+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGRzXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtbGFiZWxcIj5XYXMgYSBwb2xpY2UgcmVwb3J0IGZpbGVkPzwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAge3BvbGljZVJlcG9ydD8uaXNGaWxlZCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICA/IHBvbGljZVJlcG9ydC5pc0ZpbGVkID8gJ1llcycgOiAnTm8nXG4gICAgICAgICAgICAgICAgICA6ICdOb3QgcHJvdmlkZWQnfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIHtwb2xpY2VSZXBvcnQ/LmlzRmlsZWQgJiYgKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZC1sYWJlbFwiPlJlcG9ydC9SZWNlaXB0IEF2YWlsYWJsZT88L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAgICB7cG9saWNlUmVwb3J0LnJlcG9ydE9yUmVjZWlwdEF2YWlsYWJsZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgID8gcG9saWNlUmVwb3J0LnJlcG9ydE9yUmVjZWlwdEF2YWlsYWJsZSA/ICdZZXMnIDogJ05vJ1xuICAgICAgICAgICAgICAgICAgICA6ICdOb3QgcHJvdmlkZWQnfVxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7LyogT3RoZXIgUGFydHkgU2VjdGlvbiAoaWYgYXBwbGljYWJsZSkgKi99XG4gICAgICAgIHsob3RoZXJQYXJ0eT8uZmlyc3ROYW1lIHx8IG90aGVyUGFydHk/Lmxhc3ROYW1lIHx8IG90aGVyUGFydHk/Lmluc3VyYW5jZUNvbXBhbnkpICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1zZWN0aW9uXCI+XG4gICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLXNlY3Rpb24tdGl0bGVcIj5PdGhlciBQYXJ0eSBJbmZvcm1hdGlvbjwvaDM+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZHNcIj5cbiAgICAgICAgICAgICAgeyhvdGhlclBhcnR5LmZpcnN0TmFtZSB8fCBvdGhlclBhcnR5Lmxhc3ROYW1lKSAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZC1sYWJlbFwiPk5hbWU8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGQtdmFsdWVcIj5cbiAgICAgICAgICAgICAgICAgICAge1tvdGhlclBhcnR5LmZpcnN0TmFtZSwgb3RoZXJQYXJ0eS5sYXN0TmFtZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKX1cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAge290aGVyUGFydHkuaW5zdXJhbmNlQ29tcGFueSAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZC1sYWJlbFwiPkluc3VyYW5jZSBDb21wYW55PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAgICAgIHtvdGhlclBhcnR5Lmluc3VyYW5jZUNvbXBhbnl9XG4gICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIHtvdGhlclBhcnR5Lmluc3VyYW5jZUlkICYmIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbmZpcm1hdGlvbi1maWVsZFwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLWxhYmVsXCI+SW5zdXJhbmNlIElEPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY29uZmlybWF0aW9uLWZpZWxkLXZhbHVlXCI+XG4gICAgICAgICAgICAgICAgICAgIHtvdGhlclBhcnR5Lmluc3VyYW5jZUlkfVxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb25maXJtYXRpb24tYWN0aW9uc1wiPlxuICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgIGNsYXNzTmFtZT1cImJ0bi1jb25maXJtYXRpb24tZWRpdFwiXG4gICAgICAgICAgb25DbGljaz17b25FZGl0fVxuICAgICAgICAgIGFyaWEtbGFiZWw9XCJHbyBiYWNrIHRvIGVkaXQgY2xhaW0gaW5mb3JtYXRpb25cIlxuICAgICAgICA+XG4gICAgICAgICAg4oaQIEVkaXQgSW5mb3JtYXRpb25cbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYnRuLWNvbmZpcm1hdGlvbi1zdWJtaXRcIlxuICAgICAgICAgIG9uQ2xpY2s9e29uQ29uZmlybX1cbiAgICAgICAgICBhcmlhLWxhYmVsPVwiQ29uZmlybSBhbmQgc3VibWl0IGNsYWltXCJcbiAgICAgICAgPlxuICAgICAgICAgIENvbmZpcm0gYW5kIFN1Ym1pdFxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcbiJdfQ==