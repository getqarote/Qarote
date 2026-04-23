/** Extract the data type yielded by a tRPC subscription hook. */
/* eslint-disable @typescript-eslint/no-explicit-any -- generic constraint requires any */
export type SubData<
  T extends { useSubscription: (input: any, opts: any) => void },
> = Parameters<T["useSubscription"]>[1] extends {
  onData?: (d: infer D) => void;
}
  ? D
  : never;
/* eslint-enable @typescript-eslint/no-explicit-any */
