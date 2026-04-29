import { UIDefinition, UIRow, UIBlock, BlockSpan, ComponentType } from '@/types/ui-builder';
import { SchemaField, FieldType } from '@/services/modules.service';

// ── Default component per field type ─────────────────────────────────────────

export function defaultComponent(type: FieldType, options?: string[]): ComponentType {
  switch (type) {
    case 'text':
    case 'string':   return 'text_input';
    case 'number':   return 'number_input';
    case 'counter':  return 'counter_stepper';
    case 'boolean':  return 'boolean_toggle';
    case 'date':     return 'date_picker';
    case 'datetime': return 'datetime_picker';
    case 'select':   return (options?.length ?? 0) > 5 ? 'select_dropdown' : 'select_chips';
    default:         return 'text_input';
  }
}

// ── Default layout generator ──────────────────────────────────────────────────

export function generateDefaultLayout(
  schema: SchemaField[],
  moduleName = 'Entry Details',
): UIDefinition {
  let n = 0;
  const uid = (prefix: string) => `${prefix}_${++n}`;

  const makeField = (f: SchemaField): UIBlock => ({
    type: 'field_input',
    field_key: f.key,
    component: defaultComponent(
      f.type as FieldType,
      f.config?.options,
    ),
    label: f.label,
    show_label: true,
    placeholder: '',
  });

  const singleRow = (block: UIBlock): UIRow => ({
    id: uid('row'),
    columns: [{ id: uid('col'), span: 12, block }],
  });

  const pairRow = (a: UIBlock, b: UIBlock): UIRow => ({
    id: uid('row'),
    columns: [
      { id: uid('col'), span: 6, block: a },
      { id: uid('col'), span: 6, block: b },
    ],
  });

  const rows: UIRow[] = [
    // Section header always first
    singleRow({ type: 'section_header', title: moduleName, subtitle: 'Fill in the details below' }),
  ];

  let i = 0;
  while (i < schema.length) {
    const f = schema[i];
    const next = schema[i + 1];
    const fType = f.type as FieldType;

    // select / counter → always full-width
    if (fType === 'select' || fType === 'counter') {
      rows.push(singleRow(makeField(f)));
      i++;
      continue;
    }

    // boolean: pair two consecutive booleans
    if (fType === 'boolean' && next?.type === 'boolean') {
      rows.push(pairRow(makeField(f), makeField(next)));
      i += 2;
      continue;
    }

    // date/datetime: pair with a non-date/select/counter neighbour
    if (fType === 'date' || fType === 'datetime') {
      const nextType = next?.type as FieldType | undefined;
      if (next && nextType !== 'date' && nextType !== 'datetime' && nextType !== 'select' && nextType !== 'counter') {
        rows.push(pairRow(makeField(f), makeField(next)));
        i += 2;
        continue;
      }
      rows.push(singleRow(makeField(f)));
      i++;
      continue;
    }

    // text/number: pair with the following date field if present
    if (next?.type === 'date' || next?.type === 'datetime') {
      rows.push(pairRow(makeField(f), makeField(next)));
      i += 2;
      continue;
    }

    // default: full-width
    rows.push(singleRow(makeField(f)));
    i++;
  }

  // Save button always last
  rows.push(singleRow({ type: 'save_button', label: 'Save' }));

  return { version: '1.0', rows };
}
