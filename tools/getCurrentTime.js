export function getCurrentTime() {
  const now = new Date();

  return {
    date: now.toLocaleDateString("en-CA"),
    time: now.toLocaleTimeString(),
    iso: now.toISOString()
  };
}