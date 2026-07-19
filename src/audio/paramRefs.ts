export type ParamRef = {
  node: unknown;
  setValue: (props: { value: number }) => Promise<void>;
};

/** Elementary's createRef typing is loose; match BYODMCSE's practical usage. */
// biome-ignore lint/suspicious/noExplicitAny: Elementary WebRenderer refs are untyped
export type ElemCore = { createRef: (...args: any[]) => any[] };

export function createParamRef(core: ElemCore, key: string, initialValue: number): ParamRef {
  const [node, setValue] = core.createRef("const", { key, value: initialValue }, []);
  return { node, setValue };
}

export function createConstRef(core: ElemCore, key: string, initialValue: number): ParamRef {
  return createParamRef(core, key, initialValue);
}

export function createGateRef(core: ElemCore, voiceKey: string): ParamRef {
  return createConstRef(core, `gate-${voiceKey}`, 0);
}
