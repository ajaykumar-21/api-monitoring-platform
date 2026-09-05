"use client";

import React from "react";
import { Plus, Trash2, ShieldCheck, Zap, Sparkles } from "lucide-react";
import {
  AssertionRule,
  AssertionTarget,
  AssertionOperator,
} from "@/lib/worker/assertions";

interface AssertionBuilderProps {
  assertions: AssertionRule[];
  onChange: (assertions: AssertionRule[]) => void;
}

export default function AssertionBuilder({
  assertions,
  onChange,
}: AssertionBuilderProps) {
  const addAssertion = (preset?: Partial<AssertionRule>) => {
    const newRule: AssertionRule = {
      id:
        "rule_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      target: preset?.target || "body_json",
      property: preset?.property !== undefined ? preset.property : "status",
      operator: preset?.operator || "EQUALS",
      value: preset?.value !== undefined ? preset.value : "ok",
    };
    onChange([...assertions, newRule]);
  };

  const updateAssertion = (
    index: number,
    field: keyof AssertionRule,
    val: string,
  ) => {
    const updated = [...assertions];
    const rule = { ...updated[index], [field]: val };

    // Auto-adjust fields if target changes
    if (field === "target") {
      if (val === "response_time") {
        rule.property = "";
        rule.operator = "LESS_THAN";
        rule.value = "1000";
      } else if (val === "body_text") {
        rule.property = "";
        rule.operator = "CONTAINS";
        rule.value = "";
      } else if (val === "header") {
        rule.property = "content-type";
        rule.operator = "CONTAINS";
        rule.value = "application/json";
      } else if (val === "body_json") {
        rule.property = "status";
        rule.operator = "EQUALS";
        rule.value = "ok";
      }
    }

    updated[index] = rule;
    onChange(updated);
  };

  const removeAssertion = (index: number) => {
    const updated = assertions.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
            Response Assertions & Validation
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Deep Health Check
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {assertions.length} Active Rule{assertions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="text-xs text-gray-400">
        Assert that the JSON response payload, custom headers, or response
        latency match expected values. If an assertion fails, the monitor
        reports <strong>DOWN 🔴</strong> even if HTTP 200 is returned.
      </p>

      {/* Preset Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-xs text-gray-500 flex items-center gap-1 self-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Presets:
        </span>
        <button
          type="button"
          onClick={() =>
            addAssertion({
              target: "body_json",
              property: "status",
              operator: "EQUALS",
              value: "ok",
            })
          }
          className="text-xs bg-[#0b0f19] hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/80 px-2.5 py-1 rounded-md transition-colors font-mono"
        >
          + status == &quot;ok&quot;
        </button>
        <button
          type="button"
          onClick={() =>
            addAssertion({
              target: "body_json",
              property: "success",
              operator: "EQUALS",
              value: "true",
            })
          }
          className="text-xs bg-[#0b0f19] hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/80 px-2.5 py-1 rounded-md transition-colors font-mono"
        >
          + success == true
        </button>
        <button
          type="button"
          onClick={() =>
            addAssertion({
              target: "response_time",
              property: "",
              operator: "LESS_THAN",
              value: "1000",
            })
          }
          className="text-xs bg-[#0b0f19] hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/80 px-2.5 py-1 rounded-md transition-colors font-mono"
        >
          + Latency &lt; 1000ms
        </button>
        <button
          type="button"
          onClick={() =>
            addAssertion({
              target: "header",
              property: "content-type",
              operator: "CONTAINS",
              value: "application/json",
            })
          }
          className="text-xs bg-[#0b0f19] hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/80 px-2.5 py-1 rounded-md transition-colors font-mono"
        >
          + Content-Type: json
        </button>
      </div>

      {/* Assertion List */}
      {assertions.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-gray-800 text-center space-y-2 bg-[#0b0f19]/50">
          <p className="text-xs text-gray-400">
            No assertions configured. The monitor will only validate the HTTP
            Status code.
          </p>
          <button
            type="button"
            onClick={() => addAssertion()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors border border-gray-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Assertion Rule</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assertions.map((rule, idx) => {
            const isPropertyNeeded =
              rule.target === "body_json" || rule.target === "header";
            const isValueNeeded =
              rule.operator !== "EXISTS" &&
              rule.operator !== "NOT_EXISTS" &&
              rule.operator !== "IS_EMPTY" &&
              rule.operator !== "IS_NOT_EMPTY";

            return (
              <div
                key={rule.id || idx}
                className="bg-[#0b0f19] border border-gray-800 rounded-xl p-3.5 space-y-3 shadow-inner"
              >
                <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Zap className="w-3.5 h-3.5" /> Rule #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAssertion(idx)}
                    className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  {/* Target selector */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                      Target
                    </label>
                    <select
                      value={rule.target}
                      onChange={(e) =>
                        updateAssertion(
                          idx,
                          "target",
                          e.target.value as AssertionTarget,
                        )
                      }
                      className="w-full bg-[#131927] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="body_json">JSON Property</option>
                      <option value="body_text">Response Body Text</option>
                      <option value="header">Response Header</option>
                      <option value="response_time">Max Latency (ms)</option>
                    </select>
                  </div>

                  {/* Property field (if needed) */}
                  {isPropertyNeeded ? (
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                        {rule.target === "body_json"
                          ? "Property Path"
                          : "Header Name"}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          rule.target === "body_json"
                            ? "data.user.id"
                            : "content-type"
                        }
                        value={rule.property || ""}
                        onChange={(e) =>
                          updateAssertion(idx, "property", e.target.value)
                        }
                        className="w-full bg-[#131927] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-3 hidden sm:block">
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">
                        Scope
                      </label>
                      <div className="text-xs text-gray-500 font-mono py-1.5 px-2 bg-gray-900/50 rounded-lg border border-gray-800">
                        {rule.target === "response_time"
                          ? "Entire Request"
                          : "Full Body"}
                      </div>
                    </div>
                  )}

                  {/* Operator selector */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                      Condition / Operator
                    </label>
                    <select
                      value={rule.operator}
                      onChange={(e) =>
                        updateAssertion(
                          idx,
                          "operator",
                          e.target.value as AssertionOperator,
                        )
                      }
                      className="w-full bg-[#131927] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="EQUALS">Equals (==)</option>
                      <option value="NOT_EQUALS">Does Not Equal (!=)</option>
                      <option value="CONTAINS">Contains Substring</option>
                      <option value="NOT_CONTAINS">Does Not Contain</option>
                      <option value="GREATER_THAN">Greater Than (&gt;)</option>
                      <option value="LESS_THAN">Less Than (&lt;)</option>
                      <option value="EXISTS">Exists (Not Null)</option>
                      <option value="NOT_EXISTS">Does Not Exist</option>
                      <option value="IS_EMPTY">Is Empty</option>
                      <option value="IS_NOT_EMPTY">Is Not Empty</option>
                      <option value="REGEX_MATCH">Regex Match</option>
                    </select>
                  </div>

                  {/* Expected Value input (if needed) */}
                  {isValueNeeded ? (
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                        Expected Value
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          rule.target === "response_time" ? "1000" : "expected"
                        }
                        value={rule.value || ""}
                        onChange={(e) =>
                          updateAssertion(idx, "value", e.target.value)
                        }
                        className="w-full bg-[#131927] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">
                        Expected Value
                      </label>
                      <div className="text-xs text-gray-500 font-mono py-1.5 px-2 bg-gray-900/50 rounded-lg border border-gray-800">
                        Implicit Check
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => addAssertion()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors border border-gray-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Assertion Rule</span>
          </button>
        </div>
      )}
    </div>
  );
}
