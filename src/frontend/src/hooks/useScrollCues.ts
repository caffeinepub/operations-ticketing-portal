import { useEffect, useState, useRef, RefObject } from 'react';

interface ScrollCuesState {
  canScrollUp: boolean;
  canScrollDown: boolean;
  hasScrolled: boolean;
}

export function useScrollCues(scrollRef: RefObject<HTMLElement | null>): ScrollCuesState {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      
      // Can scroll up if not at the top
      setCanScrollUp(scrollTop > 0);
      
      // Can scroll down if not at the bottom (with 1px tolerance)
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
      
      // Mark as scrolled if user has scrolled at all
      if (scrollTop > 0 && !hasScrolled) {
        setHasScrolled(true);
      }
    };

    // Initial check
    updateScrollState();

    // Listen to scroll events
    element.addEventListener('scroll', updateScrollState);
    
    // Listen to resize events (content might change)
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [scrollRef, hasScrolled]);

  return { canScrollUp, canScrollDown, hasScrolled };
}
