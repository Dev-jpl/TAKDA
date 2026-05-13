import { ModuleCreatorWorkspace } from "@/components/module-creator/workspace";

export default async function ModuleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ModuleCreatorWorkspace moduleId={id} />;
}
