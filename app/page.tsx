'use strict';

'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Check,
  Copy,
  Terminal,
  Activity,
  FileCode,
  History,
  Sparkles,
  Smile,
  Cpu,
  Layers,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Code2,
  AlertCircle,
  HelpCircle,
  Database
} from "lucide-react";

// Structure definition for individual Workspace APIs
interface WorkspaceApi {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  description: string;
  category: "AI Generation" | "NLP Utilities" | "Mock Routing";
  icon: React.ComponentType<any>;
}

// Built-in systems APIs registry
const BUILT_IN_APIS: WorkspaceApi[] = [
  {
    id: "text-generator",
    name: "Gemini Text Generation",
    method: "POST",
    endpoint: "/api/generate/text",
    description: "Generates rich text completions and responses from an AI prompt.",
    category: "AI Generation",
    icon: Sparkles
  },
  {
    id: "sentiment-analyzer",
    name: "Structured Sentiment Evaluator",
    method: "POST",
    endpoint: "/api/utilities/sentiment",
    description: "Evaluates emotional undertone and returns typed metrics using JSON schema.",
    category: "NLP Utilities",
    icon: Cpu
  },
  {
    id: "joke-generator",
    name: "Structured Joke Generator",
    method: "POST",
    endpoint: "/api/generate/joke",
    description: "Constructs clean category jokes formatted in rigid setup-punchline schema.",
    category: "AI Generation",
    icon: Smile
  },
  {
    id: "dynamic-mock-stub",
    name: "Custom Mock Stubbing Engine",
    method: "POST",
    endpoint: "/api/utilities/mock",
    description: "A dynamic stubbin helper simulating custom codes, headers, delays, and responses.",
    category: "Mock Routing",
    icon: Layers
  }
];

// Presets for the tester inputs
const SEED_PROMPTS = [
  "Explain quantum computing in one simple analogy.",
  "What are the top three principles of minimalistic design?",
  "Draft a catchy email subject line for an API playground tool."
];

const SEED_SENTIMENTS = [
  {
    label: "Positive Feedback",
    text: "This API toolkit is incredible! The interface is flawless, and requests resolve almost instantly."
  },
  {
    label: "Constructive Criticism",
    text: "The server works ok, but sometimes it lags during high load and the documentation is lacking."
  },
  {
    label: "Negative Support Ticket",
    text: "Extremely frustrated. The system failed twice during checkout, costing us a premium client."
  }
];

interface CustomMock {
  id: string;
  label: string;
  status: number;
  delay: number;
  method: "GET" | "POST" | "PUT" | "DELETE";
  responseBody: string;
}

interface RequestRecord {
  id: string;
  timestamp: string;
  apiName: string;
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  requestPayload: any;
  responsePayload: any;
}

export default function ApiPlaygroundPage() {
  // Current active API Selection state
  const [selectedApi, setSelectedApi] = useState<WorkspaceApi>(BUILT_IN_APIS[0]);
  const [activeInspectorTab, setActiveInspectorTab] = useState<"response" | "request" | "code" | "history">("response");
  const [activeCodeLang, setActiveCodeLang] = useState<"curl" | "javascript" | "python">("curl");

  // Copy indicator status
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  // 1. Inputs for Text Generator
  const [prompt, setPrompt] = useState(SEED_PROMPTS[0]);
  const [systemInstruction, setSystemInstruction] = useState("You are an expert technical writer.");
  const [temperature, setTemperature] = useState(0.7);

  // 2. Inputs for Sentiment Analyzer
  const [textToAnalyze, setTextToAnalyze] = useState(SEED_SENTIMENTS[0].text);

  // 3. Inputs for Joke Generator
  const [jokeCategory, setJokeCategory] = useState("coding");

  // 4. Inputs for Mock Stubbing
  const [mockMethod, setMockMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("POST");
  const [mockStatus, setMockStatus] = useState(200);
  const [mockDelay, setMockDelay] = useState(0);
  const [mockResponse, setMockResponse] = useState(JSON.stringify({ message: "Hello from Mock Sandbox!" }, null, 2));

  // Custom Mocks Preset list saved dynamically to browser storage
  const [customMocks, setCustomMocks] = useState<CustomMock[]>([]);
  const [newMockLabel, setNewMockLabel] = useState("");

  // System Execution Logs & Call counter
  const [logs, setLogs] = useState<RequestRecord[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Live Results outputs
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [responseHeaders, setResponseHeaders] = useState<{ [key: string]: string }>({});
  const [metaStats, setMetaStats] = useState<{ latencyMs: number; status: number } | null>(null);

  // UI state for mock saving
  const [mockSavingError, setMockSavingError] = useState<string | null>(null);

  // Restore custom mocks & execution history from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedMocks = localStorage.getItem("helix_custom_mocks");
        const storedLogs = localStorage.getItem("helix_execution_logs");
        
        setTimeout(() => {
          if (storedMocks) {
            setCustomMocks(JSON.parse(storedMocks));
          } else {
            // Initialize with default seeds
            const defaults: CustomMock[] = [
              {
                id: "mock-users",
                label: "Get Users List",
                status: 200,
                delay: 300,
                method: "GET",
                responseBody: JSON.stringify([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }], null, 2)
              },
              {
                id: "mock-unauth",
                label: "Simulate 401 Unauthorized",
                status: 401,
                delay: 0,
                method: "POST",
                responseBody: JSON.stringify({ error: "Access denied. Invalid signature token." }, null, 2)
              }
            ];
            setCustomMocks(defaults);
            localStorage.setItem("helix_custom_mocks", JSON.stringify(defaults));
          }

          if (storedLogs) {
            setLogs(JSON.parse(storedLogs));
          }
        }, 0);
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }, []);

  // Utility to handle copying payloads
  const triggerCopy = (key: string, content: string) => {
    try {
      navigator.clipboard.writeText(content);
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Compile active request info based on active selected API
  const activeParamsCompiled = useMemo(() => {
    const basePayload: { [key: string]: any } = {};
    const headers: { [key: string]: string } = { "Content-Type": "application/json" };
    let method = selectedApi.method;
    let endpoint = selectedApi.endpoint;

    if (selectedApi.id === "text-generator") {
      basePayload.prompt = prompt;
      basePayload.systemInstruction = systemInstruction;
      basePayload.temperature = temperature;
    } else if (selectedApi.id === "sentiment-analyzer") {
      basePayload.text = textToAnalyze;
    } else if (selectedApi.id === "joke-generator") {
      basePayload.category = jokeCategory;
    } else if (selectedApi.id === "dynamic-mock-stub") {
      method = mockMethod;
      headers["x-mock-status"] = String(mockStatus);
      headers["x-mock-delay"] = String(mockDelay);
      headers["x-mock-content-type"] = "application/json";

      // Append custom response details to endpoints
      endpoint = `${selectedApi.endpoint}?status=${mockStatus}&delay=${mockDelay}`;

      try {
        const parsed = JSON.parse(mockResponse);
        Object.assign(basePayload, parsed);
      } catch {
        // Pass as plain text fallback
        basePayload.fallbackText = mockResponse;
      }
    }

    return { method, endpoint, headers, body: JSON.stringify(basePayload, null, 2) };
  }, [selectedApi, prompt, systemInstruction, temperature, textToAnalyze, jokeCategory, mockMethod, mockStatus, mockDelay, mockResponse]);

  // Formulate consumer code snippets in multiple flavors
  const codeSnippets = useMemo(() => {
    const { method, endpoint, headers, body } = activeParamsCompiled;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ai.studio";
    const fullUrl = `${origin}${endpoint}`;

    // cURL Snippet
    const headerString = Object.entries(headers)
      .map(([k, v]) => `  -H "${k}: ${v}"`)
      .join(" \\\n");

    const curl = `curl -X ${method} "${fullUrl}" \\\n${headerString}${
      method !== "GET" ? ` \\\n  -d '${body.replace(/'/g, "'\\''")}'` : ""
    }`;

    // JavaScript Snippet
    const jsPayload = method !== "GET" ? `,
  body: JSON.stringify(${body.split("\n").join("\n  ")})` : "";

    const javascript = `// Triggering within your code
const callMyWorkspaceApi = async () => {
  try {
    const response = await fetch("${fullUrl}", {
      method: "${method}",
      headers: ${JSON.stringify(headers, null, 2).split("\n").join("\n      ")} ${jsPayload}
    });
    
    const result = await response.json();
    console.log("Success:", result);
  } catch (err) {
    console.error("API error:", err);
  }
};`;

    // Python Snippet
    const pyHeaders = JSON.stringify(headers, null, 4).replace(/true/g, "True").replace(/false/g, "False");
    const pyPayloadStr = method !== "GET" ? `payload = ${body.replace(/true/g, "True").replace(/false/g, "False")}\nresponse = requests.${method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${method.toLowerCase()}(url, headers=headers)`;

    const python = `import requests

url = "${fullUrl}"
headers = ${pyHeaders}

${pyPayloadStr}

if response.status_code == 200:
    print("API Data:", response.json())
else:
    print(f"Error {response.status_code}:", response.text)`;

    return { curl, javascript, python };
  }, [activeParamsCompiled]);

  // Execute workspace API trigger
  const runApiRequest = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setRawResponse(null);
    setMetaStats(null);

    const { method, endpoint, headers, body } = activeParamsCompiled;
    const tStart = performance.now();

    try {
      const options: RequestInit = {
        method,
        headers,
      };

      if (method !== "GET") {
        options.body = body;
      }

      const res = await fetch(endpoint, options);
      const duration = Math.round(performance.now() - tStart);

      // Extract details
      const headersMap: { [key: string]: string } = {};
      res.headers.forEach((v, k) => {
        headersMap[k] = v;
      });
      setResponseHeaders(headersMap);

      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { rawText: responseText };
      }

      setRawResponse(data);
      setMetaStats({
        status: res.status,
        latencyMs: duration
      });

      // Log execution trace record
      const newRecord: RequestRecord = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        apiName: selectedApi.name,
        endpoint,
        method,
        status: res.status,
        latencyMs: duration,
        requestPayload: JSON.parse(body),
        responsePayload: data
      };

      const updatedLogs = [newRecord, ...logs].slice(0, 15);
      setLogs(updatedLogs);
      localStorage.setItem("helix_execution_logs", JSON.stringify(updatedLogs));

      if (res.status >= 400) {
        setExecutionError(`Resolved with Client/Server Status: ${res.status}`);
      }
    } catch (err: any) {
      console.error(err);
      setExecutionError(err.message || "Network execution failed or request was blocked.");
    } finally {
      setIsExecuting(false);
      setActiveInspectorTab("response"); // Autofocus responses on click
    }
  };

  // Manage creating brand-new mocking presets
  const saveMockPreset = () => {
    setMockSavingError(null);
    if (!newMockLabel.trim()) {
      setMockSavingError("Provide an endpoint preset label (e.g., Get Orders).");
      return;
    }

    try {
      JSON.parse(mockResponse);
    } catch {
      setMockSavingError("Mock response must be valid JSON content.");
      return;
    }

    const brandNew: CustomMock = {
      id: `mock-${Date.now()}`,
      label: newMockLabel.trim(),
      status: mockStatus,
      delay: mockDelay,
      method: mockMethod,
      responseBody: mockResponse
    };

    const nextMocks = [brandNew, ...customMocks];
    setCustomMocks(nextMocks);
    localStorage.setItem("helix_custom_mocks", JSON.stringify(nextMocks));
    setNewMockLabel("");
  };

  const removeMockPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMocks = customMocks.filter((m) => m.id !== id);
    setCustomMocks(nextMocks);
    localStorage.setItem("helix_custom_mocks", JSON.stringify(nextMocks));
  };

  const loadMockPreset = (m: CustomMock) => {
    setMockMethod(m.method);
    setMockStatus(m.status);
    setMockDelay(m.delay);
    setMockResponse(m.responseBody);
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem("helix_execution_logs");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Visual Application Header Row */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100/80 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm ring-1 ring-indigo-100/20">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-sans font-semibold tracking-tight text-slate-900 text-lg flex items-center gap-2">
              API Dashboard & Playground
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                Workspace Active
              </span>
            </h1>
            <p className="font-sans text-xs text-slate-500">
              Test server-side utility APIs and formulate integration snippets.
            </p>
          </div>
        </div>

        {/* Server Vital Stats indicators */}
        <div className="flex items-center gap-4 flex-wrap text-xs font-medium text-slate-500 bg-slate-100/50 py-1.5 px-3 rounded-xl border border-slate-200/40">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600 select-none">Gateway: Ready</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3 text-slate-400" />
            <span className="text-slate-600">Model: gemini-3.5-flash</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-slate-400" />
            <span>{logs.length} calls tracked</span>
          </div>
        </div>
      </header>

      {/* Main Sandbox Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Selector and Input Parameters Builders (7 Cols) */}
        <section className="lg:col-span-7 space-y-7 flex flex-col h-full" id="workspace-controls">
          
          {/* Section 1: API Selector */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Select Workspace API
              </h2>
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50/50 px-2 py-1 rounded-md">
                Server-Side
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="api-selector-grid">
              {BUILT_IN_APIS.map((api) => {
                const isSelected = selectedApi.id === api.id;
                const IconComponent = api.icon;

                return (
                  <button
                    key={api.id}
                    id={`api-btn-${api.id}`}
                    onClick={() => {
                      setSelectedApi(api);
                      setExecutionError(null);
                      setRawResponse(null);
                      setMetaStats(null);
                      // Set default category joke text
                      if (api.id === "sentiment-analyzer") {
                        setTextToAnalyze(SEED_SENTIMENTS[0].text);
                      }
                    }}
                    className={`group text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden flex gap-3 ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-600/10 bg-indigo-50/20"
                        : "border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                      }`}
                    >
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-sans font-medium text-slate-900 text-xs flex items-center gap-1.5">
                        {api.name}
                        {isSelected && (
                          <Check className="h-3 w-3 text-indigo-600" />
                        )}
                      </div>
                      <p className="font-sans text-xs text-slate-400 font-normal leading-relaxed">
                        {api.description}
                      </p>
                    </div>

                    {/* Quick Method indicator pill */}
                    <span className={`absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      api.method === "GET" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {api.method}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Component Dynamic Parameter Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-500" />
              Configure Payload parameters
            </h2>

            <div className="flex-1 space-y-6">
              
              {/* Form A: Text Generator inputs */}
              {selectedApi.id === "text-generator" && (
                <div className="space-y-5 animate-fadeIn" id="builder-text-generator">
                  {/* Prompt Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Prompt string input
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white outline-none transition-colors"
                      placeholder="e.g., What is the best strategy to secure API gateways?"
                    />
                    
                    {/* Prompt Presets */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400">Presets:</span>
                      {SEED_PROMPTS.map((seed, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrompt(seed)}
                          className="text-[10px] text-slate-600 hover:text-indigo-600 transition-colors bg-slate-150 hover:bg-slate-200/50 px-2 py-1 rounded"
                        >
                          Scenario {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* System Instructions */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      System Instructions Context
                    </label>
                    <input
                      type="text"
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-colors"
                      placeholder="Customize context of the underlying model agent..."
                    />
                  </div>

                  {/* Temperature Slider config */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-700">
                        Temperature: <span className="text-indigo-600 font-bold">{temperature}</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {temperature <= 0.3 ? "Deterministic" : temperature >= 0.8 ? "Creative / Variable" : "Balanced"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.5"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 hover:accent-indigo-700 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Form B: Sentiment Evaluator inputs */}
              {selectedApi.id === "sentiment-analyzer" && (
                <div className="space-y-5 animate-fadeIn" id="builder-sentiment-analyzer">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Target Text Content
                    </label>
                    <textarea
                      value={textToAnalyze}
                      onChange={(e) => setTextToAnalyze(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white outline-none transition-colors"
                      placeholder="Insert customer reviews, message boards, emails or social blurbs here to evaluate sentiment metrics..."
                    />

                    {/* Pre-arranged scenarios prompts */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Quick Evaluation Scenarios:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {SEED_SENTIMENTS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTextToAnalyze(preset.text)}
                            className="text-left text-[11px] p-2 bg-slate-100/55 hover:bg-slate-200/50 border border-slate-200/30 rounded-lg text-slate-700 transition-colors"
                          >
                            <span className="block font-semibold text-slate-800 text-[10px]">
                              {preset.label}
                            </span>
                            <span className="line-clamp-1 font-sans text-slate-500 text-[9px]">
                              &ldquo;{preset.text}&rdquo;
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form C: Joke Generator inputs */}
              {selectedApi.id === "joke-generator" && (
                <div className="space-y-4 animate-fadeIn" id="builder-joke">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Select Joke Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["coding", "dad", "science", "puns", "history", "gaming"].map((type) => {
                        const isChosen = jokeCategory === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setJokeCategory(type)}
                            className={`p-3 rounded-xl border text-xs text-left capitalize transition-all ${
                              isChosen
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
                                : "hover:bg-slate-50 bg-slate-100/30 border-slate-200/60 text-slate-700"
                            }`}
                          >
                            {type} joke
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Form D: Mock Stub routing inputs */}
              {selectedApi.id === "dynamic-mock-stub" && (
                <div className="space-y-5 animate-fadeIn" id="builder-mock-stub">
                  
                  {/* Parameters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Method Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        HTTP Method
                      </label>
                      <select
                        value={mockMethod}
                        onChange={(e) => setMockMethod(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    {/* Status Code */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Status Code
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="599"
                        value={mockStatus}
                        onChange={(e) => setMockStatus(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Delay */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        step="50"
                        value={mockDelay}
                        onChange={(e) => setMockDelay(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                        placeholder="0ms - 5000ms"
                      />
                    </div>
                  </div>

                  {/* Body Payload JSON input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Mock JSON Body
                    </label>
                    <textarea
                      value={mockResponse}
                      onChange={(e) => setMockResponse(e.target.value)}
                      rows={4}
                      className="w-full font-mono rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-3.5 text-xs placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Register New Mock Preset section */}
                  <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-200/40 space-y-3">
                    <div className="flex items-center gap-1.5 text-slate-800 text-xs font-semibold">
                      <Database className="h-3.5 w-3.5 text-indigo-500" />
                      Save Endpoint Mock Preset
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Save this mock configuration to browser storage as a testable preset.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMockLabel}
                        onChange={(e) => setNewMockLabel(e.target.value)}
                        placeholder="Preset label (e.g., Get user profile)"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={saveMockPreset}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        Save Preset
                      </button>
                    </div>
                    {mockSavingError && (
                      <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {mockSavingError}
                      </p>
                    )}

                    {/* Interactive Custom Presets Grid selection */}
                    {customMocks.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-semibold text-slate-600 uppercase block mb-2">Saved Presets:</span>
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {customMocks.map((pm) => (
                            <div
                              key={pm.id}
                              onClick={() => loadMockPreset(pm)}
                              className="group flex items-center justify-between text-left p-2 hover:bg-white bg-slate-50 hover:border-slate-300 border border-transparent rounded-lg cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  pm.method === "GET" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                }`}>
                                  {pm.method}
                                </span>
                                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                                  {pm.label}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({pm.status} • {pm.delay}ms)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => removeMockPreset(pm.id, e)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="Delete preset"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Noble Submit Execution Action block */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-400 font-medium block">API URL Endpath:</span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {activeParamsCompiled.method} {activeParamsCompiled.endpoint.split("?")[0]}
                </span>
              </div>

              <button
                type="button"
                onClick={runApiRequest}
                disabled={isExecuting}
                className={`relative w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2.5 transition-all outline-none overflow-hidden cursor-pointer select-none active:scale-95 duration-200 ${
                  isExecuting
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-100/30"
                }`}
              >
                {isExecuting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Executing Route...
                  </>
                ) : (
                  <>
                    <Play className="h-4.5 w-4.5 fill-current" />
                    Send API Request
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Response Inspector and Snippets Viewer (5 Cols) */}
        <section className="lg:col-span-5 space-y-7" id="workspace-inspector">
          
          {/* Main Inspector Box */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[670px]">
            
            {/* Inspector Navigation tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1.5 shrink-0">
              {[
                { id: "response", label: "Response", icon: Activity },
                { id: "request", label: "Request Config", icon: Terminal },
                { id: "code", label: "Client Snippets", icon: FileCode },
                { id: "history", label: "Call History", icon: History }
              ].map((tab) => {
                const isSelected = activeInspectorTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInspectorTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-lg transition-all font-medium cursor-pointer ${
                      isSelected
                        ? "bg-white text-indigo-700 shadow-sm border-slate-200/60"
                        : "hover:bg-slate-100/60 hover:text-slate-800 text-slate-500"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inspector body views container */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              <AnimatePresence mode="wait">
                
                {/* Visual Module A: Response JSON Display */}
                {activeInspectorTab === "response" && (
                  <motion.div
                    key="response-tab"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4 h-full flex flex-col"
                  >
                    {/* Header values */}
                    <div className="flex items-center justify-between">
                      {metaStats ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            metaStats.status >= 200 && metaStats.status < 300
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            HTTP {metaStats.status}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            {metaStats.latencyMs} ms
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Waiting for execution...
                        </span>
                      )}

                      {/* Copy response */}
                      {rawResponse && (
                        <button
                          type="button"
                          onClick={() => triggerCopy("res_payload", JSON.stringify(rawResponse, null, 2))}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedStates["res_payload"] ? (
                            <>
                              <Check className="h-3 w-3" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy Output
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Code screen formatting */}
                    <div className="flex-1 min-h-[440px] flex flex-col">
                      {isExecuting ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <svg className="animate-spin h-9 w-9 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                            Calling API Server endpoint...
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                            Generating AI structures server-side using Google Gemini model matrices. This usually resolves in ~1.5 seconds.
                          </p>
                        </div>
                      ) : executionError ? (
                        <div className="flex-1 border border-rose-200/50 bg-rose-50/30 rounded-xl p-5 space-y-3">
                          <div className="flex gap-2 text-rose-800">
                            <AlertCircle className="h-4 bg-transparent outline-none self-start shrink-0 pt-0.5" />
                            <div>
                              <h3 className="text-xs font-bold leading-none">Execution Failed</h3>
                              <p className="text-[11px] text-rose-700 leading-relaxed pt-1.5 font-sans">
                                {executionError}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-sans leading-relaxed border-t border-rose-200/20 pt-2">
                            <strong>Note:</strong> Make sure your API environment credentials are configured in workspace secrets dashboard (GEMINI_API_KEY).
                          </div>
                        </div>
                      ) : rawResponse ? (
                        <pre className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4.5 font-mono text-[11px] text-slate-100 overflow-x-auto selection:bg-slate-700 leading-relaxed select-text">
                          <code className="block whitespace-pre">
                            {JSON.stringify(rawResponse, null, 2)}
                          </code>
                        </pre>
                      ) : (
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                          <Layers className="h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ready for Test Run</p>
                          <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                            Click <strong>&ldquo;Send API Request&rdquo;</strong> in the controls column to execute live and analyze real JSON responses.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Visual Module B: Request Parameters & payloads */}
                {activeInspectorTab === "request" && (
                  <motion.div
                    key="request-tab"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                      <span>Request Configurations payload</span>
                      <button
                        type="button"
                        onClick={() => triggerCopy("req_payload", activeParamsCompiled.body)}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        {copiedStates["req_payload"] ? "Copied!" : "Copy Payload"}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* URL endpath stats */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/50 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Endpoint URL</span>
                        <code className="text-[11px] font-semibold text-indigo-700 break-all leading-normal whitespace-normal">
                          {activeParamsCompiled.method} {activeParamsCompiled.endpoint}
                        </code>
                      </div>

                      {/* Header values */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/50 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Headers</span>
                        <div className="space-y-1">
                          {Object.entries(activeParamsCompiled.headers).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[11px] font-mono leading-none py-0.5">
                              <span className="text-slate-500">{k}:</span>
                              <span className="text-slate-800 font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Request body values */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Body JSON</span>
                        <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-100 overflow-x-auto leading-relaxed max-h-[240px]">
                          <code>{activeParamsCompiled.body}</code>
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Visual Module C: Code Generator Snippets */}
                {activeInspectorTab === "code" && (
                  <motion.div
                    key="code-tab"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Inner Lang Selection tabs */}
                    <div className="flex border-b border-slate-100 gap-1 pb-1">
                      {[
                        { id: "curl", label: "cURL" },
                        { id: "javascript", label: "JavaScript" },
                        { id: "python", label: "Python" }
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => setActiveCodeLang(lang.id as any)}
                          className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                            activeCodeLang === lang.id
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Ready-to-use Client Boilerplate</span>
                      <button
                        type="button"
                        onClick={() => triggerCopy("copied_snippet", codeSnippets[activeCodeLang])}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 hover:underline cursor-pointer"
                      >
                        {copiedStates["copied_snippet"] ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 font-mono text-[11px] text-slate-100 overflow-x-auto leading-relaxed min-h-[410px] select-text">
                      <code>{codeSnippets[activeCodeLang]}</code>
                    </pre>
                  </motion.div>
                )}

                {/* Visual Module D: Past Call History list */}
                {activeInspectorTab === "history" && (
                  <motion.div
                    key="history-tab"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4 h-full flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 select-none">
                        Run traces log history ({logs.length})
                      </span>
                      {logs.length > 0 && (
                        <button
                          type="button"
                          onClick={clearLogs}
                          className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                        >
                          Clear Session Logs
                        </button>
                      )}
                    </div>

                    {logs.length === 0 ? (
                      <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <History className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">No past traces</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                          Successful or failed call indicators will populate this tab dynamically.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            onClick={() => {
                              setRawResponse(log.responsePayload);
                              setMetaStats({ status: log.status, latencyMs: log.latencyMs });
                              setActiveInspectorTab("response");
                            }}
                            className="p-3 border border-slate-200/70 hover:border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-all space-y-2 select-none"
                            title="Click to view details"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                {log.apiName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {log.timestamp}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  log.status >= 200 && log.status < 300
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}>
                                  {log.status}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-750">
                                  {log.method} {log.endpoint.split("?")[0]}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-slate-500">
                                {log.latencyMs}ms
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Micro-Helpful footer segment */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-4 shrink-0 flex items-center gap-2 text-slate-500">
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
              <p className="font-sans text-[11px] leading-relaxed">
                Click headers inside components to copy, or copy raw codes to integrate. All requests proxy safely through server actions.
              </p>
            </div>

          </div>

        </section>

      </main>

      {/* Aesthetic Workspace Bottom block */}
      <footer className="py-6 border-t border-slate-100 bg-white mt-12 text-center text-slate-400 text-xs text-sans space-y-1 select-none">
        <p>© 2026 Google AI Studio Workspace • Made for development sandboxes.</p>
        <p className="text-[10px]">Utilizes standard server-side @google/genai & routing matrices.</p>
      </footer>
    </div>
  );
}
