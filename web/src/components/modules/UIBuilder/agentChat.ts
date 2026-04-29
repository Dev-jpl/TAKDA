import { API_URL } from '@/services/apiConfig';
import { UIDefinition } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';

export async function callUIBuilderAgent(params: {
  message:           string;
  currentDefinition: UIDefinition;
  schema:            SchemaField[];
  assistantName:     string;
  brandColor?:       string;
}): Promise<{ description: string; newDefinition: UIDefinition }> {
  const { message, currentDefinition, schema, assistantName } = params;

  const res = await fetch(`${API_URL}/aly/ui-assist`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      current_definition: currentDefinition,
      schema_fields: schema.map(f => ({
        key:      f.key,
        label:    f.label,
        type:     f.type,
        required: f.required,
        options:  f.config?.options,
      })),
      assistant_name: assistantName,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'AI assistant is unavailable. Try again later.');
  }

  const data = await res.json() as { description: string; new_definition: UIDefinition };

  if (!data.new_definition?.rows) {
    throw new Error('Agent returned an invalid layout. Try rephrasing your request.');
  }

  return { description: data.description, newDefinition: data.new_definition };
}
