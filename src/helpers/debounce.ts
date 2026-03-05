export const debounce = <T extends unknown[]>(callback: (...args: T) => void, wait: number) => {
  let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
  return (...args: T) => {
    window.clearTimeout(timeoutId ?? undefined);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};
