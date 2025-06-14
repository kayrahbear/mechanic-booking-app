import React, { FormEvent, useCallback, useState, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { useAutocompleteSuggestions } from '../../hooks/useAutocompleteSuggestions';
import { AddressAutocompleteProps, AddressAutocompleteRef, AddressComponents } from './types';

export const AddressAutocompleteInput = forwardRef<AddressAutocompleteRef, AddressAutocompleteProps>(
  ({ 
    value, 
    onChange, 
    onAddressSelect, 
    placeholder = "Enter your address", 
    className = "", 
    disabled = false, 
    required = false,
    id,
    name
  }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Memoize the request options to prevent unnecessary re-renders
    const requestOptions = useMemo(() => ({
      // Remove problematic parameters that cause API errors
      // Let Google's API handle location detection naturally
    }), []);

    // Use our new hook with minimal restrictions to avoid API errors
    // Only make API calls for inputs with 3+ characters to prevent excessive requests
    const shouldFetchSuggestions = value.trim().length >= 3;
    const { suggestions, isLoading, resetSession, error } = useAutocompleteSuggestions(
      shouldFetchSuggestions ? value : '', 
      requestOptions
    );

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => {
        onChange('');
        resetSession();
        setShowSuggestions(false);
      }
    }));

    const handleInput = useCallback((event: FormEvent<HTMLInputElement>) => {
      const newValue = (event.target as HTMLInputElement).value;
      onChange(newValue);
      setShowSuggestions(true);
    }, [onChange]);

    const handleFocus = useCallback(() => {
      if (suggestions.length > 0) {
        setShowSuggestions(true);
      }
    }, [suggestions.length]);

    const handleBlur = useCallback(() => {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => setShowSuggestions(false), 150);
    }, []);

    // Function to parse address components from Google Places API
    const parseAddressComponents = useCallback((addressComponents: google.maps.places.AddressComponent[]): AddressComponents => {
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

    const handleSuggestionClick = useCallback(
      async (suggestion: google.maps.places.AutocompleteSuggestion) => {
        if (!suggestion.placePrediction) return;

        try {
          // Convert the prediction to a Place object
          const place = suggestion.placePrediction.toPlace();

          // Fetch detailed place information
          await place.fetchFields({
            fields: ['addressComponents', 'formattedAddress']
          });

          // Parse the address components
          const components = parseAddressComponents(place.addressComponents || []);
          components.formattedAddress = place.formattedAddress || undefined;

          // Update the input value with the selected address
          onChange(suggestion.placePrediction.text.text);
          
          // Hide suggestions
          setShowSuggestions(false);
          
          // Reset session after successful selection
          resetSession();
          
          // Call the callback with parsed components
          onAddressSelect(components);
        } catch (error) {
          console.error('Error selecting place:', error);
        }
      },
      [onChange, onAddressSelect, parseAddressComponents, resetSession]
    );

    const baseClassName = `w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white focus:ring-primary focus:border-primary dark:focus:border-accent ${className}`;

    return (
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={baseClassName}
          disabled={disabled}
          required={required}
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-2 top-2 text-neutral-500 dark:text-neutral-400">
            <div className="animate-spin h-4 w-4 border-2 border-neutral-300 border-t-primary rounded-full"></div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && !error && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placePrediction?.placeId || index}
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 focus:bg-neutral-100 dark:focus:bg-neutral-600 text-neutral-800 dark:text-white border-none bg-transparent"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium">
                  {suggestion.placePrediction?.text.text}
                </div>
                {suggestion.placePrediction?.text.text !== suggestion.placePrediction?.text.text && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {/* Show secondary text if available - fallback to empty for now */}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AddressAutocompleteInput.displayName = 'AddressAutocompleteInput';
