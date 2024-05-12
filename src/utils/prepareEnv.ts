import { z } from 'zod';

const getUnderlyingZodTypeOrDefaultValue = <T>(
  value: z.ZodType<any, any>,
  env: Partial<T>,
  key: string,
): z.ZodType<any, any> | T[keyof T] => {
  if (value instanceof z.ZodDefault && env[key as keyof typeof env] === undefined) {
    return value._def.defaultValue();
  }
  if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
    return value;
  }

  return getUnderlyingZodTypeOrDefaultValue(value._def.innerType, env, key);
};

export const prepareEnv = <T>(shape: z.ZodRawShape, overrides: T) => {
  const env = {
    ...process.env,
    ...overrides,
  };

  const preparedEnv = Object.entries(shape).reduce(
    (acc, [key, value]) => {
      if (
        typeof env[key as keyof typeof env] !== 'undefined' &&
        typeof env[key as keyof typeof env] !== 'string'
      ) {
        acc[key as keyof Partial<T>] = env[key as keyof typeof env] as any;
        return acc;
      }
      value = getUnderlyingZodTypeOrDefaultValue(value, env, key) as any;
      if (!(value instanceof z.ZodType)) {
        acc[key as keyof Partial<T>] = value as any;
        return acc;
      }
      try {
        if (value instanceof z.ZodNumber) {
          acc[key as keyof Partial<T>] = Number(env[key as keyof typeof env]) as any;
          return acc;
        }
        if (value instanceof z.ZodBigInt) {
          acc[key as keyof Partial<T>] = BigInt(
            env[key as keyof typeof env] as string,
          ) as any;
          return acc;
        }
        if (value instanceof z.ZodBoolean) {
          acc[key as keyof Partial<T>] = (env[key as keyof typeof env] === 'true') as any;
          return acc;
        }
        if (value instanceof z.ZodEnum) {
          acc[key as keyof Partial<T>] = value.options.includes(
            env[key as keyof typeof env] as any,
          )
            ? env[key as keyof typeof env]
            : (value._def as any).defaultValue();
          return acc;
        }

        if (value instanceof z.ZodArray || value instanceof z.ZodObject) {
          acc[key as keyof Partial<T>] = JSON.parse(
            env[key as keyof typeof env] as string,
          );
          return acc;
        }
      } catch (e) {}

      acc[key as keyof Partial<T>] = env[key as keyof typeof env] as any;
      return acc;
    },
    {} as Record<keyof Partial<T>, T[keyof T]>,
  );

  return preparedEnv;
};
