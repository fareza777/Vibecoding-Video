"use client";

import { CloudDownload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CollaboratorPresence } from "@/lib/collaboration";

interface CollaborationBarProps {
  enabled: boolean;
  collaborators: CollaboratorPresence[];
  remoteUpdatedAt: number | null;
  onPullUpdates: () => void;
  pulling?: boolean;
}

export function CollaborationBar({
  enabled,
  collaborators,
  remoteUpdatedAt,
  onPullUpdates,
  pulling = false,
}: CollaborationBarProps) {
  if (!enabled) return null;

  const uniqueNames = [...new Set(collaborators.map((c) => c.name))];

  return (
    <div className="flex h-8 items-center justify-between border-b border-border bg-surface-elevated/50 px-4 shrink-0">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>
          {uniqueNames.length > 0
            ? `${uniqueNames.length} editor online: ${uniqueNames.join(", ")}`
            : "Collaboration aktif — share sync key dengan tim"}
        </span>
      </div>

      {remoteUpdatedAt && (
        <Button
          variant="secondary"
          size="sm"
          className={cn("h-6 text-[10px] gap-1.5", pulling && "opacity-70")}
          onClick={onPullUpdates}
          disabled={pulling}
        >
          <CloudDownload className="h-3 w-3" />
          Pull updates ({new Date(remoteUpdatedAt).toLocaleTimeString()})
        </Button>
      )}
    </div>
  );
}