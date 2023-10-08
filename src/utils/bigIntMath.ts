export const BIGINT_MATH = {
  min: (...args: bigint[]) =>
    args.reduce((minimum, currentNumber) =>
      currentNumber < minimum ? currentNumber : minimum,
    ),
  max: (...args: bigint[]) =>
    args.reduce((maximum, currentNumber) =>
      currentNumber > maximum ? currentNumber : maximum,
    ),
};
