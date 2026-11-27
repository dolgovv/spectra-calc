export const ROUTES = {
  home: "/",
  result: "/result",
  example: "/example",
  admin: "/admin",
} as const;

export const adminCalculationPath = (id: string) => `${ROUTES.admin}/calculations/${id}`;
