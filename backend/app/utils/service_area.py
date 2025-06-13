"""
Service area validation for mobile mechanic service.
Validates customer addresses against serviceable ZIP codes.
"""
import os
import logging
from typing import List, Set
from .secret_manager import get_secret_or_env

logger = logging.getLogger(__name__)

class ServiceAreaError(Exception):
    """Raised when a customer address is outside the service area."""
    pass

def get_service_area_zips() -> Set[str]:
    """
    Get the list of serviceable ZIP codes from Secret Manager or environment variable.
    
    Returns:
        Set of ZIP codes that are within the service area
    """
    service_area_env = get_secret_or_env("SERVICE_AREA_ZIPS", "SERVICE_AREA_ZIPS", "")
    if not service_area_env:
        logger.warning("SERVICE_AREA_ZIPS not configured in Secret Manager or environment, allowing all ZIP codes")
        return set()
    
    # Parse comma-separated ZIP codes and clean them
    zip_codes = set()
    for zip_code in service_area_env.split(","):
        cleaned_zip = zip_code.strip()
        if cleaned_zip:
            zip_codes.add(cleaned_zip)
    
    logger.info(f"Loaded {len(zip_codes)} serviceable ZIP codes from Secret Manager")
    return zip_codes

def validate_service_area(customer_zip: str) -> bool:
    """
    Validate if a customer ZIP code is within the service area.
    
    Args:
        customer_zip: The customer's ZIP code
        
    Returns:
        True if the ZIP code is serviceable, False otherwise
        
    Raises:
        ServiceAreaError: If the ZIP code is outside the service area
    """
    if not customer_zip:
        raise ServiceAreaError("ZIP code is required")
    
    # Clean the ZIP code (remove spaces, handle ZIP+4 format)
    cleaned_zip = customer_zip.strip().split('-')[0]  # Handle ZIP+4 format
    
    service_zips = get_service_area_zips()
    
    # If no service area is configured, allow all ZIP codes (for development)
    if not service_zips:
        logger.warning(f"No service area configured, allowing ZIP code: {cleaned_zip}")
        return True
    
    if cleaned_zip not in service_zips:
        raise ServiceAreaError(
            f"Sorry, we don't currently service the {cleaned_zip} area. "
            f"Please contact us to see if we can accommodate your location."
        )
    
    logger.info(f"ZIP code {cleaned_zip} is within service area")
    return True

def get_service_area_message() -> str:
    """
    Get a user-friendly message about the current service area.
    
    Returns:
        String describing the service area
    """
    service_zips = get_service_area_zips()
    
    if not service_zips:
        return "We're currently expanding our service area. Contact us to check availability in your area."
    
    if len(service_zips) <= 5:
        zip_list = ", ".join(sorted(service_zips))
        return f"We currently service these ZIP codes: {zip_list}"
    else:
        return f"We service {len(service_zips)} ZIP codes in the area. Enter your ZIP code to check availability."
