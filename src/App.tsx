import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Info,
  Play,
  Search,
  Server,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";

type Condition = "baseline" | "highlight";
type DatasetKey = "A" | "B";
type Status = "normal" | "warning" | "critical";

type Kpi = [label: string, value: string, status: Status];
type Service = [
  name: string,
  team: string,
  cpu: string,
  avgLatency: string,
  p95Latency: string,
  errorRate: string,
  status: Status
];
type HistoryRow = [name: string, states: Status[]];
type ThroughputRow = [
  name: string,
  input: number,
  output: number,
  gap: string,
  status: Status
];
type SlaRiskRow = [
  name: string,
  budget: string,
  risk: "Low" | "Medium" | "High",
  status: Status
];

type Dataset = {
  name: string;
  priorityRule: string;
  answers: Record<string, string[]>;
  kpis: Kpi[];
  services: Service[];
  throughput: ThroughputRow[];
  slaRisks: SlaRiskRow[];
  history: HistoryRow[];
};

type Task = {
  id: string;
  title: string;
  instruction: string;
  targetType: "kpi" | "service" | "throughput" | "sla" | "history";
  multi: boolean;
};

type QuestionnaireItem = [key: string, label: string, hint: string];

type ResultRow = Record<string, string | number | boolean | undefined>;

const initialOrder: Condition = Math.random() < 0.5 ? "baseline" : "highlight";
const SAVE_ENDPOINT = "http://localhost:5000/save";

const datasets: Record<DatasetKey, Dataset> = {
  A: {
    name: "Scenario A",
    priorityRule:
      "Wähle den Service mit der höchsten Error Rate.",
    answers: {
      criticalKpi: ["P95 Latency", "Error Rate", "Open Incidents", "Failed Jobs"],
      priorityService: ["Payment Gateway"],
      multiMetricServices: ["Payment Gateway", "Checkout Service", "User Database"],
      bottleneckStages: ["Validation", "Retry Queue"],
      slaRisk: ["Checkout API"],
      historyComponent: ["API Traffic"],
    },
    kpis: [
      ["Availability", "99.82%", "normal"],
      ["Avg Latency", "842 ms", "warning"],
      ["P95 Latency", "1.48 s", "critical"],
      ["Error Rate", "3.9%", "critical"],
      ["Queue Depth", "18.4k", "warning"],
      ["Open Incidents", "5", "critical"],
      ["CPU Avg", "78%", "warning"],
      ["Failed Jobs", "214", "critical"],
    ],
    services: [
      ["Authentication API", "Core", "62%", "210 ms", "410 ms", "0.6%", "normal"],
      ["Search Service", "Discovery", "71%", "820 ms", "1.6 s", "1.2%", "warning"],
      ["Checkout Service", "Commerce", "82%", "970 ms", "1.9 s", "3.8%", "critical"],
      ["Notification Worker", "Messaging", "49%", "160 ms", "310 ms", "0.3%", "normal"],
      ["User Database", "Data", "93%", "820 ms", "1.7 s", "2.4%", "critical"],
      ["Analytics Pipeline", "BI", "79%", "610 ms", "1.1 s", "1.8%", "warning"],
      ["Payment Gateway", "Commerce", "88%", "1.48 s", "2.8 s", "6.7%", "critical"],
      ["CDN Edge Sync", "Infra", "55%", "130 ms", "290 ms", "0.2%", "normal"],
    ],
    throughput: [
      ["Ingest", 920, 820, "+100", "normal"],
      ["Validation", 1180, 760, "+420", "critical"],
      ["Processing", 940, 780, "+160", "warning"],
      ["Retry Queue", 690, 260, "+430", "critical"],
      ["Export", 510, 490, "+20", "normal"],
    ],
    slaRisks: [
      ["Payment API", "12%", "Medium", "warning"],
      ["Checkout API", "4%", "High", "critical"],
      ["Search API", "31%", "Low", "normal"],
      ["Database Writes", "8%", "Medium", "warning"],
      ["Notification Jobs", "44%", "Low", "normal"],
    ],
    history: [
      ["Web App", ["normal", "critical", "normal", "warning", "critical"]],
      ["Mobile App", ["critical", "warning", "normal", "critical", "warning"]],
      ["API Traffic", ["warning", "critical", "critical", "critical", "critical"]],
      ["Batch Jobs", ["normal", "normal", "critical", "warning", "normal"]],
      ["Partner API", ["critical", "normal", "warning", "critical", "normal"]],
    ],
  },
  B: {
    name: "Scenario B",
    priorityRule:
      "Wähle den Service mit der höchsten Error Rate.",
    answers: {
      criticalKpi: ["P95 Latency", "Error Rate", "Queue Depth", "Open Incidents", "Failed Jobs"],
      priorityService: ["Search Service"],
      multiMetricServices: ["Search Service", "Recommendation API", "Order Database"],
      bottleneckStages: ["Processing", "Export"],
      slaRisk: ["Search API"],
      historyComponent: ["Mobile App"],
    },
    kpis: [
      ["Availability", "99.61%", "warning"],
      ["Avg Latency", "910 ms", "warning"],
      ["P95 Latency", "1.72 s", "critical"],
      ["Error Rate", "4.4%", "critical"],
      ["Queue Depth", "21.9k", "critical"],
      ["Open Incidents", "6", "critical"],
      ["CPU Avg", "81%", "warning"],
      ["Failed Jobs", "188", "critical"],
    ],
    services: [
      ["Authentication API", "Core", "61%", "220 ms", "430 ms", "0.7%", "normal"],
      ["Checkout Service", "Commerce", "69%", "540 ms", "980 ms", "1.4%", "normal"],
      ["Payment Gateway", "Commerce", "74%", "780 ms", "1.6 s", "1.8%", "warning"],
      ["Recommendation API", "ML", "89%", "1.18 s", "2.2 s", "4.7%", "critical"],
      ["Order Database", "Data", "94%", "900 ms", "1.8 s", "2.9%", "critical"],
      ["Email Queue", "Messaging", "77%", "610 ms", "1.2 s", "1.9%", "warning"],
      ["Search Service", "Discovery", "92%", "1.36 s", "2.6 s", "6.1%", "critical"],
      ["Analytics Pipeline", "BI", "68%", "450 ms", "920 ms", "1.0%", "normal"],
    ],
    throughput: [
      ["Ingest", 860, 790, "+70", "normal"],
      ["Validation", 980, 780, "+200", "warning"],
      ["Processing", 1320, 840, "+480", "critical"],
      ["Retry Queue", 560, 530, "+30", "normal"],
      ["Export", 910, 520, "+390", "critical"],
    ],
    slaRisks: [
      ["Search API", "3%", "High", "critical"],
      ["Recommendation API", "7%", "Medium", "warning"],
      ["Order API", "11%", "Medium", "warning"],
      ["Payment API", "28%", "Low", "normal"],
      ["Messaging Jobs", "39%", "Low", "normal"],
    ],
    history: [
      ["Web App", ["critical", "normal", "warning", "normal", "critical"]],
      ["Mobile App", ["warning", "critical", "critical", "critical", "critical"]],
      ["API Traffic", ["normal", "critical", "warning", "normal", "critical"]],
      ["Batch Jobs", ["normal", "normal", "critical", "warning", "normal"]],
      ["Partner API", ["critical", "warning", "normal", "critical", "normal"]],
    ],
  },
};

const tasks: Task[] = [
  {
    id: "criticalKpi",
    title: "Kritische Kennzahlen finden",
    instruction: "Wähle im Bereich „System Overview“ alle Kennzahlen aus, deren Status kritisch ist.",
    targetType: "kpi",
    multi: true,
  },
  {
    id: "priorityService",
    title: "Service mit höchster Error Rate auswählen",
    instruction: "Wähle den Service mit der höchsten Error Rate aus.",
    targetType: "service",
    multi: false,
  },
  {
    id: "multiMetricServices",
    title: "Services über zwei Grenzwerten auswählen",
    instruction:
      "Wähle alle Services aus, bei denen P95-Latenz über 1.5 s und Error Rate über 2% liegen.",
    targetType: "service",
    multi: true,
  },
  {
    id: "bottleneckStages",
    title: "Pipeline-Bottlenecks auswählen",
    instruction:
      "Wähle im Bereich „Throughput Balance“ alle Stufen aus, bei denen Input und Output um mehr als 300/min auseinanderliegen.",
    targetType: "throughput",
    multi: true,
  },
  {
    id: "slaRisk",
    title: "Höchstes SLA-Risiko auswählen",
    instruction: "Wähle im Bereich „SLA Risk“ den Eintrag aus, der ein High-Risk-SLA-Problem zeigt.",
    targetType: "sla",
    multi: false,
  },
  {
    id: "historyComponent",
    title: "Komponente mit den meisten kritischen Checks auswählen",
    instruction:
      "Wähle im Bereich „Status History“ die Komponente aus, die insgesamt die meisten kritischen Checks enthält.",
    targetType: "history",
    multi: false,
  },
];

const nasaTlxItems: QuestionnaireItem[] = [
  [
    "nasaMentalDemand",
    "Wie mental anspruchsvoll war die Bearbeitung der Aufgaben mit diesem Dashboard?",
    "1 = sehr gering, 7 = sehr hoch",
  ],
  [
    "nasaPhysicalDemand",
    "Wie körperlich anstrengend war die Bearbeitung der Aufgaben mit diesem Dashboard?",
    "1 = sehr gering, 7 = sehr hoch",
  ],
  [
    "nasaTemporalDemand",
    "Wie stark hast du dich während der Bearbeitung unter Zeitdruck gesetzt gefühlt?",
    "1 = gar nicht, 7 = sehr stark",
  ],
  [
    "nasaPerformance",
    "Wie erfolgreich warst du deiner Einschätzung nach bei der Bearbeitung der Aufgaben?",
    "1 = gar nicht erfolgreich, 7 = sehr erfolgreich",
  ],
  [
    "nasaEffort",
    "Wie viel Anstrengung war notwendig, um die Aufgaben mit diesem Dashboard zu bearbeiten?",
    "1 = sehr wenig, 7 = sehr viel",
  ],
  [
    "nasaFrustration",
    "Wie frustriert warst du während der Bearbeitung der Aufgaben mit diesem Dashboard?",
    "1 = gar nicht frustriert, 7 = sehr frustriert",
  ],
];

const susItems: QuestionnaireItem[] = [
  ["sus1", "Ich denke, dass ich dieses Dashboard häufig nutzen würde.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus2", "Ich fand das Dashboard unnötig komplex.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus3", "Ich fand das Dashboard einfach zu benutzen.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus4", "Ich glaube, ich würde technische Unterstützung benötigen, um dieses Dashboard nutzen zu können.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus5", "Ich fand, dass die verschiedenen Bestandteile des Dashboards gut integriert waren.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus6", "Ich fand, dass es im Dashboard zu viele Inkonsistenzen gab.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus7", "Ich kann mir vorstellen, dass die meisten Personen den Umgang mit diesem Dashboard schnell lernen würden.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus8", "Ich fand die Nutzung des Dashboards umständlich.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus9", "Ich fühlte mich sicher im Umgang mit diesem Dashboard.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
  ["sus10", "Ich musste viele Dinge lernen, bevor ich mit diesem Dashboard arbeiten konnte.", "1 = stimme überhaupt nicht zu, 5 = stimme voll zu"],
];

const dashboardSpecificItems: QuestionnaireItem[] = [
  [
    "visualOverload",
    "Das Dashboard wirkte visuell überladen.",
    "1 = stimme überhaupt nicht zu, 7 = stimme voll zu",
  ],
  [
    "easeDetection",
    "Kritische Zustände waren im Dashboard leicht zu erkennen.",
    "1 = stimme überhaupt nicht zu, 7 = stimme voll zu",
  ],
  [
    "relevanceDifferentiation",
    "Die Darstellung hat mir geholfen, relevante Informationen von weniger relevanten Informationen zu unterscheiden.",
    "1 = stimme überhaupt nicht zu, 7 = stimme voll zu",
  ],
];

function statusClasses(
  status: Status,
  highlighted: boolean,
  selected = false,
  clickable = false
): string {
  const click = clickable
    ? " cursor-pointer transition hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-200"
    : "";
  const sel = selected
    ? " bg-blue-50 shadow-[inset_0_0_0_2px_rgb(37,99,235)]"
    : "";

  if (!highlighted) {
    return `border-slate-200 bg-white text-slate-700${click}${sel}`;
  }

  if (status === "critical") {
    return `border-red-300 bg-red-50 text-red-900${click}${sel}`;
  }

  if (status === "warning") {
    return `border-slate-200 bg-white text-amber-800${click}${sel}`;
  }

  return `border-slate-200 bg-white text-slate-700${click}${sel}`;
}

function StatusBadge({ status, highlighted }: { status: Status; highlighted: boolean }) {
  if (!highlighted) {
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
        {status}
      </span>
    );
  }

  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
        <AlertTriangle className="h-3 w-3" />
        critical
      </span>
    );
  }

  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        warning
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      normal
    </span>
  );
}

function Dashboard({
  dataset,
  highlighted,
  activeTask,
  selectedValues,
  onSelect,
}: {
  dataset: Dataset;
  highlighted: boolean;
  activeTask: Task;
  selectedValues: string[];
  onSelect: (value: string) => void;
}) {
  const isClickable = (type: Task["targetType"]) => activeTask.targetType === type;
  const isSelected = (value: string) => selectedValues.includes(value);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Production Monitoring Dashboard</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Live system overview · production environment</p>
        </div>
        <div className="flex gap-2 text-xs text-slate-500">
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <Clock className="inline h-3 w-3" /> 10:42
          </div>
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <Filter className="inline h-3 w-3" /> 15m
          </div>
        </div>
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">System Overview</h3>
        <span className="text-xs text-slate-400">8 metrics</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {dataset.kpis.map(([label, value, status]) => (
          <button
            type="button"
            disabled={!isClickable("kpi")}
            onClick={() => onSelect(label)}
            key={label}
            className={`min-h-[82px] rounded-xl border p-3 text-left ${statusClasses(
              status,
              highlighted,
              isClickable("kpi") && isSelected(label),
              isClickable("kpi")
            )}`}
          >
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-1">
              <p
                className={`text-xl font-bold ${
                  highlighted && status === "critical"
                    ? "text-red-700"
                    : highlighted && status === "warning"
                      ? "text-amber-700"
                      : "text-slate-900"
                }`}
              >
                {value}
              </p>
              <StatusBadge status={status} highlighted={highlighted} />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-3">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Service Health</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Search className="h-3 w-3" /> 8 services
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Service", "Team", "CPU", "Avg Lat.", "P95", "Err.", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.services.map((s) => {
                  const status = s[6];
                  const name = s[0];
                  const clickable = isClickable("service");
                  const selected = clickable && isSelected(name);

                  return (
                    <tr
                      key={name}
                      onClick={() => clickable && onSelect(name)}
                      tabIndex={clickable ? 0 : -1}
                      className={`group border-t border-slate-100 ${
                        clickable ? "cursor-pointer hover:bg-blue-50" : ""
                      } ${
                        selected
                          ? "bg-blue-50 shadow-[inset_0_0_0_2px_rgb(37,99,235)]"
                          : highlighted && status === "critical"
                            ? "bg-red-50 text-red-900"
                            : highlighted && status === "warning"
                              ? "text-amber-800"
                              : "text-slate-700"
                      }`}
                    >
                      {s.slice(0, 6).map((v, i) => (
                        <td key={i} className={`whitespace-nowrap px-3 py-3 ${selected ? "font-semibold" : ""}`}>
                          {v}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <StatusBadge status={status} highlighted={highlighted} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900">Status History</p>
              <p className="text-[10px] text-slate-500">last 5 checks</p>
            </div>
            <div className="space-y-2">
              {dataset.history.map(([name, states]) => {
                const clickable = isClickable("history");
                const selected = clickable && isSelected(name);

                return (
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelect(name)}
                    key={name}
                    className={`grid w-full grid-cols-[120px_1fr] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] ${
                      clickable ? "cursor-pointer hover:bg-blue-50" : ""
                    } ${selected ? "bg-blue-50 shadow-[inset_0_0_0_2px_rgb(37,99,235)]" : ""}`}
                  >
                    <span className="truncate text-slate-600">{name}</span>
                    <span className="grid grid-cols-5 gap-1 rounded bg-white px-2 py-1">
                      {states.map((state, i) => (
                        <span
                          key={i}
                          className={`flex h-6 items-center justify-center rounded text-[9px] font-bold uppercase ${
                            highlighted && state === "critical"
                              ? "bg-red-100 text-red-700"
                              : highlighted && state === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {state === "critical" ? "C" : state === "warning" ? "W" : "N"}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-w-[320px] space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">SLA Risk</p>
              <span className="text-xs text-slate-400">error budget remaining</span>
            </div>
            <div className="space-y-2">
              {dataset.slaRisks.map(([name, budget, risk, status]) => {
                const clickable = isClickable("sla");
                const selected = clickable && isSelected(name);
                const budgetValue = parseInt(budget, 10);

                return (
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelect(name)}
                    key={name}
                    className={`w-full rounded-xl border p-3 text-left ${statusClasses(
                      status,
                      highlighted,
                      selected,
                      clickable
                    )}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">{name}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          highlighted && status === "critical"
                            ? "bg-red-100 text-red-700"
                            : highlighted && status === "warning"
                              ? "bg-white text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {risk} risk
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_42px] items-center gap-2">
                      <span className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className={`block h-full rounded-full ${
                            highlighted && status === "critical"
                              ? "bg-red-500"
                              : highlighted && status === "warning"
                                ? "bg-amber-400"
                                : "bg-slate-400"
                          }`}
                          style={{ width: `${Math.max(5, Math.min(100, budgetValue))}%` }}
                        />
                      </span>
                      <span className="text-right text-[11px] font-semibold text-slate-600">{budget}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Throughput Balance</p>
              <span className="text-xs text-slate-400">Input vs. Output</span>
            </div>

            <div className="mb-2 grid grid-cols-[76px_1fr_1fr_40px] gap-2 text-[10px] font-medium text-slate-400">
              <span>Stage</span>
              <span>Input</span>
              <span>Output</span>
              <span>Gap</span>
            </div>

            <div className="space-y-2">
              {dataset.throughput.map(([name, input, output, gap, status]) => {
                const clickable = isClickable("throughput");
                const selected = clickable && isSelected(name);
                const max = 1400;

                return (
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelect(name)}
                    key={name}
                    className={`grid w-full grid-cols-[76px_1fr_1fr_40px] items-center gap-2 rounded-xl border p-2 text-left ${statusClasses(
                      status,
                      highlighted,
                      selected,
                      clickable
                    )}`}
                  >
                    <span className="truncate text-[10px] font-semibold text-slate-900">{name}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-slate-400"
                        style={{ width: `${Math.min(100, (input / max) * 100)}%` }}
                      />
                    </span>
                    <span className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-slate-400"
                        style={{ width: `${Math.min(100, (output / max) * 100)}%` }}
                      />
                    </span>
                    <span
                      className={`text-right text-[11px] font-bold ${
                        highlighted && status === "critical"
                          ? "text-red-700"
                          : highlighted && status === "warning"
                            ? "text-amber-700"
                            : "text-slate-600"
                      }`}
                    >
                      {gap}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scale({
  value,
  onChange,
  max = 7,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-full border text-sm font-semibold ${
            value === n
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function scoreSelection(correct: string[], selected: string[]) {
  const correctSet = new Set(correct);
  const selectedSet = new Set(selected);
  const truePositives = selected.filter((x) => correctSet.has(x)).length;
  const falsePositives = selected.filter((x) => !correctSet.has(x)).length;
  const missed = correct.filter((x) => !selectedSet.has(x)).length;
  const exactMatch = falsePositives === 0 && missed === 0;
  const accuracy = correct.length ? truePositives / correct.length : 0;

  return { exactMatch, accuracy, truePositives, falsePositives, missed };
}

export default function DashboardStudyApp() {
  const [stage, setStage] = useState<
    "intro" | "training" | "tasks" | "questionnaire" | "between" | "qualitative" | "finish"
  >("intro");
  const [participantId, setParticipantId] = useState(`P-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [order, setOrder] = useState<Condition>(initialOrder);
  const [runIndex, setRunIndex] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);
  const [taskStartedAt, setTaskStartedAt] = useState<number | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [clicks, setClicks] = useState(0);
  const [questionnaire, setQuestionnaire] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ResultRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [qualitativeFeedback, setQualitativeFeedback] = useState("");
  const [dashboardExperience, setDashboardExperience] = useState("");
  const [visualizationExperience, setVisualizationExperience] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [colorVision, setColorVision] = useState("");

  const runs = useMemo(() => {
    const second: Condition = order === "baseline" ? "highlight" : "baseline";
    return [
      { condition: order, datasetKey: "A" as DatasetKey },
      { condition: second, datasetKey: "B" as DatasetKey },
    ];
  }, [order]);

  const activeRun = runs[runIndex];
  const dataset = datasets[activeRun.datasetKey];
  const highlighted = activeRun.condition === "highlight";
  const task = tasks[currentTask];

  function startRun() {
    setCurrentTask(0);
    setSelectedValues([]);
    setClicks(0);
    setQuestionnaire({});
    setTaskStartedAt(Date.now());
    setStage("tasks");
  }

  function handleSelect(value: string) {
    setClicks((c) => c + 1);

    if (task.multi) {
      setSelectedValues((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setSelectedValues([value]);
    }
  }

  function saveTaskAndNext() {
    const correct = dataset.answers[task.id];
    const score = scoreSelection(correct, selectedValues);
    const durationSec = taskStartedAt ? Math.round((Date.now() - taskStartedAt) / 1000) : 0;

    setResults((prev) => [
      ...prev,
      {
        participantId,
        run: runIndex + 1,
        condition: activeRun.condition,
        dataset: activeRun.datasetKey,
        recordType: "task",
        taskId: task.id,
        taskTitle: task.title,
        targetType: task.targetType,
        selected: selectedValues.join("; "),
        correctAnswer: correct.join("; "),
        durationSec,
        clicks,
        exactMatch: score.exactMatch,
        accuracy: score.accuracy,
        truePositives: score.truePositives,
        falsePositives: score.falsePositives,
        missed: score.missed,
      },
    ]);

    if (currentTask < tasks.length - 1) {
      setCurrentTask(currentTask + 1);
      setSelectedValues([]);
      setClicks(0);
      setTaskStartedAt(Date.now());
    } else {
      setStage("questionnaire");
    }
  }

  async function saveQuestionnaire() {
    const nasaPerformanceInverted = 8 - (questionnaire.nasaPerformance || 0);
    const rawNasaTlx =
      ((questionnaire.nasaMentalDemand || 0) +
        (questionnaire.nasaPhysicalDemand || 0) +
        (questionnaire.nasaTemporalDemand || 0) +
        nasaPerformanceInverted +
        (questionnaire.nasaEffort || 0) +
        (questionnaire.nasaFrustration || 0)) /
      6;

    const susScore =
      (((questionnaire.sus1 || 0) - 1) +
        (5 - (questionnaire.sus2 || 0)) +
        ((questionnaire.sus3 || 0) - 1) +
        (5 - (questionnaire.sus4 || 0)) +
        ((questionnaire.sus5 || 0) - 1) +
        (5 - (questionnaire.sus6 || 0)) +
        ((questionnaire.sus7 || 0) - 1) +
        (5 - (questionnaire.sus8 || 0)) +
        ((questionnaire.sus9 || 0) - 1) +
        (5 - (questionnaire.sus10 || 0))) *
      2.5;

    const questionnaireRow: ResultRow = {
      participantId,
      run: runIndex + 1,
      condition: activeRun.condition,
      dataset: activeRun.datasetKey,
      recordType: "questionnaire",
      ...questionnaire,
      nasaPerformanceInverted,
      rawNasaTlx,
      susScore,
    };

    const updatedResults = [...results, questionnaireRow];
    setResults(updatedResults);

    if (runIndex === 0) {
      setRunIndex(1);
      setStage("between");
    } else {
      setStage("qualitative");
    }
  }

  async function submitFinalData() {
    const finalRows: ResultRow[] = [
      ...results,
      {
        participantId,
        recordType: "backgroundAndFeedback",
        dashboardExperience,
        visualizationExperience,
        ageGroup,
        colorVision,
        feedback: qualitativeFeedback,
      },
    ];

    setSaveStatus("saving");
    setSaveError("");

    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          order,
          submittedAt: new Date().toISOString(),
          rows: finalRows,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    }

    setStage("finish");
  }

  function resetStudy() {
    setStage("intro");
    setParticipantId(`P-${Math.floor(Math.random() * 9000 + 1000)}`);
    setOrder(Math.random() < 0.5 ? "baseline" : "highlight");
    setRunIndex(0);
    setCurrentTask(0);
    setTaskStartedAt(null);
    setSelectedValues([]);
    setClicks(0);
    setQuestionnaire({});
    setResults([]);
    setSaveStatus("idle");
    setSaveError("");
    setQualitativeFeedback("");
    setDashboardExperience("");
    setVisualizationExperience("");
    setAgeGroup("");
    setColorVision("");
  }

  const allQuestionnaireAnswered = [
    ...nasaTlxItems,
    ...susItems,
    ...dashboardSpecificItems,
  ].every(([key]) => questionnaire[key]);

  if (stage === "intro") {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold">Studien-Setup</h1>
              <p className="mt-2 text-slate-500">Diese Seite wird von der Versuchsleitung ausgefüllt.</p>

              <div className="mt-6 grid gap-4 rounded-2xl bg-slate-100 p-4">
                <label className="text-sm font-semibold">
                  Teilnehmenden-ID
                  <input
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Reihenfolge
                  <select
                    value={order}
                    onChange={(e) => setOrder(e.target.value as Condition)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="baseline">Reihenfolge 1</option>
                    <option value="highlight">Reihenfolge 2</option>
                  </select>
                </label>
              </div>

              <Button onClick={() => setStage("training")} className="mt-6 rounded-2xl px-6 py-3">
                Weiter zur Einführung
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "training") {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold">Einführung</h1>
              <p className="mt-3 text-slate-600">
                Du siehst gleich zwei Monitoring-Dashboards. Deine Aufgabe ist es, bestimmte kritische
                Zustände oder auffällige Bereiche direkt im Dashboard auszuwählen.
              </p>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold">Ablauf</p>
                <p className="mt-2 text-sm text-slate-600">
                  Pro Dashboard bearbeitest du mehrere kurze Aufgaben. Manchmal wählst du genau ein
                  Element aus, manchmal mehrere. Nach jedem Dashboard beantwortest du einen kurzen
                  Fragebogen zur wahrgenommenen Belastung.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold">Hinweis</p>
                <p className="mt-2 text-sm text-slate-600">
                  Bitte arbeite zügig, aber sorgfältig. Es wird nicht deine persönliche Leistung bewertet,
                  sondern wie verständlich die Dashboard-Darstellung ist.
                </p>
              </div>

              <Button onClick={startRun} className="mt-6 rounded-2xl px-6 py-3">
                <Play className="mr-2 h-4 w-4" />
                Studie starten
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "tasks") {
    return (
      <div className="min-h-screen bg-white p-5 text-slate-900">
        <div className="mx-auto max-w-[1450px]">
          <div className="fixed left-5 right-5 top-5 z-10 mx-auto max-w-[1450px] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Durchlauf {runIndex + 1}/2 · Aufgabe {currentTask + 1}/{tasks.length}
                </p>
                <h1 className="mt-1 text-2xl font-bold">{task.title}</h1>
                <p className="mt-1 text-slate-600">{task.instruction}</p>
                {task.id === "priorityService" && (
                  <p className="mt-1 text-xs text-slate-500">Prioritätsregel: {dataset.priorityRule}</p>
                )}
                {task.id === "multiMetricServices" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Grenzwerte: P95-Latenz &gt; 1.5 s und Error Rate &gt; 2%.
                  </p>
                )}
                {task.multi && (
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    Mehrfachauswahl aktiv: {selectedValues.length} ausgewählt.
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={saveTaskAndNext}
                  disabled={selectedValues.length === 0}
                  className="rounded-2xl px-5"
                >
                  Antwort bestätigen
                </Button>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="mb-4 min-h-[150px]" />

          <Dashboard
            dataset={dataset}
            highlighted={highlighted}
            activeTask={task}
            selectedValues={selectedValues}
            onSelect={handleSelect}
          />
        </div>
      </div>
    );
  }

  if (stage === "questionnaire") {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold">Fragebogen nach Durchlauf {runIndex + 1}</h1>
              <p className="mt-2 text-slate-600">Bitte beantworte die folgenden Fragen zu dem gerade bearbeiteten Dashboard.</p>

              <div className="mt-6 space-y-8">
                <section>
                  <h2 className="text-lg font-bold">Raw NASA-TLX</h2>
                  <p className="mt-1 text-sm text-slate-500">Skala: 1 bis 7</p>
                  <div className="mt-3 space-y-5">
                    {nasaTlxItems.map(([key, label, hint]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold">{label}</p>
                        <p className="mb-3 mt-1 text-sm text-slate-500">{hint}</p>
                        <Scale
                          value={questionnaire[key]}
                          onChange={(v) => setQuestionnaire((prev) => ({ ...prev, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold">System Usability Scale (SUS)</h2>
                  <p className="mt-1 text-sm text-slate-500">Skala: 1 = stimme überhaupt nicht zu, 5 = stimme voll zu</p>
                  <div className="mt-3 space-y-5">
                    {susItems.map(([key, label, hint]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold">{label}</p>
                        <p className="mb-3 mt-1 text-sm text-slate-500">{hint}</p>
                        <Scale
                          max={5}
                          value={questionnaire[key]}
                          onChange={(v) => setQuestionnaire((prev) => ({ ...prev, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold">Dashboard-spezifische Fragen</h2>
                  <p className="mt-1 text-sm text-slate-500">Skala: 1 bis 7</p>
                  <div className="mt-3 space-y-5">
                    {dashboardSpecificItems.map(([key, label, hint]) => (
                      <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold">{label}</p>
                        <p className="mb-3 mt-1 text-sm text-slate-500">{hint}</p>
                        <Scale
                          value={questionnaire[key]}
                          onChange={(v) => setQuestionnaire((prev) => ({ ...prev, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <Button
                onClick={saveQuestionnaire}
                disabled={!allQuestionnaireAnswered}
                className="mt-6 rounded-2xl px-6 py-3"
              >
                Fragebogen speichern
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "between") {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold">Durchlauf 1 abgeschlossen</h1>
              <p className="mt-3 text-slate-600">
                Nun folgt der zweite Durchlauf mit einem vergleichbaren, aber anderen Dashboard-Szenario.
              </p>
              <Button onClick={startRun} className="mt-6 rounded-2xl px-6 py-3">
                Durchlauf 2 starten
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "qualitative") {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold">Abschlussfragen</h1>
              <p className="mt-3 text-slate-600">Bitte beantworte zum Abschluss noch kurz die folgenden Fragen.</p>

              <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="text-sm font-semibold">
                  Wie viel Erfahrung hast du mit Monitoring-Dashboards oder ähnlichen Daten-Dashboards?
                  <select
                    value={dashboardExperience}
                    onChange={(e) => setDashboardExperience(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="1">1 = keine Erfahrung</option>
                    <option value="2">2 = wenig Erfahrung</option>
                    <option value="3">3 = etwas Erfahrung</option>
                    <option value="4">4 = viel Erfahrung</option>
                    <option value="5">5 = sehr viel Erfahrung</option>
                  </select>
                </label>

                <label className="text-sm font-semibold">
                  Wie vertraut bist du mit der Interpretation von Tabellen, Kennzahlen und Datenvisualisierungen?
                  <select
                    value={visualizationExperience}
                    onChange={(e) => setVisualizationExperience(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="1">1 = gar nicht vertraut</option>
                    <option value="2">2 = wenig vertraut</option>
                    <option value="3">3 = etwas vertraut</option>
                    <option value="4">4 = vertraut</option>
                    <option value="5">5 = sehr vertraut</option>
                  </select>
                </label>

                <label className="text-sm font-semibold">
                  Altersgruppe
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="under18">unter 18</option>
                    <option value="18-24">18–24</option>
                    <option value="25-34">25–34</option>
                    <option value="35-44">35–44</option>
                    <option value="45plus">45+</option>
                    <option value="noAnswer">keine Angabe</option>
                  </select>
                </label>

                <label className="text-sm font-semibold">
                  Hast du bekannte Schwierigkeiten bei der Farbwahrnehmung?
                  <select
                    value={colorVision}
                    onChange={(e) => setColorVision(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="no">Nein</option>
                    <option value="yes">Ja</option>
                    <option value="unsure">Unsicher</option>
                    <option value="noAnswer">keine Angabe</option>
                  </select>
                </label>
              </div>

              <label className="mt-6 block text-sm font-semibold">
                Was hat dir beim Erkennen kritischer Zustände geholfen oder dich gestört?
                <textarea
                  value={qualitativeFeedback}
                  onChange={(e) => setQualitativeFeedback(e.target.value)}
                  className="mt-2 h-32 w-full rounded-2xl border border-slate-300 p-3"
                  placeholder="Kurze Antwort genügt."
                />
              </label>

              <Button
                onClick={submitFinalData}
                disabled={!dashboardExperience || !visualizationExperience || !ageGroup || !colorVision}
                className="mt-6 rounded-2xl px-6 py-3"
              >
                Antwort speichern und Studie abschließen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Card className="rounded-3xl">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold">Vielen Dank!</h1>
            <p className="mt-3 text-slate-600">Die Studie ist abgeschlossen.</p>

            {saveStatus === "saved" && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Die Studiendaten wurden automatisch gespeichert.
              </div>
            )}

            {saveStatus === "error" && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Die Daten konnten nicht automatisch gespeichert werden. Bitte prüfe, ob der lokale Python-Server läuft.
                Fehler: {saveError}
              </div>
            )}

            <Button onClick={resetStudy} className="mt-6 rounded-2xl px-6 py-3">
              Zurück zur Startansicht
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
