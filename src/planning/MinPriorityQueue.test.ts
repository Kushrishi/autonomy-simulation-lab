import { describe, expect, it } from "vitest";
import { MinPriorityQueue } from "./MinPriorityQueue";

describe("MinPriorityQueue", () => {
  it("dequeues items from lowest priority to highest priority", () => {
    const queue = new MinPriorityQueue<string>();

    queue.enqueue("high-cost", 10);
    queue.enqueue("low-cost", 1);
    queue.enqueue("medium-cost", 5);

    expect(queue.dequeue()).toBe("low-cost");
    expect(queue.dequeue()).toBe("medium-cost");
    expect(queue.dequeue()).toBe("high-cost");
    expect(queue.isEmpty()).toBe(true);
  });

  it("uses the tie-breaker when priorities are equal", () => {
    const queue = new MinPriorityQueue<string>();

    queue.enqueue("farther-from-goal", 4, 7);
    queue.enqueue("closer-to-goal", 4, 2);
    queue.enqueue("middle", 4, 5);

    expect(queue.dequeue()).toBe("closer-to-goal");
    expect(queue.dequeue()).toBe("middle");
    expect(queue.dequeue()).toBe("farther-from-goal");
  });

  it("preserves insertion order when priority and tie-breaker match", () => {
    const queue = new MinPriorityQueue<string>();

    queue.enqueue("first", 3, 1);
    queue.enqueue("second", 3, 1);
    queue.enqueue("third", 3, 1);

    expect(queue.dequeue()).toBe("first");
    expect(queue.dequeue()).toBe("second");
    expect(queue.dequeue()).toBe("third");
  });

  it("returns undefined when dequeuing an empty queue", () => {
    const queue = new MinPriorityQueue<string>();

    expect(queue.dequeue()).toBeUndefined();
    expect(queue.peek()).toBeUndefined();
    expect(queue.size()).toBe(0);
  });
});