export const demoSnapshotSchema = "lss-demo-snapshot";
export const demoSnapshotVersion = 2;

const arrayFields = [
  "academicStages",
  "classDefinitions",
  "roomDefinitions",
  "classes",
  "rooms",
  "groups",
  "students",
  "paymentRecords",
  "billingRuns",
  "paymentRuleVersions",
] as const;

type JsonObject = Record<string, unknown>;

export type DemoSnapshotEnvelope<T extends JsonObject = JsonObject> = {
  schema: typeof demoSnapshotSchema;
  version: typeof demoSnapshotVersion;
  exportedAt: string;
  data: T;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDemoState(value: unknown): asserts value is JsonObject {
  if (!isObject(value)) {
    throw new Error("O ficheiro não contém um estado válido do sistema.");
  }

  const hasKnownField =
    arrayFields.some((field) => field in value) || "paymentSettings" in value;

  if (!hasKnownField) {
    throw new Error("O ficheiro não contém dados reconhecidos do LSS.");
  }

  for (const field of arrayFields) {
    if (field in value && !Array.isArray(value[field])) {
      throw new Error(`O campo ${field} deve ser uma lista.`);
    }
  }

  if (
    "paymentSettings" in value &&
    value.paymentSettings !== undefined &&
    !isObject(value.paymentSettings)
  ) {
    throw new Error("As configurações de pagamento são inválidas.");
  }
}

export function createDemoSnapshot<T extends JsonObject>(
  data: T,
  exportedAt = new Date().toISOString(),
): DemoSnapshotEnvelope<T> {
  validateDemoState(data);

  return {
    schema: demoSnapshotSchema,
    version: demoSnapshotVersion,
    exportedAt,
    data,
  };
}

export function parseDemoSnapshot(raw: string): JsonObject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("O ficheiro não contém JSON válido.");
  }

  if (
    isObject(parsed) &&
    ("schema" in parsed || "version" in parsed || "data" in parsed)
  ) {
    if (
      parsed.schema !== demoSnapshotSchema ||
      parsed.version !== demoSnapshotVersion ||
      !isObject(parsed.data)
    ) {
      throw new Error("A versão desta exportação não é suportada.");
    }

    validateDemoState(parsed.data);
    return parsed.data;
  }

  // Compatibilidade deliberada com o estado local anterior à especificação v2.
  validateDemoState(parsed);
  return parsed;
}

export function serializeDemoSnapshot<T extends JsonObject>(
  data: T,
  exportedAt?: string,
) {
  return JSON.stringify(createDemoSnapshot(data, exportedAt), null, 2);
}
