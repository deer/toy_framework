type Effect = () => void;
type EffectsSet = Set<Effect>;
interface PropsToEffects {
  [key: string]: EffectsSet;
}

const MAX_RECURSION_DEPTH = 30;

export function createState<T extends object>(initialState: T) {
  const propsToEffects: PropsToEffects = {};
  const dirtyEffects: Effect[] = [];
  let queued = false;
  let currentEffect: Effect | undefined;

  let isFlushing = false;
  let recursionDepth = 0;

  function onGet(prop: string) {
    if (currentEffect) {
      const effects = propsToEffects[prop] ??
        (propsToEffects[prop] = new Set<Effect>());
      effects.add(currentEffect);
    }
  }

  function flush() {
    if (isFlushing) return;
    isFlushing = true;
    recursionDepth = 0;

    try {
      while (dirtyEffects.length > 0) {
        if (recursionDepth > MAX_RECURSION_DEPTH) {
          console.error("Max recursion depth exceeded");
          break;
        }

        const effect = dirtyEffects.shift();
        effect?.();
        recursionDepth++;
      }
    } finally {
      queued = false;
      isFlushing = false;
      recursionDepth = 0;
    }
  }

  function onSet<T>(prop: string, _value: T): void {
    if (propsToEffects[prop]) {
      for (const effect of propsToEffects[prop]) {
        if (!dirtyEffects.includes(effect)) {
          dirtyEffects.push(effect);
        }
      }
      if (!queued) {
        queued = true;
        queueMicrotask(flush);
      }
    }
  }

  const handler: ProxyHandler<T> = {
    get(target, prop: string | symbol, receiver) {
      if (typeof prop === "string") {
        onGet(prop);
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop: string | symbol, value: unknown, receiver) {
      if (typeof prop === "string") {
        const typedValue = value as T[keyof T];
        onSet(prop, typedValue);
        return Reflect.set(target, prop, typedValue, receiver);
      }
      return true;
    },
  };
  function createEffect(effect: Effect) {
    currentEffect = effect;
    effect();
    currentEffect = undefined;
  }

  return { state: new Proxy(initialState, handler), createEffect };
}
