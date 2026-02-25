/** Extract the data type yielded by a tRPC subscription hook. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubData<
  T extends { useSubscription: (input: any, opts: any) => void },
> = Parameters<T["useSubscription"]>[1] extends {
  onData?: (d: infer D) => void;
}
  ? D
  : never;
