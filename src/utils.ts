/**
 * A simple utility function to demonstrate testing and basic plugin functionality.
 * @param name The name to greet.
 * @param greeting The word to greet them with.
 * @returns A greeting string.
 */
export function greet(name: string, greeting = "Hello"): string {
  return `${greeting}, ${name}!`;
}
