window.__ModuleLoader__.load({
	id: "@genkaku/dsh-worker-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/assets/genkaku-mark-b.png
var genkaku_mark_b_default = "data:image/png;base64,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";

// src/client/assets/genkaku-mark-w.png
var genkaku_mark_w_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK4AAACuCAMAAACY0sbcAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAmRQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Pmgb1QAAAMx0Uk5TAAECBAk7EwMZFwi7/+NcXergkr/yY2mjvPPwIAZg/vX3X2309tMcBR7v+ihL+f2w0csSEIT4nweZI/tvTdwi7fzijNrMMYp9C04yFathCoJP7i7fH8aDYqaAM+te5Ri+5px5VN7oId135HY5Rn6pyjQMQHqnaq84ZuEdazZs23BzbnF0s3w/z7LnEbU1Uxa3UnvBN7nEG8DXVsjCV0fJsTxDuD66QUTQFNaVUem9jewkjkKQWqxZGpElfywnKimTnXWU8Q2g0s5K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";

// src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var PANEL_ID = "genkaku-worker";
var CANDIDATE_PORTS = [47821, 47822, 47823, 47824, 47825, 47826];
var originOf = (port) => `http://127.0.0.1:${port}`;
async function listening(port) {
  try {
    await fetch(`${originOf(port)}/genkaku/status`, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(1500)
    });
    return true;
  } catch {
    return false;
  }
}
var inject = ["slots"];
var ZH = typeof navigator !== "undefined" && /^zh/i.test(navigator.language);
var t = (en, zh) => ZH ? zh : en;
var DEFAULT_PRICE = "0.00";
var microToUsdc = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? (n / 1e6).toFixed(2) : DEFAULT_PRICE;
};
var usdcToMicro = (value) => Math.round(Number(value) * 1e6);
var gb = (bytes) => bytes === void 0 ? "" : `${(bytes / 1e9).toFixed(1)} GB`;
var shortAddr = (addr) => addr == null || addr === "" ? "\u2014" : `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
var ethFmt = (wei) => {
  const n = Number(wei);
  return Number.isFinite(n) ? `${(n / 1e18).toFixed(4)} ETH` : "\u2014";
};
var usdcFmt = (micro) => {
  const n = Number(micro);
  if (!Number.isFinite(n)) return "\u2014";
  const fixed = (n / 1e6).toFixed(6).replace(/0+$/, "");
  const trimmed = fixed.endsWith(".") ? `${fixed}00` : fixed.length - fixed.indexOf(".") === 2 ? `${fixed}0` : fixed;
  return `${trimmed} USDC`;
};
var row = { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" };
var dim = { color: "var(--dsw-alias-label-tertiary)" };
var caption = {
  ...dim,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 8
};
var box = {
  border: "0.5px solid var(--dsw-alias-border-l2)",
  borderRadius: "var(--dsw-radius-xl, 12px)",
  background: "var(--dsw-alias-bg-layer-2, transparent)",
  padding: "12px 16px",
  marginTop: 12
};
var dot = (on) => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 8,
  marginRight: 8,
  background: on ? "var(--dsw-alias-state-success-primary, #34a853)" : "var(--dsw-alias-label-tertiary)"
});
var PANEL_CSS = `
.gk-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 68px 104px auto;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.gk-row:first-of-type { border-top: none; }
.gk-price { width: 88px; }
.gk-price input { text-align: right; }
.gk-pull { width: 260px; max-width: 100%; }
.gk-muted { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
/* The panel can hold every model Ollama has (two dozen is normal). A bounded
   list keeps the download box, Save and the Worker section reachable.
   macOS auto-hides native scrollbars (and Chromium screenshots never paint
   them), so the bar is drawn by us: always visible, and click-to-jump. */
.gk-models-wrap { position: relative; padding-right: 12px; }
.gk-models {
  max-height: min(420px, 45vh);
  overflow-y: auto;
  scrollbar-width: none;
}
.gk-models::-webkit-scrollbar { display: none; }
.gk-rail {
  position: absolute;
  top: 2px;
  bottom: 2px;
  right: 2px;
  width: 8px;
  border-radius: 4px;
  background: rgba(127,137,153,.16);
  cursor: pointer;
}
.gk-thumb {
  position: absolute;
  left: 0;
  width: 8px;
  min-height: 16px;
  border-radius: 4px;
  background: rgba(127,137,153,.7);
}
.gk-rail:hover .gk-thumb { background: rgba(127,137,153,.9); }
`;
function Icon({ size = 16 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", width: size, height: size }, "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .genkaku-mark-b { display: inline !important; }
        .genkaku-mark-w { display: none !important; }
        body[data-ds-dark-theme] .genkaku-mark-b { display: none !important; }
        body[data-ds-dark-theme] .genkaku-mark-w { display: inline !important; }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: genkaku_mark_b_default,
        alt: "",
        width: size,
        height: size,
        className: "genkaku-mark-b",
        style: { width: size, height: size }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: genkaku_mark_w_default,
        alt: "",
        width: size,
        height: size,
        className: "genkaku-mark-w",
        style: { width: size, height: size }
      }
    )
  ] });
}
function seedDraft(status) {
  const draft = {};
  for (const entry of status.offers ?? []) {
    const model = entry.offer?.model;
    if (typeof model === "string" && model !== "") draft[model] = microToUsdc(entry.offer?.pricePerHour);
  }
  return draft;
}
function draftSignature(draft) {
  return Object.entries(draft).map(([model, price]) => `${model}=${price}`).sort().join("|");
}
function useScrollThumb() {
  const [node, setNode] = (0, import_react.useState)(null);
  const nodeRef = (0, import_react.useRef)(null);
  const [thumb, setThumb] = (0, import_react.useState)(null);
  const attach = (0, import_react.useCallback)((next) => {
    nodeRef.current = next;
    setNode(next);
  }, []);
  const update = (0, import_react.useCallback)(() => {
    const el = nodeRef.current;
    if (el == null) return;
    const ratio = el.scrollHeight > el.clientHeight + 1 ? el.clientHeight / el.scrollHeight : 1;
    setThumb(ratio >= 1 ? null : { top: el.scrollTop / el.scrollHeight * 100, height: Math.max(ratio * 100, 8) });
  }, []);
  (0, import_react.useEffect)(() => {
    if (node == null) return;
    update();
    node.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(node);
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
    mo?.observe(node, { childList: true, subtree: true });
    return () => {
      node.removeEventListener("scroll", update);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [node, update]);
  const jump = (0, import_react.useCallback)((event) => {
    const el = nodeRef.current;
    const rail = event.currentTarget;
    if (el == null || rail == null) return;
    const rect = rail.getBoundingClientRect();
    if (rect.height <= 0) return;
    el.scrollTop = Math.max(0, (event.clientY - rect.top) / rect.height) * el.scrollHeight;
  }, []);
  return { attach, thumb, update, jump };
}
function Section({ title, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: box, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: caption, children: title }),
    children
  ] });
}
function Page() {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [ollama, setOllama] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [draft, setDraft] = (0, import_react.useState)(null);
  const [notice, setNotice] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(null);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [pullModel, setPullModel] = (0, import_react.useState)("");
  const [pull, setPull] = (0, import_react.useState)(null);
  const [exported, setExported] = (0, import_react.useState)(null);
  const [showImport, setShowImport] = (0, import_react.useState)(false);
  const [importText, setImportText] = (0, import_react.useState)("");
  const seeded = (0, import_react.useRef)(false);
  const models = useScrollThumb();
  const [origin, setOrigin] = (0, import_react.useState)(originOf(CANDIDATE_PORTS[0]));
  const originRef = (0, import_react.useRef)(origin);
  originRef.current = origin;
  const probe = (0, import_react.useCallback)(async (base) => {
    try {
      const res = await fetch(`${base}/genkaku/status`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
      if (!res.ok) return null;
      const doc = await res.json();
      return doc.role === "user" ? null : doc;
    } catch {
      return null;
    }
  }, []);
  const loadStatus = (0, import_react.useCallback)(async () => {
    let base = originRef.current;
    let next = await probe(base);
    if (next == null) {
      for (const port of CANDIDATE_PORTS) {
        const candidate = originOf(port);
        if (candidate === base) continue;
        const doc = await probe(candidate);
        if (doc != null) {
          base = candidate;
          next = doc;
          break;
        }
      }
    }
    if (next == null) {
      for (const port of CANDIDATE_PORTS) {
        if (await listening(port)) {
          setError(t(
            `Something answers on 127.0.0.1:${port} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest`,
            `127.0.0.1:${port} \u6709\u670D\u52D9\u5728\u8DD1\uFF0C\u4F46\u62D2\u7D55\u4E86\u9019\u500B\u8996\u7A97\u7684\u4F86\u6E90\uFF08403\uFF09\u3002\u8ACB\u66F4\u65B0\u63D2\u4EF6\uFF1Adsh plugin add @genkaku/dsh-worker-plugin@latest`
          ));
          return;
        }
      }
      setError(t("Worker status unreachable on 47821\u201347826.", "47821\u201347826 \u4E0A\u90FD\u627E\u4E0D\u5230 worker \u72C0\u614B\u670D\u52D9\u3002"));
      return;
    }
    if (base !== originRef.current) setOrigin(base);
    setStatus(next);
    setError(null);
    if (!seeded.current) {
      seeded.current = true;
      setDraft(seedDraft(next));
    }
  }, [probe]);
  const loadOllama = (0, import_react.useCallback)(async () => {
    try {
      const res = await fetch(`${originRef.current}/genkaku/ollama`, { cache: "no-store" });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      setOllama(await res.json());
    } catch {
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void loadStatus();
    void loadOllama();
    const a = setInterval(() => {
      void loadStatus();
    }, 5e3);
    const b = setInterval(() => {
      void loadOllama();
    }, 15e3);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [loadStatus, loadOllama]);
  const post = (0, import_react.useCallback)(async (path, body) => {
    const res = await fetch(`${originRef.current}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const doc = await res.json().catch(() => null);
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`);
    return doc;
  }, []);
  const startOllama = async () => {
    setBusy("ollama");
    setNotice(null);
    try {
      const next = await post("/genkaku/ollama", {});
      setOllama(next);
      setNotice(next.running === true ? t("Ollama is running.", "Ollama \u5DF2\u555F\u52D5\u3002") : next.error ?? t("Ollama did not start.", "Ollama \u672A\u80FD\u555F\u52D5\u3002"));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const pullNow = async () => {
    const model = pullModel.trim();
    if (model === "") return;
    setBusy("pull");
    setNotice(null);
    setPull({ status: t("starting", "\u958B\u59CB\u4E0B\u8F09") });
    try {
      const res = await fetch(`${originRef.current}/genkaku/ollama/pull`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model })
      });
      if (!res.ok || res.body == null) {
        const doc = await res.json().catch(() => null);
        throw new Error(doc?.error?.message ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (; ; ) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim() === "") continue;
          const frame = JSON.parse(line);
          if (frame.error?.message !== void 0) throw new Error(frame.error.message);
          setPull({
            status: frame.status ?? "",
            ...frame.percent === void 0 ? {} : { percent: frame.percent }
          });
        }
      }
      setNotice(t(`Downloaded ${model}.`, `\u5DF2\u4E0B\u8F09 ${model}\u3002`));
      setPullModel("");
      await loadOllama();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setPull(null);
    }
  };
  const removeModel = async (model) => {
    if (!window.confirm(t(`Delete ${model} from this machine?`, `\u8981\u5F9E\u672C\u6A5F\u522A\u9664 ${model}\uFF1F`))) return;
    setBusy(`remove:${model}`);
    try {
      await post("/genkaku/ollama/delete", { model });
      await loadOllama();
      await loadStatus();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const toggleOffer = (model) => {
    setDraft((prev) => {
      const next = { ...prev ?? {} };
      if (model in next) delete next[model];
      else next[model] = DEFAULT_PRICE;
      return next;
    });
  };
  const save = async () => {
    if (draft == null) return;
    setSaving(true);
    setNotice(null);
    try {
      const known = /* @__PURE__ */ new Map();
      for (const entry of status?.offers ?? []) {
        if (typeof entry.offer?.model === "string") known.set(entry.offer.model, entry.offer);
      }
      const catalog = Object.entries(draft).map(([model, price]) => {
        const n = Number(price);
        if (!Number.isFinite(n) || n < 0) throw new Error(t(`Invalid price for ${model}`, `${model} \u7684\u50F9\u683C\u7121\u6548`));
        const facts = known.get(model);
        return {
          model,
          pricePerHour: usdcToMicro(price),
          ...facts?.capabilities === void 0 ? {} : { capabilities: facts.capabilities },
          ...facts?.parameterSize === void 0 ? {} : { parameterSize: facts.parameterSize },
          ...facts?.tier === void 0 ? {} : { tier: facts.tier }
        };
      });
      const snapshot = await post("/genkaku/catalog", { catalog });
      setStatus(snapshot);
      setDraft(seedDraft(snapshot));
      setNotice(t("Saved \u2014 your catalog is live.", "\u5DF2\u5132\u5B58\uFF0C\u76EE\u9304\u5DF2\u751F\u6548\u3002"));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  const setPublish = async (next) => {
    setBusy("publish");
    setNotice(null);
    try {
      await post("/genkaku/publish", { publish: next });
      setNotice(next ? t("Publishing enabled \u2014 restarting the worker.", "\u5DF2\u958B\u555F\u767C\u4F48\uFF0Cworker \u6B63\u5728\u91CD\u555F\u3002") : t("Publishing disabled \u2014 restarting the worker.", "\u5DF2\u95DC\u9589\u767C\u4F48\uFF0Cworker \u6B63\u5728\u91CD\u555F\u3002"));
      setTimeout(() => {
        void loadStatus();
      }, 3e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const exportKey = async () => {
    setBusy("wallet:export");
    setNotice(null);
    try {
      const doc = await post("/genkaku/wallet/export", { confirm: true });
      setExported(typeof doc.privateKey === "string" ? doc.privateKey : null);
      setNotice(t(
        "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.",
        "\u7D55\u5C0D\u4E0D\u8981\u5206\u4EAB\u9019\u628A\u79C1\u9470\u3002\u62FF\u5230\u5B83\u7684\u4EBA\u5C31\u7B49\u65BC\u64C1\u6709\u9019\u500B\u9322\u5305\u3001\u93C8\u4E0A\u76EE\u9304\u88E1\u7684 worker \u8EAB\u5206\uFF0C\u4EE5\u53CA\u5B83\u7684\u6536\u5165\u3002"
      ));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const importKey = async () => {
    if (!window.confirm(t(
      "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?",
      "\u532F\u5165\u79C1\u9470\u6703\u53D6\u4EE3\u6B64 worker \u7684\u8EAB\u5206\u9322\u5305\u3002\u76EE\u524D\u4F4D\u5740\u88E1\u7684\u8CC7\u91D1\u4E0D\u6703\u8F49\u79FB\u3002\u82E5\u820A\u9322\u5305\u5DF2\u5728\u93C8\u4E0A\u76EE\u9304\u520A\u767B\uFF0C\u6B64\u5916\u639B\u6703\u5148\u5617\u8A66\u64A4\u92B7\u8A72\u689D\u76EE\u3002\u8981\u7E7C\u7E8C\u55CE\uFF1F"
    ))) return;
    setBusy("wallet:import");
    setNotice(null);
    try {
      await post("/genkaku/wallet/import", { privateKey: importText.trim() });
      setImportText("");
      setShowImport(false);
      setExported(null);
      setNotice(t("Wallet imported. The worker is restarting with the new identity.", "\u5DF2\u532F\u5165\u9322\u5305\uFF0Cworker \u6B63\u5728\u4EE5\u65B0\u8EAB\u5206\u91CD\u555F\u3002"));
      setTimeout(() => {
        void loadStatus();
      }, 4e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const rotateKey = async () => {
    if (!window.confirm(t(
      "Generate a fresh worker wallet? The old address keeps its ETH and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.",
      "\u8981\u7522\u751F\u65B0\u7684 worker \u9322\u5305\u55CE\uFF1F\u820A\u4F4D\u5740\u7684 ETH \u8207 USDC \u6703\u7559\u5728\u539F\u8655\u3002\u82E5\u820A\u4F4D\u5740\u5DF2\u767C\u4F48\u689D\u76EE\uFF0C\u6B64\u5916\u639B\u6703\u5148\u5617\u8A66\u64A4\u92B7\uFF0C\u518D\u4EE5\u65B0\u8EAB\u5206\u91CD\u555F\u3002"
    ))) return;
    setBusy("wallet:rotate");
    setNotice(null);
    try {
      await post("/genkaku/wallet/new", {});
      setExported(null);
      setNotice(t("New worker wallet generated. Restarting as the new identity.", "\u5DF2\u7522\u751F\u65B0\u7684 worker \u9322\u5305\uFF0C\u6B63\u5728\u4EE5\u65B0\u8EAB\u5206\u91CD\u555F\u3002"));
      setTimeout(() => {
        void loadStatus();
      }, 4e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const claimEarnings = async () => {
    setBusy("wallet:claim");
    setNotice(null);
    try {
      const doc = await post("/genkaku/wallet/claim", {});
      setNotice(doc.tx == null ? t("Claim sent.", "\u5DF2\u9001\u51FA\u63D0\u9818\u4EA4\u6613\u3002") : t(`Claimed. Transaction ${doc.tx.slice(0, 10)}\u2026`, `\u5DF2\u63D0\u9818\u3002\u4EA4\u6613 ${doc.tx.slice(0, 10)}\u2026`));
      setTimeout(() => {
        void loadStatus();
      }, 2500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  if (error != null && status == null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: 16 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: 0 }, children: "GenKaKu worker" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...dim, marginTop: 8 }, children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...dim, fontSize: 12 }, children: "The plugin starts its status server on the first free port in 47821\u201347826. If another dsh profile already owns that port, this one cannot bind it." })
    ] });
  }
  if (status == null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, ...dim }, children: "Loading worker status\u2026" });
  const installed = ollama?.models ?? [];
  const offered = draft ?? {};
  const tierOf = /* @__PURE__ */ new Map();
  for (const entry of status.offers ?? []) {
    const model = entry.offer?.model;
    const tier = entry.offer?.tier;
    if (typeof model === "string" && typeof tier === "string") tierOf.set(model, tier);
  }
  const names = Array.from(/* @__PURE__ */ new Set([...Object.keys(offered), ...installed.map((m) => m.name)]));
  const sizeOf = new Map(installed.map((m) => [m.name, m.sizeBytes]));
  names.sort((a, b) => {
    const ao = a in offered ? 0 : 1;
    const bo = b in offered ? 0 : 1;
    return ao === bo ? a.localeCompare(b) : ao - bo;
  });
  const dirty = draft !== null && draftSignature(offered) !== draftSignature(seedDraft(status));
  const noGas = (() => {
    if (status.balances?.eth == null) return false;
    try {
      return BigInt(status.balances.eth) === 0n;
    } catch {
      return false;
    }
  })();
  const hasAccrued = (() => {
    if (status.balances?.accrued == null || noGas) return false;
    try {
      return BigInt(status.balances.accrued) > 0n;
    } catch {
      return false;
    }
  })();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
    // The host's centre column is `overflow: hidden` + a flex column, so a
    // panel taller than the window is simply cut off — the download box and
    // Save below a 24-model list were unreachable. Fill the column and scroll
    // here instead of relying on the page to scroll.
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    flex: "1 1 auto",
    minHeight: 0,
    height: "100%",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: 16,
    paddingBottom: 32,
    maxWidth: 760
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: PANEL_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: 0 }, children: "GenKaKu worker" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, marginTop: 4 }, children: status.role ?? "unknown role" }),
    notice != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...box, borderColor: "var(--dsw-alias-border-l3)" }, children: notice }),
    error != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...dim, fontSize: 12, marginTop: 8 }, children: [
      t("Worker restarting\u2026", "worker \u6B63\u5728\u91CD\u555F\u2026"),
      " (",
      error,
      ")"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, { title: "Ollama", children: ollama == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: dim, children: t("Checking the local Ollama service\u2026", "\u6B63\u5728\u6AA2\u67E5\u672C\u6A5F Ollama \u670D\u52D9\u2026") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dot(ollama.running === true) }),
          ollama.running === true ? t("Running", "\u57F7\u884C\u4E2D") : ollama.installed === true ? t("Installed, not running", "\u5DF2\u5B89\u88DD\uFF0C\u672A\u57F7\u884C") : t("Not installed", "\u672A\u5B89\u88DD"),
          ollama.version !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: dim, children: [
            " \xB7 v",
            ollama.version
          ] }),
          ollama.running === true && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: dim, children: [
            " \xB7 ",
            installed.length,
            " ",
            t("models", "\u500B\u6A21\u578B")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: ollama.host ?? "127.0.0.1:11434" }) })
      ] }),
      ollama.running !== true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...row, justifyContent: "flex-start", marginTop: 4 }, children: ollama.installed === true ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", size: "sm", disabled: busy === "ollama", onClick: () => {
        void startOllama();
      }, children: busy === "ollama" ? t("Starting\u2026", "\u555F\u52D5\u4E2D\u2026") : t("Start Ollama", "\u555F\u52D5 Ollama") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: ollama.downloadUrl ?? "https://ollama.com/download", target: "_blank", rel: "noreferrer", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", size: "sm", children: t("Download Ollama", "\u4E0B\u8F09 Ollama") }) }) }),
      ollama.running !== true && ollama.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginTop: 6 }, children: ollama.error })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { title: t("Directory", "\u93C8\u4E0A\u76EE\u9304"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, alignItems: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("Publish this worker on-chain", "\u5C07\u6B64 worker \u767C\u4F48\u5230\u93C8\u4E0A\u76EE\u9304") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Switch,
          {
            checked: status.publishAddress === true,
            disabled: busy === "publish" || status.publishForced === true || status.reachable !== true && status.publishAddress !== true,
            label: t("Publish this worker on-chain", "\u5C07\u6B64 worker \u767C\u4F48\u5230\u93C8\u4E0A\u76EE\u9304"),
            onChange: (next) => {
              void setPublish(next);
            }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginTop: 2 }, children: status.reachable !== true ? t(
        "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.",
        "\u9019\u53F0\u6A5F\u5668\u6C92\u6709\u516C\u7DB2\u4F4D\u5740\uFF0C\u56E0\u6B64\u958B\u95DC\u76EE\u524D\u7121\u6CD5\u958B\u555F\uFF1A\u767C\u4F48\u53EA\u6703\u7522\u751F\u4E00\u689D\u6C92\u4EBA\u9023\u5F97\u4E0A\u7684\u7D00\u9304\u3002\u540C\u7DB2\u6BB5\u7684 peer \u4ECD\u53EF\u9023\u7DDA\u3002"
      ) : status.publishForced === true ? t(
        "Forced on by this profile (publishAddress), so it cannot be turned off here.",
        "\u6B64 profile \u5DF2\u5F37\u5236\u958B\u555F\uFF08publishAddress\uFF09\uFF0C\u7121\u6CD5\u5728\u6B64\u95DC\u9589\u3002"
      ) : status.published === true ? status.transport === "relay" ? t(
        "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.",
        "\u5DF2\u900F\u904E seed VM \u4E2D\u7E7C\u5217\u51FA\u3002\u93C8\u4E0A\u53EA\u6703\u5BEB\u5165\u4E2D\u7E7C\u4F4D\u5740\uFF0C\u4F60\u7684\u516C\u7DB2 IP \u4E0D\u6703\u88AB\u516C\u958B\u3002"
      ) : t(
        "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.",
        "\u5DF2\u5217\u51FA\u3002\u4F60\u7684\u516C\u7DB2 IP \u6703\u5BEB\u9032\u93C8\u4E0A\uFF0C\u5373\u4F7F\u65E5\u5F8C\u95DC\u9589\uFF0C\u4ECD\u7136\u6C38\u4E45\u53EF\u8B80\u3002"
      ) : status.publishAddress === true ? t(
        "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.",
        "\u767C\u4F48\u4E2D\u2014\u2014\u93C8\u4E0A\u5BEB\u5165\u5C1A\u672A\u5B8C\u6210\u3002worker \u57F7\u884C\u671F\u9593\u6703\u81EA\u52D5\u91CD\u8A66\u3002"
      ) : t(
        "Not listed. A public address is available, so turning this on makes you discoverable.",
        "\u672A\u5217\u51FA\u3002\u9019\u53F0\u6A5F\u5668\u6709\u516C\u7DB2\u4F4D\u5740\uFF0C\u958B\u555F\u5F8C\u5176\u4ED6\u4F7F\u7528\u8005\u624D\u627E\u5F97\u5230\u4F60\u3002"
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { title: t("Models offered", "\u4E0A\u67B6\u6A21\u578B"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 8 }, children: t(
        "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.",
        "\u672A\u52FE\u9078\u7684\u6A21\u578B\u4ECD\u7559\u5728\u672C\u6A5F\uFF0C\u4F46\u4E0D\u6703\u4E0A\u67B6\u3002\u50F9\u683C\u70BA\u6BCF\u5C0F\u6642 USDC\uFF1B0 \u8868\u793A\u514D\u8CBB\u3002"
      ) }),
      names.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: dim, children: t("No local models yet. Download one below.", "\u672C\u6A5F\u9084\u6C92\u6709\u6A21\u578B\uFF0C\u53EF\u5728\u4E0B\u65B9\u4E0B\u8F09\u3002") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "gk-models-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "gk-models", ref: models.attach, onScroll: models.update, children: names.map((name) => {
          const on = name in offered;
          const tier = tierOf.get(name);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "gk-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "checkbox",
                checked: on,
                "aria-label": name,
                onChange: () => {
                  toggleOffer(name);
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
              name,
              tier !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...dim, fontSize: 11, marginLeft: 8 }, children: tier === "chat" ? t("not for agents", "\u4E0D\u9069\u7528\u65BC agent") : tier })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "gk-muted", style: { textAlign: "right" }, children: gb(sizeOf.get(name)) }),
            on ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_dsh_client_ui_primitives.Input,
                {
                  className: "gk-price",
                  value: offered[name] ?? "",
                  inputMode: "decimal",
                  "aria-label": t(`Price per hour for ${name}`, `${name} \u6BCF\u5C0F\u6642\u50F9\u683C`),
                  onChange: (e) => setDraft({ ...draft ?? {}, [name]: e.target.value })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "gk-muted", children: "/h" })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_dsh_client_ui_primitives.Button,
              {
                variant: "ghost",
                size: "sm",
                disabled: busy === `remove:${name}`,
                onClick: () => {
                  void removeModel(name);
                },
                children: t("delete", "\u522A\u9664")
              }
            )
          ] }, name);
        }) }),
        models.thumb != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            className: "gk-rail",
            "aria-hidden": "true",
            onPointerDown: (e) => models.jump(e),
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "gk-thumb", style: { top: `${models.thumb.top}%`, height: `${models.thumb.height}%` } })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, justifyContent: "flex-start", gap: 8, marginTop: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Input,
          {
            className: "gk-pull",
            value: pullModel,
            placeholder: t("model to download, e.g. llama3.2:3b", "\u8981\u4E0B\u8F09\u7684\u6A21\u578B\uFF0C\u4F8B\u5982 llama3.2:3b"),
            "aria-label": t("Model to download", "\u8981\u4E0B\u8F09\u7684\u6A21\u578B"),
            onChange: (e) => setPullModel(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "outline",
            size: "sm",
            disabled: busy === "pull" || pullModel.trim() === "",
            onClick: () => {
              void pullNow();
            },
            children: busy === "pull" ? t("Downloading\u2026", "\u4E0B\u8F09\u4E2D\u2026") : t("Download", "\u4E0B\u8F09")
          }
        ),
        pull != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "gk-muted", children: [
          pull.status,
          pull.percent === void 0 ? "" : ` ${Math.round(pull.percent)}%`
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, marginTop: 12, alignItems: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "gk-muted", children: [
          Object.keys(offered).length,
          " ",
          t("offered", "\u500B\u4E0A\u67B6"),
          dirty ? ` \xB7 ${t("unsaved changes", "\u6709\u672A\u5132\u5B58\u7684\u8B8A\u66F4")}` : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", size: "sm", disabled: saving || !dirty, onClick: () => {
          void save();
        }, children: saving ? t("Saving\u2026", "\u5132\u5B58\u4E2D\u2026") : t("Save catalog", "\u5132\u5B58\u76EE\u9304") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { title: t("Wallet", "\u9322\u5305"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Worker wallet", "Worker \u9322\u5305") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { title: status.wallet, children: shortAddr(status.wallet) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => {
                if (status.wallet != null && navigator.clipboard != null) {
                  void navigator.clipboard.writeText(status.wallet);
                  setNotice(t("Wallet address copied.", "\u5DF2\u8907\u88FD\u9322\u5305\u4F4D\u5740\u3002"));
                }
              },
              children: t("copy", "\u8907\u88FD")
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Gas (ETH)", "Gas\uFF08ETH\uFF09") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ethFmt(status.balances?.eth) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Wallet balance (USDC)", "\u9322\u5305\u9918\u984D\uFF08USDC\uFF09") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: usdcFmt(status.balances?.usdc) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Unclaimed in escrow (USDC)", "\u5408\u7D04\u5167\u5F85\u63D0\u9818\u6536\u5165\uFF08USDC\uFF09") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: usdcFmt(status.balances?.accrued) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "outline",
              size: "sm",
              disabled: busy !== null || !hasAccrued,
              title: t(
                "Moves the USDC that settlements accrued to this worker out of JobEscrow and into the wallet. The claim is a transaction, so the wallet needs a little ETH for gas.",
                "\u628A\u7D50\u7B97\u5DF2\u8A18\u5728\u9019\u500B worker \u540D\u4E0B\u3001\u4ECD\u7559\u5728 JobEscrow \u5408\u7D04\u88E1\u7684 USDC \u9818\u5230\u9322\u5305\u3002\u63D0\u9818\u662F\u4E00\u7B46\u4EA4\u6613\uFF0C\u6240\u4EE5\u9322\u5305\u9700\u8981\u4E00\u9EDE ETH \u4ED8 gas\u3002"
              ),
              onClick: () => {
                void claimEarnings();
              },
              children: busy === "wallet:claim" ? t("Claiming\u2026", "\u63D0\u9818\u4E2D\u2026") : t("Claim", "\u63D0\u9818")
            }
          )
        ] })
      ] }),
      noGas && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...dim, fontSize: 12, marginTop: 8 }, children: [
        t(
          "This wallet has no Base Sepolia ETH yet. The worker needs it for gas to publish its listing and settle sessions; USDC is what it earns, not what it spends.",
          "\u9019\u500B\u9322\u5305\u9084\u6C92\u6709 Base Sepolia ETH\u3002worker \u9700\u8981\u5B83\u4ED8 gas \u624D\u80FD\u520A\u767B\u76EE\u9304\u8207\u7D50\u7B97 session\uFF1BUSDC \u662F\u6536\u5165\uFF0C\u4E0D\u662F\u652F\u51FA\u3002"
        ),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: "https://www.alchemy.com/faucets/base-sepolia", target: "_blank", rel: "noreferrer", children: t("Open faucet", "\u958B\u555F faucet") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => {
          void exportKey();
        }, children: busy === "wallet:export" ? t("Revealing\u2026", "\u8B80\u53D6\u4E2D\u2026") : t("Export key", "\u532F\u51FA\u79C1\u9470") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => setShowImport((v) => !v), children: t("Import key", "\u532F\u5165\u79C1\u9470") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => {
          void rotateKey();
        }, children: busy === "wallet:rotate" ? t("Generating\u2026", "\u7522\u751F\u4E2D\u2026") : t("New wallet", "\u7522\u751F\u65B0\u9322\u5305") })
      ] }),
      exported != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 4 }, children: t("Private key \u2014 keep it offline. Testnet only.", "\u79C1\u9470\u2014\u2014\u8ACB\u96E2\u7DDA\u4FDD\u5B58\u3002\u50C5\u9650\u6E2C\u8A66\u7DB2\u3002") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { readOnly: true, value: exported, onFocus: (e) => e.currentTarget.select(), "aria-label": t("Private key", "\u79C1\u9470") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => {
                if (navigator.clipboard != null) {
                  void navigator.clipboard.writeText(exported);
                  setNotice(t("Private key copied.", "\u5DF2\u8907\u88FD\u79C1\u9470\u3002"));
                }
              },
              children: t("copy", "\u8907\u88FD")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", onClick: () => setExported(null), children: t("hide", "\u96B1\u85CF") })
        ] })
      ] }),
      showImport && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 4 }, children: t("Paste a 0x\u2026 32-byte private key", "\u8CBC\u4E0A 0x\u2026 32 byte \u79C1\u9470") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Input,
            {
              value: importText,
              placeholder: "0x\u2026",
              onChange: (e) => setImportText(e.target.value),
              "aria-label": t("Private key to import", "\u8981\u532F\u5165\u7684\u79C1\u9470")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "primary",
              size: "sm",
              disabled: busy !== null || !/^(0x)?[0-9a-fA-F]{64}$/.test(importText.trim()),
              onClick: () => {
                void importKey();
              },
              children: busy === "wallet:import" ? t("Importing\u2026", "\u532F\u5165\u4E2D\u2026") : t("Import", "\u532F\u5165")
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 11, marginTop: 10 }, children: t(
        "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.",
        "\u9019\u628A\u79C1\u9470\u5C31\u662F worker \u8EAB\u5206\uFF1A\u7528\u4F86\u7C3D\u6536\u64DA\u3001\u7D81\u5B9A\u93C8\u4E0A\u76EE\u9304\u689D\u76EE\u3002\u628A\u9019\u53F0\u6A5F\u5668\u642C\u5230\u65B0\u786C\u789F\u524D\u8ACB\u5148\u5099\u4EFD\u3002"
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, { title: "Worker", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Peer", "Peer") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: status.peerId ?? "\u2014" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Connection", "\u9023\u7DDA\u65B9\u5F0F") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dot(status.transport === "direct") }),
          status.transport === "direct" ? t("libp2p direct", "libp2p \u76F4\u9023") : status.transport === "relay" ? t("seed VM relay", "seed VM \u4E2D\u7E7C") : t("LAN only", "\u50C5\u9650\u540C\u7DB2\u6BB5")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginTop: 2 }, children: status.transport === "direct" ? t(
        "Clients reach this worker directly over libp2p.",
        "\u4F7F\u7528\u8005\u900F\u904E libp2p \u76F4\u63A5\u9023\u5230\u9019\u53F0 worker\u3002"
      ) : status.transport === "relay" ? t(
        "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.",
        "\u9019\u53F0\u6A5F\u5668\u7121\u6CD5\u88AB\u516C\u7DB2\u76F4\u9023\uFF0C\u56E0\u6B64\u6D41\u91CF\u6703\u7D93\u7531 GenKaKu seed VM \u8F49\u9001\u3002\u4F7F\u7528\u8005\u6703\u5148\u5617\u8A66\u76F4\u9023\uFF0C\u5931\u6557\u5F8C\u624D\u8D70\u4E2D\u7E7C\u3002"
      ) : t(
        "Only peers on the same network can connect. A relay appears once the seed VM is reachable.",
        "\u76EE\u524D\u53EA\u6709\u540C\u7DB2\u6BB5\u7684 peer \u80FD\u9023\u7DDA\u3002\u9023\u4E0A seed VM \u5F8C\u6703\u81EA\u52D5\u53D6\u5F97\u4E2D\u7E7C\u4F4D\u5740\u3002"
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Active sessions", "\u9032\u884C\u4E2D session") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status.activeSessions ?? 0 })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Addresses", "\u4F4D\u5740\u6578") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: (status.peerAddrs ?? []).length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...row, justifyContent: "flex-start" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `${origin}/genkaku`, target: "_blank", rel: "noreferrer", style: { fontSize: 12 }, children: t("Open the full dashboard", "\u958B\u555F\u5B8C\u6574\u63A7\u5236\u53F0") }) })
    ] })
  ] });
}
function apply(ctx) {
  ctx.effect(() => ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID
  }, Page)), "genkaku-worker: panel page");
  ctx.effect(() => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 40,
    label: () => "GenKaKu Worker"
  }, Icon)), "genkaku-worker: panel entry");
}

		return module.exports;
	}
});
