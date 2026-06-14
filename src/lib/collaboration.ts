import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { CloudSettings } from "@/types/editor";

export interface CollaboratorPresence {
  id: string;
  name: string;
  onlineAt: number;
}

export interface ProjectUpdateBroadcast {
  projectId: string;
  updatedAt: number;
  editorName: string;
}

function getClient(settings: CloudSettings) {
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey);
}

function channelName(syncKey: string, projectId: string): string {
  return `vibe-collab:${syncKey}:${projectId}`;
}

export function createCollaborationChannel(
  settings: CloudSettings,
  projectId: string
): RealtimeChannel {
  const client = getClient(settings);
  const displayName = settings.displayName?.trim() || "Editor";
  const presenceKey = `${displayName}-${Math.random().toString(36).slice(2, 7)}`;

  return client.channel(channelName(settings.syncKey, projectId), {
    config: {
      presence: { key: presenceKey },
    },
  });
}

export function subscribeCollaboration(
  channel: RealtimeChannel,
  displayName: string,
  handlers: {
    onPresence: (collaborators: CollaboratorPresence[]) => void;
    onProjectUpdate: (update: ProjectUpdateBroadcast) => void;
  }
): RealtimeChannel {
  const name = displayName.trim() || "Editor";

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{
        name?: string;
        online_at?: string;
      }>();
      const collaborators: CollaboratorPresence[] = [];

      for (const presences of Object.values(state)) {
        for (const p of presences) {
          collaborators.push({
            id: p.name ?? "unknown",
            name: p.name ?? "Editor",
            onlineAt: p.online_at
              ? new Date(p.online_at).getTime()
              : Date.now(),
          });
        }
      }

      handlers.onPresence(collaborators);
    })
    .on("broadcast", { event: "project-update" }, ({ payload }) => {
      const update = payload as ProjectUpdateBroadcast;
      if (update?.projectId && update?.updatedAt) {
        handlers.onProjectUpdate(update);
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          name,
          online_at: new Date().toISOString(),
        });
      }
    });

  return channel;
}

export async function broadcastProjectUpdate(
  channel: RealtimeChannel,
  update: ProjectUpdateBroadcast
): Promise<void> {
  await channel.send({
    type: "broadcast",
    event: "project-update",
    payload: update,
  });
}

export function unsubscribeCollaboration(channel: RealtimeChannel): void {
  channel.unsubscribe();
}