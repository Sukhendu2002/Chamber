import { IconArrowsExchange } from "@tabler/icons-react";

import { DataTransferWorkspace } from "@/components/data-transfer-workspace";
import { PageHeader, PageShell } from "@/components/page-shell";
import { getDataTransferContext } from "@/lib/actions/data-transfer";

export default async function ImportPage() {
  const context = await getDataTransferContext();

  return (
    <PageShell>
      <PageHeader
        title="Data transfer"
        description="Portable exports, encrypted backups, and validated expense imports"
        icon={IconArrowsExchange}
      />
      <DataTransferWorkspace context={context} />
    </PageShell>
  );
}
