import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { DataTable } from "@/components/ui/data-table";
import type { VpnWireguardPeer } from "@/services/vpn-provision-api";

const columns: ColumnDef<VpnWireguardPeer>[] = [
  {
    accessorKey: "allowed_ip",
    header: "Allowed IP",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("allowed_ip")}</span>
    ),
  },
  {
    accessorKey: "public_key",
    header: "Public key",
    cell: ({ row }) => {
      const key = String(row.getValue("public_key") ?? "");
      const short =
        key.length > 20 ? `${key.slice(0, 10)}…${key.slice(-8)}` : key;
      return (
        <span className="font-mono text-xs" title={key}>
          {short}
        </span>
      );
    },
  },
];

interface VpnPeersTableProps {
  data: VpnWireguardPeer[];
  isLoading?: boolean;
}

export default function VpnPeersTable({ data, isLoading }: VpnPeersTableProps) {
  const memoColumns = useMemo(() => columns, []);

  return (
    <DataTable<VpnWireguardPeer>
      columns={memoColumns}
      data={data}
      rangeLabel="peers"
      isLoading={isLoading}
    />
  );
}
