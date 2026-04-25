'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Check, X } from 'lucide-react';

const LIBRARIES: ('places')[] = ['places'];

export interface AddressResult {
  direccion: string;
  lat: number;
  lng: number;
}

interface Props {
  defaultValue?: string;
  onSelect: (result: AddressResult) => void;
  onClear?: () => void;
}

export function AddressAutocomplete({ defaultValue, onSelect, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [selected, setSelected] = useState<string | null>(defaultValue ?? null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const result: AddressResult = {
      direccion: place.formatted_address ?? place.name ?? '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setSelected(result.direccion);
    onSelect(result);
  }, [onSelect]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    const auto = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'es' },
      fields: ['formatted_address', 'name', 'geometry.location'],
      types: ['address'],
    });

    auto.addListener('place_changed', handlePlaceChanged);
    autocompleteRef.current = auto;

    return () => {
      google.maps.event.clearInstanceListeners(auto);
    };
  }, [isLoaded, handlePlaceChanged]);

  function handleClear() {
    setSelected(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  }

  if (!isLoaded) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 text-sm">
        Cargando Google Maps...
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-green-800 flex-1">{selected}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-green-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar dirección..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      )}
    </div>
  );
}
