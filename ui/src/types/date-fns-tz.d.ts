declare module "date-fns-tz" {
  export function formatInTimeZone(
    date: Date | number,
    timeZone: string,
    formatStr: string,
  ): string;
}

