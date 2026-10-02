/**
 * The partner's React renders an empty <div>. Flarie's runtime (with its OWN
 * React, from the CDN) renders inside it. The two React copies never meet,
 * so the partner can be on React 17, 18 or 19.
 *
 *   <FlarieEmbedProvider options={{ getSessionToken }}>
 *     <FlarieGameList onSelect={(g) => attach(g.id)} />
 *   </FlarieEmbedProvider>
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  loadFlarie,
  type FlarieComponentHandle,
  type FlarieComponentName,
  type FlarieComponentProps,
  type FlarieInstance,
  type LoadFlarieOptions,
} from '@flarie/embed-js';

const FlarieContext = createContext<FlarieInstance | null>(null);

export function FlarieEmbedProvider({
  options,
  fallback = null,
  children,
}: {
  options: LoadFlarieOptions;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const [instance, setInstance] = useState<FlarieInstance | null>(null);
  const initialOptions = useRef(options); // init once; appearance is handled below

  useEffect(() => {
    let cancelled = false;
    let created: FlarieInstance | null = null;
    loadFlarie(initialOptions.current).then((i) => {
      if (cancelled) i.destroy();
      else setInstance((created = i));
    });
    return () => {
      cancelled = true;
      created?.destroy();
    };
  }, []);

  useEffect(() => {
    if (instance && options.appearance) instance.updateAppearance(options.appearance);
  }, [instance, options.appearance]);

  return <FlarieContext.Provider value={instance}>{instance ? children : fallback}</FlarieContext.Provider>;
}

export function FlarieComponent<K extends FlarieComponentName>({
  name,
  props,
  className,
}: {
  name: K;
  props?: FlarieComponentProps[K];
  className?: string;
}) {
  const instance = useContext(FlarieContext);
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<FlarieComponentHandle<K> | null>(null);
  const latestProps = useRef(props);
  latestProps.current = props;

  useEffect(() => {
    if (!instance || !ref.current) return;
    const handle = instance.create(name, latestProps.current);
    handle.mount(ref.current);
    handleRef.current = handle;
    return () => {
      handle.unmount();
      handleRef.current = null;
    };
  }, [instance, name]);

  useEffect(() => {
    if (props) handleRef.current?.update(props);
  }, [props]);

  return <div ref={ref} className={className} />;
}

export function FlarieGameList({ className, ...props }: FlarieComponentProps['game-list'] & { className?: string }) {
  return <FlarieComponent name="game-list" props={props} className={className} />;
}
