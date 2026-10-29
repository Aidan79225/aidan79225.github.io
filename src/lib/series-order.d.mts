export interface SeriesOrderable {
  data: { date: Date; series?: string; seriesOrder?: number };
}

export function sortBySeriesOrder<T extends SeriesOrderable>(posts: T[]): T[];
