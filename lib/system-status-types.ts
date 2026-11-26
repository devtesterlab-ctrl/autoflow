export type Light = "ok" | "warn" | "error" | "off";

export interface CheckResult {
  id: string;
  group: string;
  label: string;
  status: Light;
  summary: string;
  hint?: string;
  latencyMs?: number;
}

export interface SystemStatus {
  checkedAt: string;
  overall: Light;
  groups: string[];
  checks: CheckResult[];
}

export interface UploadTestStep {
  label: string;
  ok: boolean;
  detail: string;
}

export interface UploadTestResult {
  ok: boolean;
  steps: UploadTestStep[];
  hint?: string;
}

export const LIGHT_LABEL: Record<Light, string> = {
  ok: "OK",
  warn: "Atención",
  error: "Error",
  off: "Sin configurar",
};

const RANK: Record<Light, number> = { off: 0, ok: 1, warn: 2, error: 3 };

/** El peor estado de una lista. Los "sin configurar" no cuentan salvo que no haya nada más. */
export function worstLight(lights: Light[]): Light {
  const active = lights.filter((light) => light !== "off");
  if (active.length === 0) return "off";
  return active.reduce((worst, light) => (RANK[light] > RANK[worst] ? light : worst), "ok" as Light);
}
