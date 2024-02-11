import { createEffect, createState } from "./state.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("basic state test", async () => {
  interface MyState {
    a: number;
    b: number;
    sum?: number;
  }

  const state = createState<MyState>({ a: 1, b: 2 });

  state.a = 1;
  state.b = 2;

  createEffect(() => {
    state.sum = state.a + state.b;
  });

  state.a = 5;

  await Promise.resolve(); // wait for microtask queue to flush

  assertEquals(state.sum, 7);
});
