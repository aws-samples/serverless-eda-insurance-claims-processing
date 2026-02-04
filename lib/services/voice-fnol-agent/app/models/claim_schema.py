"""
Pydantic models for FNOL claim data structures.

These models match the existing FNOL API schema and provide validation
for claim data collected through voice conversation.
"""

from pydantic import BaseModel, Field
from typing import Optional


class Location(BaseModel):
    """Accident location details."""
    
    country: str = Field(..., description="Country where accident occurred")
    state: str = Field(..., description="State/province")
    city: str = Field(..., description="City")
    zip: str = Field(..., description="Postal/ZIP code")
    road: str = Field(..., description="Street/road name")


class Incident(BaseModel):
    """Incident details."""
    
    occurrence_date_time: str = Field(
        ...,
        alias="occurrenceDateTime",
        description="ISO 8601 datetime of accident"
    )
    fnol_date_time: str = Field(
        ...,
        alias="fnolDateTime",
        description="ISO 8601 datetime of FNOL submission"
    )
    location: Location
    description: str = Field(..., description="Description of what happened and damage")
    
    class Config:
        populate_by_name = True


class Policy(BaseModel):
    """Policy information."""
    
    id: str = Field(..., description="Policy ID")


class PersonalInformation(BaseModel):
    """Insured person's information."""
    
    customer_id: str = Field(
        ...,
        alias="customerId",
        description="Customer ID"
    )
    drivers_license_number: str = Field(
        ...,
        alias="driversLicenseNumber",
        description="Driver's license number"
    )
    is_insurer_driver: bool = Field(
        ...,
        alias="isInsurerDriver",
        description="Whether the insured was driving"
    )
    license_plate_number: str = Field(
        ...,
        alias="licensePlateNumber",
        description="License plate of insured vehicle"
    )
    number_of_passengers: int = Field(
        ...,
        alias="numberOfPassengers",
        description="Number of passengers in vehicle"
    )
    
    class Config:
        populate_by_name = True


class PoliceReport(BaseModel):
    """Police report information."""
    
    is_filed: bool = Field(
        ...,
        alias="isFiled",
        description="Whether police report was filed"
    )
    report_or_receipt_available: bool = Field(
        ...,
        alias="reportOrReceiptAvailable",
        description="Whether report/receipt is available"
    )
    
    class Config:
        populate_by_name = True


class OtherParty(BaseModel):
    """Other party involved in accident."""
    
    insurance_id: Optional[str] = Field(
        None,
        alias="insuranceId",
        description="Other party's insurance ID"
    )
    insurance_company: Optional[str] = Field(
        None,
        alias="insuranceCompany",
        description="Other party's insurance company"
    )
    first_name: Optional[str] = Field(
        None,
        alias="firstName",
        description="Other party's first name"
    )
    last_name: Optional[str] = Field(
        None,
        alias="lastName",
        description="Other party's last name"
    )
    
    class Config:
        populate_by_name = True


class FNOLPayload(BaseModel):
    """Complete FNOL payload matching existing API schema."""
    
    incident: Incident
    policy: Policy
    personal_information: PersonalInformation = Field(..., alias="personalInformation")
    police_report: PoliceReport = Field(..., alias="policeReport")
    other_party: OtherParty = Field(..., alias="otherParty")
    
    class Config:
        populate_by_name = True


class ConversationContext(BaseModel):
    """Maintains state throughout the voice conversation."""
    
    session_id: str = Field(..., description="Unique session identifier")
    safety_confirmed: bool = Field(
        default=False,
        description="Whether user safety has been confirmed"
    )
    current_phase: str = Field(
        default="safety_check",
        description="Current conversation phase: safety_check, collection, validation, confirmation"
    )
    
    # Partial data collection during conversation
    occurrence_date_time: Optional[str] = Field(
        None,
        description="ISO 8601 datetime of accident"
    )
    location_description: Optional[str] = Field(
        None,
        description="Natural language location description (will be parsed)"
    )
    damage_description: Optional[str] = Field(
        None,
        description="Description of damage and what happened"
    )
    customer_id: Optional[str] = Field(
        None,
        description="Customer ID from authenticated session"
    )
    policy_id: Optional[str] = Field(
        None,
        description="Policy ID"
    )
    drivers_license: Optional[str] = Field(
        None,
        description="Driver's license number"
    )
    license_plate: Optional[str] = Field(
        None,
        description="License plate of insured vehicle"
    )
    number_of_passengers: Optional[int] = Field(
        None,
        description="Number of passengers in vehicle"
    )
    was_driving: Optional[bool] = Field(
        None,
        description="Whether the insured was driving"
    )
    police_filed: Optional[bool] = Field(
        None,
        description="Whether police report was filed"
    )
    police_receipt: Optional[bool] = Field(
        None,
        description="Whether police report/receipt is available"
    )
    other_party_name: Optional[str] = Field(
        None,
        description="Other party's full name"
    )
    other_party_insurance: Optional[str] = Field(
        None,
        description="Other party's insurance company"
    )
    
    missing_fields: list[str] = Field(
        default_factory=list,
        description="List of required fields still missing"
    )
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="History of conversation messages"
    )
