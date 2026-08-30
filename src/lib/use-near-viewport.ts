"use client";

import { useEffect, type RefObject } from "react";

/**
 * Calls `onEnter` once, when an element comes within `margin` of the viewport.
 *
 * IntersectionObserver alone is not enough. Browsers throttle observer callbacks
 * in backgrounded or unpainted tabs, and when that happens a chapter never loads
 * even though it is sitting in the middle of the screen. So this pairs the
 * observer with a plain scroll and resize check, and whichever notices first
 * wins. The measurement is a `getBoundingClientRect` on one element, which is
 * cheap enough to run on a throttled scroll.
 */
export function useNearViewport(
  ref: RefObject<HTMLElement | null>,
  margin: number,
  onEnter: () => void,
  enabled = true,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fire = () => {
      if (done) return;
      done = true;
      cleanup();
      onEnter();
    };

    const check = () => {
      if (done) return;
      const rect = element.getBoundingClientRect();
      if (rect.top - margin < window.innerHeight && rect.bottom + margin > 0) fire();
    };

    // Coalesce bursts of scroll events. A timer rather than requestAnimationFrame
    // on purpose: rAF does not run while a tab is not painting, which is the same
    // condition that silences IntersectionObserver, and the point of this hook is
    // to have a path that still works when that happens.
    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        check();
      }, 100);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fire();
      },
      { rootMargin: `${margin}px 0px` },
    );

    function cleanup() {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (timer) clearTimeout(timer);
    }

    observer.observe(element);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // The element may already be in range on mount.
    check();

    return cleanup;
  }, [ref, margin, onEnter, enabled]);
}
