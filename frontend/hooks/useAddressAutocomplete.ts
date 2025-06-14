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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressComponents | null>(null);

  const clearAddress = useCallback(() => {
    setSelectedAddress(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
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
      autocompleteRef.current.addEventListener('gmp-placeselect', (event: Event) => {
        const customEvent = event as PlaceSelectEvent;
        const place = customEvent.detail.place;
        
        if (!place || !place.addressComponents) {
          return;
        }

        // Parse address components
        const components: AddressComponents = {};
        
        place.addressComponents.forEach((component) => {
          const types = component.types;
          
          if (types.includes('street_number')) {
            components.streetNumber = component.longText;
          } else if (types.includes('route')) {
            components.streetName = component.longText;
          } else if (types.includes('locality')) {
            components.city = component.longText;
          } else if (types.includes('administrative_area_level_1')) {
            components.state = component.shortText;
          } else if (types.includes('postal_code')) {
            components.zipCode = component.longText;
          } else if (types.includes('country')) {
            components.country = component.longText;
          }
        });

        setSelectedAddress(components);
        onAddressSelect(components);
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
  }, [onAddressSelect]);

  return {
    inputRef,
    isLoaded,
    error,
    selectedAddress,
    clearAddress
  };
}
