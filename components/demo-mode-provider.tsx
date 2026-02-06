"use client";

import { createContext, useContext, useEffect, useCallback, useRef, useSyncExternalStore } from "react";

type DemoModeContextType = {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
};

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  toggleDemoMode: () => {},
});

const DEMO_MODE_KEY = "chamber-demo-mode";
const DEMO_MODE_EVENT = "chamber-demo-mode-changed";
const ORIGINAL_ATTR = "data-demo-original";

// Simple seeded random from a string
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function fakeNumber(original: string): string {
  const seed = hashStr(original);
  // Keep roughly the same magnitude
  const num = parseFloat(original.replace(/,/g, ""));
  if (isNaN(num)) return original;
  const magnitude = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.abs(num) || 1))));
  const fake = Math.round(((seed % 900) + 100) / 100 * magnitude * 100) / 100;
  // Format with commas like Indian numbering if original had commas
  if (original.includes(",")) {
    return fake.toLocaleString("en-IN", { minimumFractionDigits: original.includes(".") ? 2 : 0 });
  }
  return original.includes(".") ? fake.toFixed(2) : Math.round(fake).toString();
}

// Replace numbers in a text string, preserving currency symbols and structure
function scrambleText(text: string): string {
  // Match currency amounts like ₹1,234.56 or $1,234 or plain numbers like 1234
  return text.replace(/([₹$€£]?\s?)([\d,]+\.?\d*)/g, (_match, prefix, numPart) => {
    return prefix + fakeNumber(numPart);
  });
}

function scrambleNode(node: Text) {
  const text = node.textContent || "";
  // Skip if no digits
  if (!/\d/.test(text)) return;
  // Store original
  if (!node.parentElement?.hasAttribute(ORIGINAL_ATTR)) {
    node.parentElement?.setAttribute(ORIGINAL_ATTR, text);
  }
  node.textContent = scrambleText(text);
}

function restoreNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return;
  const original = parent.getAttribute(ORIGINAL_ATTR);
  if (original !== null) {
    node.textContent = original;
    parent.removeAttribute(ORIGINAL_ATTR);
  }
}

function walkTextNodes(root: Node, fn: (node: Text) => void) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }
  nodes.forEach(fn);
}

// useSyncExternalStore-based demo mode state (no useState/useEffect for init)
function subscribeToDemoMode(callback: () => void) {
  // Listen for both cross-tab storage events and same-tab custom events
  const onStorage = (e: StorageEvent) => { if (e.key === DEMO_MODE_KEY) callback(); };
  const onCustom = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(DEMO_MODE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DEMO_MODE_EVENT, onCustom);
  };
}

function getDemoModeSnapshot(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

function getDemoModeServerSnapshot(): boolean {
  return false;
}

const emptySubscribe = () => () => {};

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const isDemoMode = useSyncExternalStore(subscribeToDemoMode, getDemoModeSnapshot, getDemoModeServerSnapshot);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const observerRef = useRef<MutationObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDemoMode = useCallback(() => {
    const next = !getDemoModeSnapshot();
    localStorage.setItem(DEMO_MODE_KEY, String(next));
    // Dispatch custom event so useSyncExternalStore re-reads in the same tab
    window.dispatchEvent(new Event(DEMO_MODE_EVENT));
  }, []);

  // Keyboard shortcut: Ctrl+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        toggleDemoMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleDemoMode]);

  // Scramble / restore DOM when demo mode toggles
  useEffect(() => {
    if (!mounted) return;
    const root = containerRef.current;
    if (!root) return;

    if (isDemoMode) {
      // Scramble all existing text nodes
      walkTextNodes(root, scrambleNode);

      // Watch for new/changed nodes and scramble them too
      observerRef.current = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                scrambleNode(node as Text);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                walkTextNodes(node, scrambleNode);
              }
            });
          } else if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
            const textNode = mutation.target as Text;
            // Avoid re-scrambling our own changes
            if (!textNode.parentElement?.hasAttribute(ORIGINAL_ATTR)) {
              scrambleNode(textNode);
            }
          }
        }
      });

      observerRef.current.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } else {
      // Disconnect observer
      observerRef.current?.disconnect();
      observerRef.current = null;

      // Restore all original text
      walkTextNodes(root, restoreNode);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [isDemoMode, mounted]);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      <div ref={containerRef}>
        {children}
      </div>
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
