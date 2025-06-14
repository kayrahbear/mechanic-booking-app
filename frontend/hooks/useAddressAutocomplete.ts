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
  const initializationRef = useRef(false);

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

    // Skip if already initialized or input ref not ready
    if (initializationRef.current || !inputRef.current) {
      return;
    }

    // Mark as being initialized
    initializationRef.current = true;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'marker']
    });

    loader.load().then(async () => {
      // Double check we still have the input and haven't been cleaned up
      if (!inputRef.current) return;

      try {
        // Import the Extended Component Library
        await google.maps.importLibrary('places');

        // Create the PlaceAutocompleteElement
        autocompleteRef.current = new google.maps.places.PlaceAutocompleteElement({
          types: ['address'],
          componentRestrictions: { country: 'us' }
        });

        // Replace the input with the autocomplete element
        const originalInput = inputRef.current;
        const parent = originalInput.parentNode;
        
        if (!parent) {
          console.error('Parent node not found for input element');
          return;
        }

        parent.replaceChild(autocompleteRef.current, originalInput);
        // Update ref to point to the autocomplete element's input
        inputRef.current = autocompleteRef.current.querySelector('input') as HTMLInputElement;

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
            // Fetch address components and formatted address
            await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
            
            if (!place.addressComponents) {
              console.error('No address components found in place');
              return;
            }

            console.log('Place address components:', place.addressComponents);

            // Parse address components from the new API response
            const components = parseAddressComponents(place.addressComponents);
            
            console.log('Parsed components:', components);

            // Update the input field with the formatted address
            if (inputRef.current && place.formattedAddress) {
              inputRef.current.value = place.formattedAddress;
              // Trigger a change event so React's controlled input updates
              const changeEvent = new Event('input', { bubbles: true });
              inputRef.current.dispatchEvent(changeEvent);
            }

            setSelectedAddress(components);
            onAddressSelect(components);
          } catch (error) {
            console.error('Error fetching place details:', error);
            setError('Failed to fetch complete address details');
          }
        });

        setIsLoaded(true);
      } catch (error) {
        console.error('Error setting up autocomplete:', error);
        setError('Failed to initialize address autocomplete');
      }
    }).catch((err) => {
      console.error('Error loading Google Maps API:', err);
      setError('Failed to load address autocomplete');
    });

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      }
      initializationRef.current = false;
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
