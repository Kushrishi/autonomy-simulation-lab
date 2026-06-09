interface QueueEntry<T> {
  item: T;
  priority: number;
  tieBreaker: number;
  insertionOrder: number;
}

export class MinPriorityQueue<T> {
  private heap: QueueEntry<T>[] = [];
  private nextInsertionOrder = 0;

  enqueue(item: T, priority: number, tieBreaker = 0): void {
    this.heap.push({
      item,
      priority,
      tieBreaker,
      insertionOrder: this.nextInsertionOrder,
    });

    this.nextInsertionOrder += 1;
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const root = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return root.item;
  }

  peek(): T | undefined {
    return this.heap[0]?.item;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.compare(this.heap[parentIndex], this.heap[currentIndex]) <= 0) {
        break;
      }

      this.swap(parentIndex, currentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const leftChildIndex = currentIndex * 2 + 1;
      const rightChildIndex = currentIndex * 2 + 2;
      let bestIndex = currentIndex;

      if (
        leftChildIndex < this.heap.length &&
        this.compare(this.heap[leftChildIndex], this.heap[bestIndex]) < 0
      ) {
        bestIndex = leftChildIndex;
      }

      if (
        rightChildIndex < this.heap.length &&
        this.compare(this.heap[rightChildIndex], this.heap[bestIndex]) < 0
      ) {
        bestIndex = rightChildIndex;
      }

      if (bestIndex === currentIndex) {
        break;
      }

      this.swap(currentIndex, bestIndex);
      currentIndex = bestIndex;
    }
  }

  private compare(a: QueueEntry<T>, b: QueueEntry<T>): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    if (a.tieBreaker !== b.tieBreaker) {
      return a.tieBreaker - b.tieBreaker;
    }

    return a.insertionOrder - b.insertionOrder;
  }

  private swap(a: number, b: number): void {
    const temporary = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = temporary;
  }
}