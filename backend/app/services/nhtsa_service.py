import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)

class NHTSAService:
    """Service to interact with NHTSA Vehicle API"""
    
    BASE_URL = "https://vpic.nhtsa.dot.gov/api"
    CACHE_DURATION = timedelta(hours=24)  # Cache for 24 hours
    
    def __init__(self):
        self._makes_cache: Optional[Dict] = None
        self._makes_cache_time: Optional[datetime] = None
        self._models_cache: Dict[str, Dict] = {}
        self._models_cache_time: Dict[str, datetime] = {}
    
    async def get_all_makes(self) -> List[Dict[str, str]]:
        """
        Get curated list of the 36 most common vehicle makes
        Returns list of dicts with 'Make_ID' and 'Make_Name' ordered by sales volume
        """
        # Check cache first
        if (self._makes_cache and self._makes_cache_time and 
            datetime.now() - self._makes_cache_time < self.CACHE_DURATION):
            return self._makes_cache
        
        # Use curated list of top 36 makes by sales volume
        makes = self._get_curated_makes()
        
        # Cache the results
        self._makes_cache = makes
        self._makes_cache_time = datetime.now()
        
        logger.info(f"Returning curated list of {len(makes)} most common vehicle makes")
        return makes
    
    async def get_models_for_make(self, make_name: str) -> List[Dict[str, str]]:
        """
        Get all models for a specific make from NHTSA API
        Returns list of dicts with 'Model_ID' and 'Model_Name'
        """
        # Check cache first
        cache_key = make_name.lower()
        if (cache_key in self._models_cache and 
            cache_key in self._models_cache_time and
            datetime.now() - self._models_cache_time[cache_key] < self.CACHE_DURATION):
            return self._models_cache[cache_key]
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # URL encode the make name
                encoded_make = make_name.replace(" ", "%20")
                response = await client.get(
                    f"{self.BASE_URL}/vehicles/GetModelsForMake/{encoded_make}?format=json"
                )
                response.raise_for_status()
                
                data = response.json()
                if data.get("Count", 0) > 0:
                    models = data.get("Results", [])
                    # Cache the results
                    self._models_cache[cache_key] = models
                    self._models_cache_time[cache_key] = datetime.now()
                    
                    logger.info(f"Successfully fetched {len(models)} models for make '{make_name}' from NHTSA")
                    return models
                else:
                    logger.warning(f"No models returned from NHTSA API for make '{make_name}'")
                    return []
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout while fetching models for make '{make_name}' from NHTSA API")
            return self._get_fallback_models(make_name)
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error while fetching models for make '{make_name}' from NHTSA API: {e}")
            return self._get_fallback_models(make_name)
        except Exception as e:
            logger.error(f"Unexpected error while fetching models for make '{make_name}' from NHTSA API: {e}")
            return self._get_fallback_models(make_name)
    
    def _get_curated_makes(self) -> List[Dict[str, str]]:
        """Return curated list of 37 most common vehicle makes ordered alphabetically"""
        makes = [
            {"Make_ID": 22, "Make_Name": "Acura"},
            {"Make_ID": 30, "Make_Name": "Alfa Romeo"},
            {"Make_ID": 18, "Make_Name": "Audi"},
            {"Make_ID": 32, "Make_Name": "Bentley"},
            {"Make_ID": 13, "Make_Name": "BMW"},
            {"Make_ID": 21, "Make_Name": "Buick"},
            {"Make_ID": 19, "Make_Name": "Cadillac"},
            {"Make_ID": 3, "Make_Name": "Chevrolet"},
            {"Make_ID": 20, "Make_Name": "Chrysler"},
            {"Make_ID": 17, "Make_Name": "Dodge"},
            {"Make_ID": 34, "Make_Name": "Fiat"},
            {"Make_ID": 2, "Make_Name": "Ford"},
            {"Make_ID": 11, "Make_Name": "GMC"},
            {"Make_ID": 27, "Make_Name": "Genesis"},
            {"Make_ID": 4, "Make_Name": "Honda"},
            {"Make_ID": 5, "Make_Name": "Hyundai"},
            {"Make_ID": 28, "Make_Name": "INFINITI"},
            {"Make_ID": 7, "Make_Name": "Jeep"},
            {"Make_ID": 6, "Make_Name": "Kia"},
            {"Make_ID": 33, "Make_Name": "Lamborghini"},
            {"Make_ID": 16, "Make_Name": "Lexus"},
            {"Make_ID": 25, "Make_Name": "Lincoln"},
            {"Make_ID": 29, "Make_Name": "MINI"},
            {"Make_ID": 35, "Make_Name": "McLaren"},
            {"Make_ID": 31, "Make_Name": "Maserati"},
            {"Make_ID": 15, "Make_Name": "Mazda"},
            {"Make_ID": 12, "Make_Name": "Mercedes-Benz"},
            {"Make_ID": 24, "Make_Name": "Mitsubishi"},
            {"Make_ID": 8, "Make_Name": "Nissan"},
            {"Make_ID": 26, "Make_Name": "Porsche"},
            {"Make_ID": 10, "Make_Name": "Ram"},
            {"Make_ID": 36, "Make_Name": "Rolls-Royce"},
            {"Make_ID": 9, "Make_Name": "Subaru"},
            {"Make_ID": 37, "Make_Name": "Tesla"},
            {"Make_ID": 1, "Make_Name": "Toyota"},
            {"Make_ID": 14, "Make_Name": "Volkswagen"},
            {"Make_ID": 23, "Make_Name": "Volvo"},
        ]
        return makes
    
    def _get_fallback_makes(self) -> List[Dict[str, str]]:
        """Return fallback list - now just returns the curated list"""
        return self._get_curated_makes()
    
    def _get_fallback_models(self, make_name: str) -> List[Dict[str, str]]:
        """Return a fallback list of common models for popular makes if API fails"""
        fallback_models = {
            "Honda": [
                {"Model_ID": 1, "Model_Name": "Accord", "Make_ID": 4, "Make_Name": "Honda"},
                {"Model_ID": 2, "Model_Name": "Civic", "Make_ID": 4, "Make_Name": "Honda"},
                {"Model_ID": 3, "Model_Name": "CR-V", "Make_ID": 4, "Make_Name": "Honda"},
                {"Model_ID": 4, "Model_Name": "Pilot", "Make_ID": 4, "Make_Name": "Honda"},
                {"Model_ID": 5, "Model_Name": "Odyssey", "Make_ID": 4, "Make_Name": "Honda"},
            ],
            "Toyota": [
                {"Model_ID": 1, "Model_Name": "Camry", "Make_ID": 1, "Make_Name": "Toyota"},
                {"Model_ID": 2, "Model_Name": "Corolla", "Make_ID": 1, "Make_Name": "Toyota"},
                {"Model_ID": 3, "Model_Name": "RAV4", "Make_ID": 1, "Make_Name": "Toyota"},
                {"Model_ID": 4, "Model_Name": "Highlander", "Make_ID": 1, "Make_Name": "Toyota"},
                {"Model_ID": 5, "Model_Name": "Prius", "Make_ID": 1, "Make_Name": "Toyota"},
            ],
            "Ford": [
                {"Model_ID": 1, "Model_Name": "F-150", "Make_ID": 2, "Make_Name": "Ford"},
                {"Model_ID": 2, "Model_Name": "Escape", "Make_ID": 2, "Make_Name": "Ford"},
                {"Model_ID": 3, "Model_Name": "Explorer", "Make_ID": 2, "Make_Name": "Ford"},
                {"Model_ID": 4, "Model_Name": "Mustang", "Make_ID": 2, "Make_Name": "Ford"},
                {"Model_ID": 5, "Model_Name": "Focus", "Make_ID": 2, "Make_Name": "Ford"},
            ],
            "Chevrolet": [
                {"Model_ID": 1, "Model_Name": "Silverado", "Make_ID": 3, "Make_Name": "Chevrolet"},
                {"Model_ID": 2, "Model_Name": "Equinox", "Make_ID": 3, "Make_Name": "Chevrolet"},
                {"Model_ID": 3, "Model_Name": "Malibu", "Make_ID": 3, "Make_Name": "Chevrolet"},
                {"Model_ID": 4, "Model_Name": "Tahoe", "Make_ID": 3, "Make_Name": "Chevrolet"},
                {"Model_ID": 5, "Model_Name": "Cruze", "Make_ID": 3, "Make_Name": "Chevrolet"},
            ],
        }
        
        return fallback_models.get(make_name, [
            {"Model_ID": 1, "Model_Name": "Unknown Model", "Make_ID": 1, "Make_Name": make_name}
        ])

# Global instance
nhtsa_service = NHTSAService()
