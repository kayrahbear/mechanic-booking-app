import { useRef, useEffect, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface AddressComponents {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface PlaceSelectEvent extends Event {
  detail: {
    place: {
      id?: string;
      addressComponents?: Array<{
        types: string[];
        longText: string;
        shortText: string;
      }>;
    };
  };
}

interface AddressAutocompleteHook {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isLoaded: boolean;
  error: string | null;
  selectedAddress: AddressComponents | null;
  clearAddress: () => void;
}

export function useAddressAutocomplete(
  onAddressSelect: (address: AddressComponents) => void
): AddressAutocompleteHook {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressComponents | null>(null);

  const clearAddress = useCallback(() => {
    setSelectedAddress(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  // Function to fetch place details using Place ID
  const fetchPlaceDetails = useCallback(async (placeId: string) => {
    if (!placesServiceRef.current) {
      console.error('Places service not initialized');
      return null;
    }

    return new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: placeId,
        fields: ['address_components', 'formatted_address', 'geometry']
      };

      placesServiceRef.current!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          console.error('Place details request failed:', status);
          resolve(null);
        }
      });
    });
  }, []);

  // Function to parse address components from Place Details response
  const parseAddressComponents = useCallback((addressComponents: google.maps.GeocoderAddressComponent[]) => {
    const components: AddressComponents = {};
    
    addressComponents.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        components.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        components.streetName = component.long_name;
      } else if (types.includes('locality')) {
        components.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        components.state = component.short_name;
      } else if (types.includes('postal_code')) {
        components.zipCode = component.long_name;
      } else if (types.includes('country')) {
        components.country = component.long_name;
      }
    });

    return components;
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      if (!inputRef.current) return;

      // Initialize Places service for place details requests
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      placesServiceRef.current = new google.maps.places.PlacesService(map);

      // Create the autocomplete object with options
      autocompleteRef.current = new google.maps.places.PlaceAutocompleteElement({
        types: ['address'],
        componentRestrictions: { country: 'us' } // Restrict to US addresses
      });

      // Replace the input element with the autocomplete element
      const parent = inputRef.current.parentNode;
      if (parent) {
        parent.replaceChild(autocompleteRef.current, inputRef.current);
        // Update the ref to point to the new element's input
        inputRef.current = autocompleteRef.current.querySelector('input') as HTMLInputElement;
      }

      // Add listener for place selection
      autocompleteRef.current.addEventListener('gmp-placeselect', async (event: Event) => {
        const customEvent = event as PlaceSelectEvent;
        const place = customEvent.detail.place;
        
        console.log('Place selected:', place);
        
        if (!place || !place.id) {
          console.error('No place ID found in selection');
          return;
        }

        try {
          // Fetch complete place details using the place ID
          const placeDetails = await fetchPlaceDetails(place.id);
          
          if (!placeDetails || !placeDetails.address_components) {
            console.error('Failed to fetch place details or no address components found');
            return;
          }

          console.log('Place details:', placeDetails);

          // Parse address components from the detailed response
          const components = parseAddressComponents(placeDetails.address_components);
          
          console.log('Parsed components:', components);

          setSelectedAddress(components);
          onAddressSelect(components);
        } catch (error) {
          console.error('Error fetching place details:', error);
          setError('Failed to fetch complete address details');
        }
      });

      setIsLoaded(true);
    }).catch((err) => {
      console.error('Error loading Google Maps API:', err);
      setError('Failed to load address autocomplete');
    });

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onAddressSelect, fetchPlaceDetails, parseAddressComponents]);

  return {
    inputRef,
    isLoaded,
    error,
    selectedAddress,
    clearAddress
  };
}
