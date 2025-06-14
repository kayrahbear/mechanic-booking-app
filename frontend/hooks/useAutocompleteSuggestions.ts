import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export type UseAutocompleteSuggestionsReturn = {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  resetSession: () => void;
  error: string | null;
};

/**
 * A reusable hook that retrieves autocomplete suggestions from the Google Places API.
 * Based on Google's official example from the new Autocomplete Data API.
 * 
 * @param inputString The input string for which to fetch autocomplete suggestions.
 * @param requestOptions Additional options for the autocomplete request
 * @returns An object containing the autocomplete suggestions, loading status, and session reset function
 */
export function useAutocompleteSuggestions(
  inputString: string,
  requestOptions: Partial<google.maps.places.AutocompleteRequest> = {}
): UseAutocompleteSuggestionsReturn {
  // Store reference to the places library
  const placesLibRef = useRef<typeof google.maps.places | null>(null);
  
  // Store the current sessionToken
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  
  // Track the last input that was processed to prevent duplicate requests
  const lastProcessedInputRef = useRef<string>('');

  // The suggestions based on the specified input
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);

  // Indicates if there is currently an incomplete request to the places API
  const [isLoading, setIsLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Maps Places Library
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    if (placesLibRef.current) return; // Already initialized

    // Load the Places library using the official loader
    const loadPlacesLibrary = async () => {
      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        // Import the places library using the new API
        placesLibRef.current = await google.maps.importLibrary('places') as typeof google.maps.places;
        setError(null);
      } catch (err) {
        console.error('Error loading Google Maps Places library:', err);
        setError('Failed to load Google Maps Places library');
      }
    };

    loadPlacesLibrary();
  }, []);

  // Fetch autocomplete suggestions when input changes (with debouncing and duplicate prevention)
  useEffect(() => {
    if (!placesLibRef.current) return;

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLibRef.current;

    // Create a new session if one doesn't already exist
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    if (inputString === '') {
      if (suggestions.length > 0) setSuggestions([]);
      setError(null);
      setIsLoading(false);
      lastProcessedInputRef.current = '';
      return;
    }

    // Prevent duplicate requests for the same input
    if (inputString === lastProcessedInputRef.current) {
      return;
    }

    // Debounce API calls to prevent excessive requests
    const timeoutId = setTimeout(() => {
      // Double-check that the input hasn't changed during the debounce period
      if (inputString !== lastProcessedInputRef.current) {
        lastProcessedInputRef.current = inputString;
        
        const request: google.maps.places.AutocompleteRequest = {
          ...requestOptions,
          input: inputString,
          sessionToken: sessionTokenRef.current || undefined
        };

        setIsLoading(true);
        setError(null);

        AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
          .then(res => {
            // Only update if this is still the current input
            if (inputString === lastProcessedInputRef.current) {
              setSuggestions(res.suggestions);
              setIsLoading(false);
            }
          })
          .catch(err => {
            // Only update if this is still the current input
            if (inputString === lastProcessedInputRef.current) {
              console.error('Error fetching autocomplete suggestions:', err);
              setError('Failed to fetch address suggestions');
              setSuggestions([]);
              setIsLoading(false);
            }
          });
      }
    }, 300); // 300ms debounce

    // Cleanup timeout on input change
    return () => clearTimeout(timeoutId);
  }, [inputString, requestOptions]);

  return {
    suggestions,
    isLoading,
    error,
    resetSession: () => {
      sessionTokenRef.current = null;
      setSuggestions([]);
      setError(null);
    }
  };
}
