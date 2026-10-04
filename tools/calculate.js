export function calculate(args) {
  const { a, b, operator } = args;

  switch (operator) {
    case "+":
      return a + b;

    case "-":
      return a - b;

    case "*":
      return a * b;

    case "/":
      if (b === 0) {
        throw new Error("Cannot divide by zero");
      }
      return a / b;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}