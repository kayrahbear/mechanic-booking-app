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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
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

      // Create the autocomplete object
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
        fields: ['address_components', 'formatted_address']
      });

      // Add listener for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place || !place.address_components) {
          return;
        }

        // Parse address components
        const components: AddressComponents = {};
        
        place.address_components.forEach((component) => {
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
