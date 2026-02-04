"use strict";
/**
 * ClaimFieldsDisplay Component
 *
 * Displays extracted claim fields in a structured format.
 * Highlights newly updated fields with subtle animation.
 * Shows empty state for fields not yet collected.
 *
 * Requirements: 3.4, 9.4, 13.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimFieldsDisplay = void 0;
const react_1 = require("react");
/**
 * ClaimFieldsDisplay component shows extracted claim fields
 * in a structured format with visual hierarchy and animations.
 */
const ClaimFieldsDisplay = ({ claimData }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const [updatedFields, setUpdatedFields] = (0, react_1.useState)({});
    const [previousData, setPreviousData] = (0, react_1.useState)({});
    // Track field updates for highlighting
    (0, react_1.useEffect)(() => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const newUpdates = {};
        // Check for changes in each field
        if (((_a = claimData.incident) === null || _a === void 0 ? void 0 : _a.occurrenceDateTime) !== ((_b = previousData.incident) === null || _b === void 0 ? void 0 : _b.occurrenceDateTime)) {
            newUpdates['occurrenceDateTime'] = true;
        }
        if (((_d = (_c = claimData.incident) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.road) !== ((_f = (_e = previousData.incident) === null || _e === void 0 ? void 0 : _e.location) === null || _f === void 0 ? void 0 : _f.road)) {
            newUpdates['location'] = true;
        }
        if (((_g = claimData.incident) === null || _g === void 0 ? void 0 : _g.description) !== ((_h = previousData.incident) === null || _h === void 0 ? void 0 : _h.description)) {
            newUpdates['description'] = true;
        }
        if (((_j = claimData.policy) === null || _j === void 0 ? void 0 : _j.id) !== ((_k = previousData.policy) === null || _k === void 0 ? void 0 : _k.id)) {
            newUpdates['policyId'] = true;
        }
        if (((_l = claimData.personalInformation) === null || _l === void 0 ? void 0 : _l.driversLicenseNumber) !== ((_m = previousData.personalInformation) === null || _m === void 0 ? void 0 : _m.driversLicenseNumber)) {
            newUpdates['driversLicense'] = true;
        }
        if (((_o = claimData.personalInformation) === null || _o === void 0 ? void 0 : _o.licensePlateNumber) !== ((_p = previousData.personalInformation) === null || _p === void 0 ? void 0 : _p.licensePlateNumber)) {
            newUpdates['licensePlate'] = true;
        }
        if (((_q = claimData.personalInformation) === null || _q === void 0 ? void 0 : _q.numberOfPassengers) !== ((_r = previousData.personalInformation) === null || _r === void 0 ? void 0 : _r.numberOfPassengers)) {
            newUpdates['passengers'] = true;
        }
        if (((_s = claimData.personalInformation) === null || _s === void 0 ? void 0 : _s.isInsurerDriver) !== ((_t = previousData.personalInformation) === null || _t === void 0 ? void 0 : _t.isInsurerDriver)) {
            newUpdates['wasDrivering'] = true;
        }
        if (((_u = claimData.policeReport) === null || _u === void 0 ? void 0 : _u.isFiled) !== ((_v = previousData.policeReport) === null || _v === void 0 ? void 0 : _v.isFiled)) {
            newUpdates['policeFiled'] = true;
        }
        if (((_w = claimData.otherParty) === null || _w === void 0 ? void 0 : _w.firstName) !== ((_x = previousData.otherParty) === null || _x === void 0 ? void 0 : _x.firstName) ||
            ((_y = claimData.otherParty) === null || _y === void 0 ? void 0 : _y.lastName) !== ((_z = previousData.otherParty) === null || _z === void 0 ? void 0 : _z.lastName)) {
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
    const renderField = (label, value, fieldKey) => {
        const isEmpty = value === undefined || value === null || value === '';
        const isUpdated = updatedFields[fieldKey];
        return (<div className={`claim-field ${isEmpty ? 'claim-field-empty' : ''} ${isUpdated ? 'claim-field-updated' : ''}`} key={fieldKey}>
        <div className="claim-field-label">{label}</div>
        <div className="claim-field-value">
          {isEmpty ? (<span className="claim-field-placeholder">Not yet provided</span>) : (<span>{String(value)}</span>)}
        </div>
      </div>);
    };
    /**
     * Format location for display
     */
    const formatLocation = () => {
        var _a;
        const location = (_a = claimData.incident) === null || _a === void 0 ? void 0 : _a.location;
        if (!location)
            return undefined;
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
        if (!otherParty)
            return undefined;
        const name = [otherParty.firstName, otherParty.lastName].filter(Boolean).join(' ');
        const insurance = otherParty.insuranceCompany;
        if (name && insurance) {
            return `${name} (${insurance})`;
        }
        else if (name) {
            return name;
        }
        else if (insurance) {
            return insurance;
        }
        return undefined;
    };
    return (<div className="claim-fields-display">
      <h3>Collected Information</h3>
      
      <div className="claim-fields-grid">
        {/* Incident Information */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Incident Details</h4>
          {renderField('Date & Time', (_a = claimData.incident) === null || _a === void 0 ? void 0 : _a.occurrenceDateTime, 'occurrenceDateTime')}
          {renderField('Location', formatLocation(), 'location')}
          {renderField('Description', (_b = claimData.incident) === null || _b === void 0 ? void 0 : _b.description, 'description')}
        </div>

        {/* Personal Information */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Your Information</h4>
          {renderField('Policy Number', (_c = claimData.policy) === null || _c === void 0 ? void 0 : _c.id, 'policyId')}
          {renderField("Driver's License", (_d = claimData.personalInformation) === null || _d === void 0 ? void 0 : _d.driversLicenseNumber, 'driversLicense')}
          {renderField('License Plate', (_e = claimData.personalInformation) === null || _e === void 0 ? void 0 : _e.licensePlateNumber, 'licensePlate')}
          {renderField('Number of Passengers', (_f = claimData.personalInformation) === null || _f === void 0 ? void 0 : _f.numberOfPassengers, 'passengers')}
          {renderField('Were You Driving?', ((_g = claimData.personalInformation) === null || _g === void 0 ? void 0 : _g.isInsurerDriver) !== undefined
            ? (claimData.personalInformation.isInsurerDriver ? 'Yes' : 'No')
            : undefined, 'wasDriving')}
        </div>

        {/* Police Report */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Police Report</h4>
          {renderField('Police Report Filed?', ((_h = claimData.policeReport) === null || _h === void 0 ? void 0 : _h.isFiled) !== undefined
            ? (claimData.policeReport.isFiled ? 'Yes' : 'No')
            : undefined, 'policeFiled')}
          {((_j = claimData.policeReport) === null || _j === void 0 ? void 0 : _j.isFiled) && renderField('Report Available?', ((_k = claimData.policeReport) === null || _k === void 0 ? void 0 : _k.reportOrReceiptAvailable) !== undefined
            ? (claimData.policeReport.reportOrReceiptAvailable ? 'Yes' : 'No')
            : undefined, 'policeReceipt')}
        </div>

        {/* Other Party */}
        <div className="claim-fields-section">
          <h4 className="claim-fields-section-title">Other Party</h4>
          {renderField('Other Party', formatOtherParty(), 'otherParty')}
        </div>
      </div>
    </div>);
};
exports.ClaimFieldsDisplay = ClaimFieldsDisplay;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2xhaW1GaWVsZHNEaXNwbGF5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ2xhaW1GaWVsZHNEaXNwbGF5LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILGlDQUFtRDtBQVluRDs7O0dBR0c7QUFDSSxNQUFNLGtCQUFrQixHQUFzQyxDQUFDLEVBQ3BFLFNBQVMsRUFDVixFQUFFLEVBQUU7O0lBQ0gsTUFBTSxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLElBQUEsZ0JBQVEsRUFBYyxFQUFFLENBQUMsQ0FBQztJQUNwRSxNQUFNLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxHQUFHLElBQUEsZ0JBQVEsRUFBcUIsRUFBRSxDQUFDLENBQUM7SUFFekUsdUNBQXVDO0lBQ3ZDLElBQUEsaUJBQVMsRUFBQyxHQUFHLEVBQUU7O1FBQ2IsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUVuQyxrQ0FBa0M7UUFDbEMsSUFBSSxDQUFBLE1BQUEsU0FBUyxDQUFDLFFBQVEsMENBQUUsa0JBQWtCLE9BQUssTUFBQSxZQUFZLENBQUMsUUFBUSwwQ0FBRSxrQkFBa0IsQ0FBQSxFQUFFLENBQUM7WUFDekYsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzFDLENBQUM7UUFDRCxJQUFJLENBQUEsTUFBQSxNQUFBLFNBQVMsQ0FBQyxRQUFRLDBDQUFFLFFBQVEsMENBQUUsSUFBSSxPQUFLLE1BQUEsTUFBQSxZQUFZLENBQUMsUUFBUSwwQ0FBRSxRQUFRLDBDQUFFLElBQUksQ0FBQSxFQUFFLENBQUM7WUFDakYsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDO1FBQ0QsSUFBSSxDQUFBLE1BQUEsU0FBUyxDQUFDLFFBQVEsMENBQUUsV0FBVyxPQUFLLE1BQUEsWUFBWSxDQUFDLFFBQVEsMENBQUUsV0FBVyxDQUFBLEVBQUUsQ0FBQztZQUMzRSxVQUFV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aWVsZHNEaXNwbGF5IENvbXBvbmVudFxuICogXG4gKiBEaXNwbGF5cyBleHRyYWN0ZWQgY2xhaW0gZmllbGRzIGluIGEgc3RydWN0dXJlZCBmb3JtYXQuXG4gKiBIaWdobGlnaHRzIG5ld2x5IHVwZGF0ZWQgZmllbGRzIHdpdGggc3VidGxlIGFuaW1hdGlvbi5cbiAqIFNob3dzIGVtcHR5IHN0YXRlIGZvciBmaWVsZHMgbm90IHlldCBjb2xsZWN0ZWQuXG4gKiBcbiAqIFJlcXVpcmVtZW50czogMy40LCA5LjQsIDEzLjVcbiAqL1xuXG5pbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IENsYWltRGF0YSB9IGZyb20gJy4vdHlwZXMnO1xuXG5pbnRlcmZhY2UgQ2xhaW1GaWVsZHNEaXNwbGF5UHJvcHMge1xuICAvKiogUGFydGlhbCBjbGFpbSBkYXRhIHdpdGggZmllbGRzIHRoYXQgaGF2ZSBiZWVuIGV4dHJhY3RlZCAqL1xuICBjbGFpbURhdGE6IFBhcnRpYWw8Q2xhaW1EYXRhPjtcbn1cblxuaW50ZXJmYWNlIEZpZWxkVXBkYXRlIHtcbiAgW2tleTogc3RyaW5nXTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDbGFpbUZpZWxkc0Rpc3BsYXkgY29tcG9uZW50IHNob3dzIGV4dHJhY3RlZCBjbGFpbSBmaWVsZHNcbiAqIGluIGEgc3RydWN0dXJlZCBmb3JtYXQgd2l0aCB2aXN1YWwgaGllcmFyY2h5IGFuZCBhbmltYXRpb25zLlxuICovXG5leHBvcnQgY29uc3QgQ2xhaW1GaWVsZHNEaXNwbGF5OiBSZWFjdC5GQzxDbGFpbUZpZWxkc0Rpc3BsYXlQcm9wcz4gPSAoe1xuICBjbGFpbURhdGFcbn0pID0+IHtcbiAgY29uc3QgW3VwZGF0ZWRGaWVsZHMsIHNldFVwZGF0ZWRGaWVsZHNdID0gdXNlU3RhdGU8RmllbGRVcGRhdGU+KHt9KTtcbiAgY29uc3QgW3ByZXZpb3VzRGF0YSwgc2V0UHJldmlvdXNEYXRhXSA9IHVzZVN0YXRlPFBhcnRpYWw8Q2xhaW1EYXRhPj4oe30pO1xuXG4gIC8vIFRyYWNrIGZpZWxkIHVwZGF0ZXMgZm9yIGhpZ2hsaWdodGluZ1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IG5ld1VwZGF0ZXM6IEZpZWxkVXBkYXRlID0ge307XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIGNoYW5nZXMgaW4gZWFjaCBmaWVsZFxuICAgIGlmIChjbGFpbURhdGEuaW5jaWRlbnQ/Lm9jY3VycmVuY2VEYXRlVGltZSAhPT0gcHJldmlvdXNEYXRhLmluY2lkZW50Py5vY2N1cnJlbmNlRGF0ZVRpbWUpIHtcbiAgICAgIG5ld1VwZGF0ZXNbJ29jY3VycmVuY2VEYXRlVGltZSddID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGNsYWltRGF0YS5pbmNpZGVudD8ubG9jYXRpb24/LnJvYWQgIT09IHByZXZpb3VzRGF0YS5pbmNpZGVudD8ubG9jYXRpb24/LnJvYWQpIHtcbiAgICAgIG5ld1VwZGF0ZXNbJ2xvY2F0aW9uJ10gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoY2xhaW1EYXRhLmluY2lkZW50Py5kZXNjcmlwdGlvbiAhPT0gcHJldmlvdXNEYXRhLmluY2lkZW50Py5kZXNjcmlwdGlvbikge1xuICAgICAgbmV3VXBkYXRlc1snZGVzY3JpcHRpb24nXSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChjbGFpbURhdGEucG9saWN5Py5pZCAhPT0gcHJldmlvdXNEYXRhLnBvbGljeT8uaWQpIHtcbiAgICAgIG5ld1VwZGF0ZXNbJ3BvbGljeUlkJ10gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoY2xhaW1EYXRhLnBlcnNvbmFsSW5mb3JtYXRpb24/LmRyaXZlcnNMaWNlbnNlTnVtYmVyICE9PSBwcmV2aW91c0RhdGEucGVyc29uYWxJbmZvcm1hdGlvbj8uZHJpdmVyc0xpY2Vuc2VOdW1iZXIpIHtcbiAgICAgIG5ld1VwZGF0ZXNbJ2RyaXZlcnNMaWNlbnNlJ10gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoY2xhaW1EYXRhLnBlcnNvbmFsSW5mb3JtYXRpb24/LmxpY2Vuc2VQbGF0ZU51bWJlciAhPT0gcHJldmlvdXNEYXRhLnBlcnNvbmFsSW5mb3JtYXRpb24/LmxpY2Vuc2VQbGF0ZU51bWJlcikge1xuICAgICAgbmV3VXBkYXRlc1snbGljZW5zZVBsYXRlJ10gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoY2xhaW1EYXRhLnBlcnNvbmFsSW5mb3JtYXRpb24/Lm51bWJlck9mUGFzc2VuZ2VycyAhPT0gcHJldmlvdXNEYXRhLnBlcnNvbmFsSW5mb3JtYXRpb24/Lm51bWJlck9mUGFzc2VuZ2Vycykge1xuICAgICAgbmV3VXBkYXRlc1sncGFzc2VuZ2VycyddID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGNsYWltRGF0YS5wZXJzb25hbEluZm9ybWF0aW9uPy5pc0luc3VyZXJEcml2ZXIgIT09IHByZXZpb3VzRGF0YS5wZXJzb25hbEluZm9ybWF0aW9uPy5pc0luc3VyZXJEcml2ZXIpIHtcbiAgICAgIG5ld1VwZGF0ZXNbJ3dhc0RyaXZlcmluZyddID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGNsYWltRGF0YS5wb2xpY2VSZXBvcnQ/LmlzRmlsZWQgIT09IHByZXZpb3VzRGF0YS5wb2xpY2VSZXBvcnQ/LmlzRmlsZWQpIHtcbiAgICAgIG5ld1VwZGF0ZXNbJ3BvbGljZUZpbGVkJ10gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoY2xhaW1EYXRhLm90aGVyUGFydHk/LmZpcnN0TmFtZSAhPT0gcHJldmlvdXNEYXRhLm90aGVyUGFydHk/LmZpcnN0TmFtZSB8fFxuICAgICAgICBjbGFpbURhdGEub3RoZXJQYXJ0eT8ubGFzdE5hbWUgIT09IHByZXZpb3VzRGF0YS5vdGhlclBhcnR5Py5sYXN0TmFtZSkge1xuICAgICAgbmV3VXBkYXRlc1snb3RoZXJQYXJ0eSddID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmtleXMobmV3VXBkYXRlcykubGVuZ3RoID4gMCkge1xuICAgICAgc2V0VXBkYXRlZEZpZWxkcyhuZXdVcGRhdGVzKTtcbiAgICAgIHNldFByZXZpb3VzRGF0YShjbGFpbURhdGEpO1xuXG4gICAgICAvLyBDbGVhciBoaWdobGlnaHRzIGFmdGVyIGFuaW1hdGlvblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHNldFVwZGF0ZWRGaWVsZHMoe30pO1xuICAgICAgfSwgMjAwMCk7XG4gICAgfVxuICB9LCBbY2xhaW1EYXRhLCBwcmV2aW91c0RhdGFdKTtcblxuICAvKipcbiAgICogUmVuZGVyIGEgZmllbGQgd2l0aCBsYWJlbCBhbmQgdmFsdWVcbiAgICovXG4gIGNvbnN0IHJlbmRlckZpZWxkID0gKFxuICAgIGxhYmVsOiBzdHJpbmcsXG4gICAgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQgfCBudWxsLFxuICAgIGZpZWxkS2V5OiBzdHJpbmdcbiAgKSA9PiB7XG4gICAgY29uc3QgaXNFbXB0eSA9IHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09ICcnO1xuICAgIGNvbnN0IGlzVXBkYXRlZCA9IHVwZGF0ZWRGaWVsZHNbZmllbGRLZXldO1xuICAgIFxuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IFxuICAgICAgICBjbGFzc05hbWU9e2BjbGFpbS1maWVsZCAke2lzRW1wdHkgPyAnY2xhaW0tZmllbGQtZW1wdHknIDogJyd9ICR7aXNVcGRhdGVkID8gJ2NsYWltLWZpZWxkLXVwZGF0ZWQnIDogJyd9YH1cbiAgICAgICAga2V5PXtmaWVsZEtleX1cbiAgICAgID5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjbGFpbS1maWVsZC1sYWJlbFwiPntsYWJlbH08L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjbGFpbS1maWVsZC12YWx1ZVwiPlxuICAgICAgICAgIHtpc0VtcHR5ID8gKFxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiY2xhaW0tZmllbGQtcGxhY2Vob2xkZXJcIj5Ob3QgeWV0IHByb3ZpZGVkPC9zcGFuPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8c3Bhbj57U3RyaW5nKHZhbHVlKX08L3NwYW4+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBGb3JtYXQgbG9jYXRpb24gZm9yIGRpc3BsYXlcbiAgICovXG4gIGNvbnN0IGZvcm1hdExvY2F0aW9uID0gKCkgPT4ge1xuICAgIGNvbnN0IGxvY2F0aW9uID0gY2xhaW1EYXRhLmluY2lkZW50Py5sb2NhdGlvbjtcbiAgICBpZiAoIWxvY2F0aW9uKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIFxuICAgIGNvbnN0IHBhcnRzID0gW1xuICAgICAgbG9jYXRpb24ucm9hZCxcbiAgICAgIGxvY2F0aW9uLmNpdHksXG4gICAgICBsb2NhdGlvbi5zdGF0ZSxcbiAgICAgIGxvY2F0aW9uLnppcCxcbiAgICAgIGxvY2F0aW9uLmNvdW50cnlcbiAgICBdLmZpbHRlcihCb29sZWFuKTtcbiAgICBcbiAgICByZXR1cm4gcGFydHMubGVuZ3RoID4gMCA/IHBhcnRzLmpvaW4oJywgJykgOiB1bmRlZmluZWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBvdGhlciBwYXJ0eSBuYW1lXG4gICAqL1xuICBjb25zdCBmb3JtYXRPdGhlclBhcnR5ID0gKCkgPT4ge1xuICAgIGNvbnN0IG90aGVyUGFydHkgPSBjbGFpbURhdGEub3RoZXJQYXJ0eTtcbiAgICBpZiAoIW90aGVyUGFydHkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgXG4gICAgY29uc3QgbmFtZSA9IFtvdGhlclBhcnR5LmZpcnN0TmFtZSwgb3RoZXJQYXJ0eS5sYXN0TmFtZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcbiAgICBjb25zdCBpbnN1cmFuY2UgPSBvdGhlclBhcnR5Lmluc3VyYW5jZUNvbXBhbnk7XG4gICAgXG4gICAgaWYgKG5hbWUgJiYgaW5zdXJhbmNlKSB7XG4gICAgICByZXR1cm4gYCR7bmFtZX0gKCR7aW5zdXJhbmNlfSlgO1xuICAgIH0gZWxzZSBpZiAobmFtZSkge1xuICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfSBlbHNlIGlmIChpbnN1cmFuY2UpIHtcbiAgICAgIHJldHVybiBpbnN1cmFuY2U7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImNsYWltLWZpZWxkcy1kaXNwbGF5XCI+XG4gICAgICA8aDM+Q29sbGVjdGVkIEluZm9ybWF0aW9uPC9oMz5cbiAgICAgIFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJjbGFpbS1maWVsZHMtZ3JpZFwiPlxuICAgICAgICB7LyogSW5jaWRlbnQgSW5mb3JtYXRpb24gKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2xhaW0tZmllbGRzLXNlY3Rpb25cIj5cbiAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwiY2xhaW0tZmllbGRzLXNlY3Rpb24tdGl0bGVcIj5JbmNpZGVudCBEZXRhaWxzPC9oND5cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ0RhdGUgJiBUaW1lJywgY2xhaW1EYXRhLmluY2lkZW50Py5vY2N1cnJlbmNlRGF0ZVRpbWUsICdvY2N1cnJlbmNlRGF0ZVRpbWUnKX1cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ0xvY2F0aW9uJywgZm9ybWF0TG9jYXRpb24oKSwgJ2xvY2F0aW9uJyl9XG4gICAgICAgICAge3JlbmRlckZpZWxkKCdEZXNjcmlwdGlvbicsIGNsYWltRGF0YS5pbmNpZGVudD8uZGVzY3JpcHRpb24sICdkZXNjcmlwdGlvbicpfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7LyogUGVyc29uYWwgSW5mb3JtYXRpb24gKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2xhaW0tZmllbGRzLXNlY3Rpb25cIj5cbiAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwiY2xhaW0tZmllbGRzLXNlY3Rpb24tdGl0bGVcIj5Zb3VyIEluZm9ybWF0aW9uPC9oND5cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ1BvbGljeSBOdW1iZXInLCBjbGFpbURhdGEucG9saWN5Py5pZCwgJ3BvbGljeUlkJyl9XG4gICAgICAgICAge3JlbmRlckZpZWxkKFwiRHJpdmVyJ3MgTGljZW5zZVwiLCBjbGFpbURhdGEucGVyc29uYWxJbmZvcm1hdGlvbj8uZHJpdmVyc0xpY2Vuc2VOdW1iZXIsICdkcml2ZXJzTGljZW5zZScpfVxuICAgICAgICAgIHtyZW5kZXJGaWVsZCgnTGljZW5zZSBQbGF0ZScsIGNsYWltRGF0YS5wZXJzb25hbEluZm9ybWF0aW9uPy5saWNlbnNlUGxhdGVOdW1iZXIsICdsaWNlbnNlUGxhdGUnKX1cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ051bWJlciBvZiBQYXNzZW5nZXJzJywgY2xhaW1EYXRhLnBlcnNvbmFsSW5mb3JtYXRpb24/Lm51bWJlck9mUGFzc2VuZ2VycywgJ3Bhc3NlbmdlcnMnKX1cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ1dlcmUgWW91IERyaXZpbmc/JywgXG4gICAgICAgICAgICBjbGFpbURhdGEucGVyc29uYWxJbmZvcm1hdGlvbj8uaXNJbnN1cmVyRHJpdmVyICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgID8gKGNsYWltRGF0YS5wZXJzb25hbEluZm9ybWF0aW9uLmlzSW5zdXJlckRyaXZlciA/ICdZZXMnIDogJ05vJylcbiAgICAgICAgICAgICAgOiB1bmRlZmluZWQsIFxuICAgICAgICAgICAgJ3dhc0RyaXZpbmcnXG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qIFBvbGljZSBSZXBvcnQgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2xhaW0tZmllbGRzLXNlY3Rpb25cIj5cbiAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwiY2xhaW0tZmllbGRzLXNlY3Rpb24tdGl0bGVcIj5Qb2xpY2UgUmVwb3J0PC9oND5cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ1BvbGljZSBSZXBvcnQgRmlsZWQ/JywgXG4gICAgICAgICAgICBjbGFpbURhdGEucG9saWNlUmVwb3J0Py5pc0ZpbGVkICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgID8gKGNsYWltRGF0YS5wb2xpY2VSZXBvcnQuaXNGaWxlZCA/ICdZZXMnIDogJ05vJylcbiAgICAgICAgICAgICAgOiB1bmRlZmluZWQsIFxuICAgICAgICAgICAgJ3BvbGljZUZpbGVkJ1xuICAgICAgICAgICl9XG4gICAgICAgICAge2NsYWltRGF0YS5wb2xpY2VSZXBvcnQ/LmlzRmlsZWQgJiYgcmVuZGVyRmllbGQoJ1JlcG9ydCBBdmFpbGFibGU/JywgXG4gICAgICAgICAgICBjbGFpbURhdGEucG9saWNlUmVwb3J0Py5yZXBvcnRPclJlY2VpcHRBdmFpbGFibGUgIT09IHVuZGVmaW5lZCBcbiAgICAgICAgICAgICAgPyAoY2xhaW1EYXRhLnBvbGljZVJlcG9ydC5yZXBvcnRPclJlY2VpcHRBdmFpbGFibGUgPyAnWWVzJyA6ICdObycpXG4gICAgICAgICAgICAgIDogdW5kZWZpbmVkLCBcbiAgICAgICAgICAgICdwb2xpY2VSZWNlaXB0J1xuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiBPdGhlciBQYXJ0eSAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjbGFpbS1maWVsZHMtc2VjdGlvblwiPlxuICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJjbGFpbS1maWVsZHMtc2VjdGlvbi10aXRsZVwiPk90aGVyIFBhcnR5PC9oND5cbiAgICAgICAgICB7cmVuZGVyRmllbGQoJ090aGVyIFBhcnR5JywgZm9ybWF0T3RoZXJQYXJ0eSgpLCAnb3RoZXJQYXJ0eScpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcbiJdfQ==