type Effect = () => void;
type EffectsSet = Set<Effect>;
interface PropsToEffects {
  [key: string]: EffectsSet;
}

const propsToEffects: PropsToEffects = {};
const dirtyEffects: Effect[] = [];
let queued = false;
let currentEffect: Effect | undefined;

function onGet(prop: string) {
  if (currentEffect) {
    const effects = propsToEffects[prop] ??
      (propsToEffects[prop] = new Set<Effect>());
    effects.add(currentEffect);
  }
}

function flush() {
  while (dirtyEffects.length) {
    const effect = dirtyEffects.shift();
    effect?.();
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
      queueMicrotask(() => {
        queued = false;
        flush();
      });
    }
  }
}

export function createEffect(effect: Effect) {
  currentEffect = effect;
  effect();
  currentEffect = undefined;
}

export function createState<T extends object>(initialState: T) {
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

  return new Proxy(initialState, handler);
}
