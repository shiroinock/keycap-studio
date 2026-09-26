/** Coalesce wheel start/end pairs and touch gestures into one idle update. */
export function settledUpdate(publish: () => void, delay = 150) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    cancel,
    schedule() {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        publish();
      }, delay);
    },
  };
}
