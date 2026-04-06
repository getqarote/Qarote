/**
 * Fixed-capacity ring buffer that drops oldest entries when full.
 * Used for spy sessions to prevent unbounded memory growth under high throughput.
 */
export class BoundedBuffer<T> {
  private buf: (T | undefined)[];
  private head = 0;
  private count = 0;
  private _droppedCount = 0;

  constructor(private capacity: number) {
    this.buf = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    const tail = (this.head + this.count) % this.capacity;
    this.buf[tail] = item;

    if (this.count === this.capacity) {
      // Buffer is full — overwrite oldest, advance head
      this.head = (this.head + 1) % this.capacity;
      this._droppedCount++;
    } else {
      this.count++;
    }
  }

  drain(max: number): T[] {
    const n = Math.min(max, this.count);
    const result: T[] = [];

    for (let i = 0; i < n; i++) {
      const idx = (this.head + i) % this.capacity;
      result.push(this.buf[idx] as T);
      this.buf[idx] = undefined;
    }

    this.head = (this.head + n) % this.capacity;
    this.count -= n;

    return result;
  }

  get droppedCount(): number {
    return this._droppedCount;
  }

  get size(): number {
    return this.count;
  }

  clear(): void {
    this.buf = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
  }
}
