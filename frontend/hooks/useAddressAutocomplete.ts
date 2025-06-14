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
    place: google.maps.places.Place;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressComponents | null>(null);

  const clearAddress = useCallback(() => {
    setSelectedAddress(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  // Function to parse address components from the new Place API response
  const parseAddressComponents = useCallback((addressComponents: google.maps.places.AddressComponent[]) => {
    const components: AddressComponents = {};
    
    addressComponents.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number') && component.longText) {
        components.streetNumber = component.longText;
      } else if (types.includes('route') && component.longText) {
        components.streetName = component.longText;
      } else if (types.includes('locality') && component.longText) {
        components.city = component.longText;
      } else if (types.includes('administrative_area_level_1') && component.shortText) {
        components.state = component.shortText;
      } else if (types.includes('postal_code') && component.longText) {
        components.zipCode = component.longText;
      } else if (types.includes('country') && component.longText) {
        components.country = component.longText;
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
        
        if (!place) {
          console.error('No place found in selection');
          return;
        }

        try {
          // Use the new Place API to fetch address components
          await place.fetchFields({ fields: ['addressComponents'] });
          
          if (!place.addressComponents) {
            console.error('No address components found in place');
            return;
          }

          console.log('Place address components:', place.addressComponents);

          // Parse address components from the new API response
          const components = parseAddressComponents(place.addressComponents);
          
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
  }, [onAddressSelect, parseAddressComponents]);

  return {
    inputRef,
    isLoaded,
    error,
    selectedAddress,
    clearAddress
  };
}
