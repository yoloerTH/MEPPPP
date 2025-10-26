import { useEffect, RefObject } from 'react';

/**
 * Custom hook to detect clicks outside a referenced element
 * @param ref - React ref object pointing to the element
 * @param callback - Function to call when click outside is detected
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement>,
  callback: () => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the referenced element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
}