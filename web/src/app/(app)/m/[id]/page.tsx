import { ModuleRuntime } from "@/components/module-runtime/runtime";

export default async function ModuleRuntimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ModuleRuntime moduleId={id} />;
}
