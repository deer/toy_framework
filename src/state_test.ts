import { createState } from "./state.ts";
import { assertEquals } from "./test_deps.ts";

Deno.test("basic state test", async () => {
  interface MyState {
    a: number;
    b: number;
    sum?: number;
  }

  const { state, createEffect } = createState<MyState>({ a: 1, b: 2 });

  createEffect(() => state.sum = state.a + state.b);

  state.a = 5;

  await Promise.resolve(); // wait for microtask queue to flush

  assertEquals(state.sum, 7);
});

Deno.test("recursion depth test", async () => {
  const originalConsoleError = console.error;
  let errorLogged = false;
  console.error = (message) => {
    if (message === "Max recursion depth exceeded") {
      errorLogged = true;
    }
  };

  interface CyclicState {
    a: number;
    b: number;
  }

  const { state, createEffect } = createState<CyclicState>({ a: 1, b: 2 });
  createEffect(() => state.b = state.a + 1);
  createEffect(() => state.a = state.b + 1);

  try {
    state.a = 5;
    await Promise.resolve();

    if (!errorLogged) {
      throw new Error(
        "Expected max recursion depth to be exceeded, but it wasn't.",
      );
    }
  } finally {
    console.error = originalConsoleError;
  }
});

Deno.test("state isolation test", async () => {
  interface StateA {
    value: number;
    doubled?: number;
  }

  interface StateB {
    count: number;
    incremented?: number;
  }

  const { state: stateA, createEffect: createEffectA } = createState<StateA>({
    value: 2,
  });
  const { state: stateB, createEffect: createEffectB } = createState<StateB>({
    count: 5,
  });

  let effectRunsA = 0;
  let effectRunsB = 0;

  createEffectA(() => {
    stateA.doubled = stateA.value * 2;
    effectRunsA++;
  });

  createEffectB(() => {
    stateB.incremented = stateB.count + 1;
    effectRunsB++;
  });

  stateA.value = 3; // This should trigger only stateA's effect
  stateB.count = 10; // This should trigger only stateB's effect

  await Promise.resolve(); // wait for microtask queue to flush

  assertEquals(
    stateA.doubled,
    6,
    "StateA's doubled value should be updated correctly.",
  );
  assertEquals(
    stateB.incremented,
    11,
    "StateB's incremented value should be updated correctly.",
  );
  assertEquals(effectRunsA, 2, "StateA's effect should run exactly once.");
  assertEquals(effectRunsB, 2, "StateB's effect should run exactly once.");
});
