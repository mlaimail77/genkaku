window.__ModuleLoader__.load({
	id: "@genkaku/dsh-user-plugin",
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
var PANEL_ID = "genkaku-user";
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
var ZH = typeof navigator !== "undefined" && /^zh/i.test(navigator.language);
var t = (en, zh) => ZH ? zh : en;
var inject = ["slots"];
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
var row = { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" };
var dim = { opacity: 0.6 };
var box = { border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, marginTop: 12 };
var caption = { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, marginBottom: 6 };
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
function Page() {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [notice, setNotice] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(null);
  const [newWorker, setNewWorker] = (0, import_react.useState)("");
  const [exported, setExported] = (0, import_react.useState)(null);
  const [importText, setImportText] = (0, import_react.useState)("");
  const [showImport, setShowImport] = (0, import_react.useState)(false);
  const originRef = (0, import_react.useRef)(null);
  const models = useScrollThumb();
  const load = (0, import_react.useCallback)(async () => {
    for (const port of CANDIDATE_PORTS) {
      try {
        const res = await fetch(`${originOf(port)}/genkaku/status`, {
          cache: "no-store",
          signal: AbortSignal.timeout(2500)
        });
        if (!res.ok) continue;
        const doc = await res.json();
        if (doc.role !== "user") continue;
        originRef.current = originOf(port);
        setStatus(doc);
        setError(null);
        return;
      } catch {
      }
    }
    for (const port of CANDIDATE_PORTS) {
      if (await listening(port)) {
        setError(t(
          `Something answers on 127.0.0.1:${port} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest`,
          `127.0.0.1:${port} \u6709\u670D\u52D9\u5728\u8DD1\uFF0C\u4F46\u62D2\u7D55\u4E86\u9019\u500B\u8996\u7A97\u7684\u4F86\u6E90\uFF08403\uFF09\u3002\u8ACB\u66F4\u65B0\u63D2\u4EF6\uFF1Adsh plugin add @genkaku/dsh-user-plugin@latest`
        ));
        return;
      }
    }
    setError(t("No GenKaKu user bridge on 47821\u201347826.", "47821\u201347826 \u4E0A\u627E\u4E0D\u5230 GenKaKu user bridge\u3002"));
  }, []);
  (0, import_react.useEffect)(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5e3);
    return () => clearInterval(timer);
  }, [load]);
  const post = (0, import_react.useCallback)(async (path, body) => {
    const origin = originRef.current;
    if (origin == null) throw new Error(t("Bridge not reached yet.", "\u5C1A\u672A\u9023\u4E0A bridge\u3002"));
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const doc = await res.json().catch(() => null);
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`);
    return doc ?? {};
  }, []);
  const saveWorkers = (0, import_react.useCallback)(async (next) => {
    setBusy("workers");
    setNotice(null);
    try {
      await post("/genkaku/settings", { workers: next });
      setNotice(t("Saved. The bridge is restarting with the new worker list.", "\u5DF2\u5132\u5B58\uFF0Cbridge \u6B63\u4EE5\u65B0\u7684 worker \u6E05\u55AE\u91CD\u65B0\u555F\u52D5\u3002"));
      setTimeout(() => {
        void load();
      }, 2500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const setSettle = (0, import_react.useCallback)(async (next) => {
    setBusy("settle");
    setNotice(null);
    try {
      await post("/genkaku/settings", { settle: next });
      setNotice(next ? t("Escrow payments enabled \u2014 restarting the bridge.", "\u5DF2\u958B\u555F\u6258\u7BA1\u4ED8\u6B3E\uFF0Cbridge \u6B63\u5728\u91CD\u65B0\u555F\u52D5\u3002") : t("Escrow payments disabled \u2014 free/dev sessions only. Restarting the bridge.", "\u5DF2\u95DC\u9589\u6258\u7BA1\u4ED8\u6B3E\uFF0C\u50C5\u9650\u514D\u8CBB/\u958B\u767C\u7528 session\u3002bridge \u6B63\u5728\u91CD\u65B0\u555F\u52D5\u3002"));
      setTimeout(() => {
        void load();
      }, 2500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const exportKey = (0, import_react.useCallback)(async () => {
    setBusy("export");
    setNotice(null);
    try {
      const doc = await post("/genkaku/wallet/export", { confirm: true });
      setExported(typeof doc.privateKey === "string" ? doc.privateKey : null);
      setNotice(t(
        "Never share this key. Anyone who has it owns the wallet and its funds.",
        "\u7D55\u5C0D\u4E0D\u8981\u5206\u4EAB\u9019\u628A\u79C1\u9470\u3002\u62FF\u5230\u5B83\u7684\u4EBA\u5C31\u7B49\u65BC\u64C1\u6709\u9019\u500B\u9322\u5305\u8207\u88E1\u9762\u7684\u8CC7\u91D1\u3002"
      ));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [post]);
  const importKey = (0, import_react.useCallback)(async () => {
    if (!window.confirm(t(
      "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?",
      "\u532F\u5165\u79C1\u9470\u6703\u53D6\u4EE3\u6B64 profile \u7684\u4F7F\u7528\u8005\u9322\u5305\u3002\u76EE\u524D\u4F4D\u5740\u88E1\u7684\u8CC7\u91D1\u4E0D\u6703\u8F49\u79FB\uFF0C\u4E14\u4E0D\u518D\u4F7F\u7528\u3002\u8981\u7E7C\u7E8C\u55CE\uFF1F"
    ))) return;
    setBusy("import");
    setNotice(null);
    try {
      await post("/genkaku/wallet/import", { privateKey: importText.trim() });
      setImportText("");
      setShowImport(false);
      setNotice(t("Wallet imported. The bridge is restarting.", "\u5DF2\u532F\u5165\u9322\u5305\uFF0Cbridge \u6B63\u5728\u91CD\u65B0\u555F\u52D5\u3002"));
      setTimeout(() => {
        void load();
      }, 3e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [importText, load, post]);
  const rotateKey = (0, import_react.useCallback)(async () => {
    if (!window.confirm(t(
      "Generate a fresh wallet? The old address keeps its ETH and USDC; this profile stops using it.",
      "\u8981\u7522\u751F\u65B0\u7684\u9322\u5305\u55CE\uFF1F\u820A\u4F4D\u5740\u7684 ETH \u8207 USDC \u6703\u7559\u5728\u539F\u8655\uFF0C\u6B64 profile \u4E0D\u518D\u4F7F\u7528\u5B83\u3002"
    ))) return;
    setBusy("rotate");
    setNotice(null);
    try {
      await post("/genkaku/wallet/new", {});
      setExported(null);
      setNotice(t("New wallet generated. The bridge is restarting.", "\u5DF2\u7522\u751F\u65B0\u9322\u5305\uFF0Cbridge \u6B63\u5728\u91CD\u65B0\u555F\u52D5\u3002"));
      setTimeout(() => {
        void load();
      }, 3e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const mintTestUsdc = (0, import_react.useCallback)(async () => {
    setBusy("mint");
    setNotice(null);
    try {
      const doc = await post("/genkaku/wallet/mint", { amountUsdc: "100" });
      setNotice(t(`Minted 100 test USDC (tx ${String(doc.tx).slice(0, 12)}\u2026).`, `\u5DF2\u9818\u53D6 100 \u6E2C\u8A66 USDC\uFF08tx ${String(doc.tx).slice(0, 12)}\u2026\uFF09\u3002`));
      setTimeout(() => {
        void load();
      }, 4e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const refreshNetwork = (0, import_react.useCallback)(async () => {
    setBusy("refresh");
    setNotice(null);
    try {
      await post("/genkaku/settings", { refresh: true });
      setNotice(t(
        "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.",
        "\u6B63\u5728\u91CD\u65B0\u6383\u63CF\u93C8\u4E0A\u76EE\u9304\u8207 seed\u3002\u6383\u63CF\u5B8C\u6210\u5F8C bridge \u6703\u91CD\u65B0\u555F\u52D5\u3002"
      ));
      setTimeout(() => {
        void load();
      }, 4e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  if (error != null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: 16 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: 0 }, children: "GenKaKu network" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...dim, marginTop: 8 }, children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...dim, fontSize: 12 }, children: "The plugin opens its bridge on the first free port in 47821\u201347826." })
    ] });
  }
  if (status == null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, ...dim }, children: "Loading worker status\u2026" });
  const offers = status.offers ?? [];
  const price = (micro) => {
    const n = Number(micro);
    if (!Number.isFinite(n)) return "\u2014";
    return n === 0 ? "free" : `${(n / 1e6).toFixed(2)} USDC`;
  };
  const eth = (wei) => {
    const n = Number(wei);
    return Number.isFinite(n) ? `${(n / 1e18).toFixed(4)} ETH` : "\u2014";
  };
  const usdc = (micro) => {
    const n = Number(micro);
    return Number.isFinite(n) ? `${(n / 1e6).toFixed(2)} USDC` : "\u2014";
  };
  const noGas = (() => {
    try {
      return BigInt(status.balances?.eth ?? "0") === 0n;
    } catch {
      return true;
    }
  })();
  const short = (addr) => addr == null || addr.length < 12 ? addr ?? "\u2014" : `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
  const wallets = new Set(offers.map((o) => o.offer?.workerWallet).filter((w) => typeof w === "string" && w !== ""));
  const workerCount = wallets.size > 0 ? wallets.size : (status.workers ?? []).length;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
    // Same reason as the worker panel: the host column clips, so the panel
    // has to own the scroll or its last cards cannot be reached.
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .gk-net-wrap { position: relative; padding-right: 12px; }
        .gk-net-models { max-height: min(320px, 38vh); overflow-y: auto; scrollbar-width: none; }
        .gk-net-models::-webkit-scrollbar { display: none; }
        .gk-net-rail { position: absolute; top: 2px; bottom: 2px; right: 2px; width: 8px; border-radius: 4px; background: rgba(127,137,153,.16); cursor: pointer; }
        .gk-net-thumb { position: absolute; left: 0; width: 8px; min-height: 16px; border-radius: 4px; background: rgba(127,137,153,.7); }
        .gk-net-rail:hover .gk-net-thumb { background: rgba(127,137,153,.9); }
        .gk-net-row { display: grid; grid-template-columns: minmax(0, 1fr) 92px 116px; gap: 10px; align-items: center; padding: 7px 0; border-top: 0.5px solid rgba(127,137,153,.18); }
        .gk-net-row:first-child { border-top: none; }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: 0 }, children: "GenKaKu network" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...dim, marginTop: 4 }, children: [
      "user \xB7 ",
      status.env ?? "base-sepolia"
    ] }),
    notice != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...box, fontSize: 13 }, children: notice }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: t("Wallet", "\u9322\u5305") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { title: status.wallet, children: short(status.wallet) }),
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: "Balance" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          eth(status.balances?.eth),
          " \xB7 ",
          usdc(status.balances?.usdc)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: "Payments" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status.settle === true ? "escrow enabled" : "free / dev" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: "Workers discovered" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: workerCount })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: "Models offered" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: offers.length })
      ] }),
      noGas && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...dim, fontSize: 12, marginTop: 8 }, children: [
        t(
          "This wallet has no Base Sepolia ETH yet. Get test ETH for gas from a faucet, then mint test USDC here.",
          "\u9019\u500B\u9322\u5305\u9084\u6C92\u6709 Base Sepolia ETH\u3002\u5148\u5230 faucet \u9818\u6E2C\u8A66 ETH \u4ED8 gas\uFF0C\u518D\u56DE\u4F86\u9818\u6E2C\u8A66 USDC\u3002"
        ),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: "https://www.alchemy.com/faucets/base-sepolia", target: "_blank", rel: "noreferrer", children: t("Open faucet", "\u958B\u555F faucet") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }, children: [
        status.env === "base-sepolia" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "outline",
            size: "sm",
            disabled: busy !== null || noGas,
            onClick: () => {
              void mintTestUsdc();
            },
            children: busy === "mint" ? t("Minting\u2026", "\u9818\u53D6\u4E2D\u2026") : t("Mint 100 test USDC", "\u9818\u53D6 100 \u6E2C\u8A66 USDC")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => {
          void exportKey();
        }, children: busy === "export" ? t("Revealing\u2026", "\u8B80\u53D6\u4E2D\u2026") : t("Export key", "\u532F\u51FA\u79C1\u9470") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => setShowImport((v) => !v), children: t("Import key", "\u532F\u5165\u79C1\u9470") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => {
          void rotateKey();
        }, children: t("New wallet", "\u7522\u751F\u65B0\u9322\u5305") })
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
              children: busy === "import" ? t("Importing\u2026", "\u532F\u5165\u4E2D\u2026") : t("Import", "\u532F\u5165")
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: caption, children: t("Settings", "\u8A2D\u5B9A") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("Escrow payments", "\u6258\u7BA1\u4ED8\u6B3E") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Switch,
          {
            checked: status.settle === true,
            disabled: busy === "settle",
            label: t("Escrow payments", "\u6258\u7BA1\u4ED8\u6B3E"),
            onChange: (next) => {
              void setSettle(next);
            }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12 }, children: status.settle === true ? t(
        "Each session opens a USDC escrow on Base Sepolia and settles per started minute. Needs ETH for gas and USDC in the wallet above.",
        "\u6BCF\u500B session \u6703\u5728 Base Sepolia \u958B\u6258\u7BA1\u4E26\u4EE5\u5DF2\u958B\u59CB\u5206\u9418\u7D50\u7B97\u3002\u4E0A\u65B9\u9322\u5305\u9700\u8981\u6709 ETH \u4ED8 gas\u3001\u4EE5\u53CA USDC\u3002"
      ) : t(
        "Sessions are free and nothing is signed on-chain. Turn this back on before using the network against real workers.",
        "\u76EE\u524D session \u514D\u8CBB\u3001\u93C8\u4E0A\u4E0D\u7C3D\u4EFB\u4F55\u6771\u897F\u3002\u5C0D\u771F\u5BE6 worker \u4F7F\u7528\u524D\u8ACB\u91CD\u65B0\u958B\u555F\u3002"
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...caption, marginTop: 16 }, children: t("Manual workers", "\u624B\u52D5 worker") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 6 }, children: t(
        "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.",
        "\u53EF\u9078\uFF1A\u56FA\u5B9A\u5728\u6B64 profile \u7684 worker multiaddr\u3002\u93C8\u4E0A\u76EE\u9304\u8207 seed \u7684\u63A2\u7D22\u4ECD\u6703\u81EA\u52D5\u57F7\u884C\u3002"
      ) }),
      (status.manualWorkers ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12 }, children: t("None pinned \u2014 using discovery only.", "\u6C92\u6709\u56FA\u5B9A\u9805\u76EE\uFF0C\u53EA\u7528\u81EA\u52D5\u63A2\u7D22\u3002") }) : (status.manualWorkers ?? []).map((addr) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { style: { fontSize: 12, wordBreak: "break-all" }, children: addr }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "ghost",
            size: "sm",
            disabled: busy === "workers",
            onClick: () => {
              void saveWorkers((status.manualWorkers ?? []).filter((w) => w !== addr));
            },
            children: t("remove", "\u79FB\u9664")
          }
        )
      ] }, addr)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Input,
          {
            value: newWorker,
            placeholder: "/ip4/1.2.3.4/tcp/4001/p2p/12D3Koo\u2026",
            "aria-label": t("Worker multiaddr", "Worker multiaddr"),
            onChange: (e) => setNewWorker(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "outline",
            size: "sm",
            disabled: busy === "workers" || !newWorker.trim().startsWith("/"),
            onClick: () => {
              const addr = newWorker.trim();
              if (!addr.startsWith("/")) return;
              void saveWorkers([...status.manualWorkers ?? [], addr]).then(() => setNewWorker(""));
            },
            children: t("Add", "\u65B0\u589E")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, marginTop: 14 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy === "refresh", onClick: () => {
          void refreshNetwork();
        }, children: busy === "refresh" ? t("Refreshing\u2026", "\u91CD\u65B0\u6383\u63CF\u4E2D\u2026") : t("Refresh network", "\u91CD\u65B0\u6383\u63CF\u7DB2\u8DEF") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...dim, fontSize: 12 }, children: t("Re-reads the directory and the seed now.", "\u7ACB\u5373\u91CD\u8B80\u93C8\u4E0A\u76EE\u9304\u8207 seed\u3002") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...dim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }, children: "Models on the network" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "gk-net-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "gk-net-models", ref: models.attach, onScroll: models.update, children: offers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...dim, marginBottom: 0 }, children: "Nothing offered yet. A worker lists its local Ollama models on start." }) : offers.map((entry, i) => {
          const offer = entry.offer ?? {};
          const transport = entry.addr == null ? null : status.transports?.[entry.addr];
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "gk-net-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
              offer.model ?? "model name missing",
              offer.tier === "chat" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...dim, fontSize: 11, marginLeft: 8 }, children: "not for agents" }) : offer.tier != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...dim, fontSize: 11, marginLeft: 8 }, children: offer.tier }) : null
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...dim, textAlign: "right", fontSize: 12 }, children: offer.workerName ?? "\u2014" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { textAlign: "right", fontSize: 12 }, children: [
              price(offer.pricePerHour),
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: dim, children: transport === "relay" ? "\xB7 via seed VM" : transport === "direct" ? "\xB7 direct" : "" })
            ] })
          ] }, `${entry.addr ?? ""}:${offer.model ?? i}`);
        }) }),
        models.thumb != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "gk-net-rail", "aria-hidden": "true", onPointerDown: (e) => models.jump(e), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "gk-net-thumb", style: { top: `${models.thumb.top}%`, height: `${models.thumb.height}%` } }) })
      ] })
    ] })
  ] });
}
function apply(ctx) {
  ctx.effect(() => ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID
  }, Page)), "genkaku-user: panel page");
  ctx.effect(() => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 41,
    label: () => "GenKaKu User"
  }, Icon)), "genkaku-user: panel entry");
}

		return module.exports;
	}
});
