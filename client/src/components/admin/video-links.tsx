import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Link } from "wouter";
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Lock,
  VideoOff, ExternalLink, Clock, Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type IssueStatus =
  | "embed_disabled" | "deleted" | "private"
  | "unplayable" | "unreachable" | "not_youtube";

interface VideoLinkIssue {
  courseSlug: string;
  courseTitle: string;
  moduleIndex: number;
  moduleTitle: string;
  videoIndex: number;
  videoTitle: string;
  url: string;
  videoId?: string;
  status: IssueStatus;
  detail: string;
}

interface VideoLinkReport {
  runAt: string | null;
  totalVideoSlots: number;
  uniqueVideos: number;
  brokenSlots: number;
  newlyBroken: number;
  durationMs: number;
  issues: VideoLinkIssue[];
  message?: string;
}

/**
 * How each failure reads to an admin. `blocking` marks the failures that stop a
 * student dead — the video will not play, so the module can never complete.
 * `unreachable` is deliberately softer: it is usually a transient network
 * hiccup during the scan rather than evidence the video is gone.
 */
const STATUS_META: Record<IssueStatus, {
  label: string; hint: string; icon: typeof XCircle; className: string; blocking: boolean;
}> = {
  deleted: {
    label: "Deleted", hint: "Removed from YouTube — needs replacing",
    icon: XCircle, className: "bg-red-50 text-red-700 ring-red-600/20", blocking: true,
  },
  private: {
    label: "Private", hint: "Owner restricted access — needs replacing",
    icon: Lock, className: "bg-red-50 text-red-700 ring-red-600/20", blocking: true,
  },
  unplayable: {
    label: "Unplayable", hint: "YouTube refuses playback — needs replacing",
    icon: XCircle, className: "bg-red-50 text-red-700 ring-red-600/20", blocking: true,
  },
  embed_disabled: {
    label: "Embedding blocked", hint: "Plays on YouTube but never inside the LMS",
    icon: VideoOff, className: "bg-amber-50 text-amber-800 ring-amber-600/20", blocking: true,
  },
  not_youtube: {
    label: "Bad link", hint: "Missing or unrecognised video URL",
    icon: AlertTriangle, className: "bg-amber-50 text-amber-800 ring-amber-600/20", blocking: true,
  },
  unreachable: {
    label: "Check failed", hint: "Could not reach YouTube — may be a temporary network error",
    icon: AlertTriangle, className: "bg-slate-100 text-slate-700 ring-slate-500/20", blocking: false,
  },
};

function authHeaders(): HeadersInit | undefined {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function StatCard({ label, value, tone = "default", sub }: {
  label: string; value: string | number; tone?: "default" | "good" | "bad"; sub?: string;
}) {
  const valueTone =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-slate-800";
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${valueTone}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function VideoLinksComponent() {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);

  const { data, isLoading, refetch } = useQuery<VideoLinkReport>({
    queryKey: ["/api/admin/video-links"],
    queryFn: async () => {
      const res = await fetch("/api/admin/video-links", {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load the video health report");
      return res.json();
    },
    // While a scan is running the report is stale by definition, so poll for
    // the new one instead of making the admin hit refresh.
    refetchInterval: scanning ? 5000 : false,
  });

  const startedAt = data?.runAt ?? null;

  const scan = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/video-links/scan", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Could not start the scan");
      return res.json();
    },
    onSuccess: () => {
      setScanning(true);
      toast({
        title: "Scan started",
        description: "Checking every course video against YouTube. This takes about 30 seconds.",
      });
      // Stop polling once a newer report lands, or after a generous ceiling so
      // a failed scan never leaves the page polling forever.
      const started = Date.now();
      const poll = setInterval(async () => {
        const fresh = await refetch();
        const isNewer = fresh.data?.runAt && fresh.data.runAt !== startedAt;
        if (isNewer || Date.now() - started > 5 * 60 * 1000) {
          clearInterval(poll);
          setScanning(false);
          if (isNewer) {
            toast({
              title: "Scan complete",
              description: `${fresh.data!.brokenSlots} broken video${fresh.data!.brokenSlots === 1 ? "" : "s"} found.`,
            });
          }
        }
      }, 5000);
    },
    onError: (err: Error) => {
      setScanning(false);
      toast({ title: "Scan failed to start", description: err.message, variant: "destructive" });
    },
  });

  const issues = data?.issues ?? [];
  const byCourse = issues.reduce<Record<string, VideoLinkIssue[]>>((acc, issue) => {
    const key = issue.courseTitle || issue.courseSlug;
    return { ...acc, [key]: [...(acc[key] ?? []), issue] };
  }, {});
  const blockingCount = issues.filter((i) => STATUS_META[i.status].blocking).length;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Course Video Health</h1>
          <p className="text-sm text-slate-500 mt-1">
            Course videos are hosted on YouTube channels we do not control. Owners can delete a
            video, make it private, or switch off embedding at any time — and a video that will not
            play freezes every affected student&apos;s module progress. This scans them all nightly.
          </p>
        </div>
        <Button onClick={() => scan.mutate()} disabled={scanning || scan.isPending} className="shrink-0">
          {scanning || scan.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning…</>
            : <><RefreshCw className="mr-2 h-4 w-4" />Run scan now</>}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : !data?.runAt ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No scan has run yet</p>
            <p className="text-sm text-slate-500 mt-1">
              The first automatic scan runs tonight at 02:30, or start one now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Videos checked" value={data.uniqueVideos}
                      sub={`across ${data.totalVideoSlots} slots`} />
            <StatCard label="Broken" value={data.brokenSlots}
                      tone={data.brokenSlots > 0 ? "bad" : "good"}
                      sub={blockingCount > 0 ? `${blockingCount} blocking students` : "nothing blocking"} />
            <StatCard label="New since last scan" value={data.newlyBroken}
                      tone={data.newlyBroken > 0 ? "bad" : "default"} />
            <StatCard label="Last scan"
                      value={formatDistanceToNow(new Date(data.runAt), { addSuffix: true })}
                      sub={`${format(new Date(data.runAt), "d MMM yyyy, HH:mm")} · took ${(data.durationMs / 1000).toFixed(0)}s`} />
          </div>

          {issues.length === 0 ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <p className="mt-3 text-lg font-semibold text-emerald-900">
                  Every course video is playable
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  All {data.uniqueVideos} videos load and embed correctly. No student is blocked.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(byCourse).map(([course, courseIssues]) => (
                <Card key={course}>
                  <CardContent className="pt-6">
                    <div className="flex items-baseline justify-between gap-3 mb-4">
                      <h2 className="font-semibold text-slate-800">{course}</h2>
                      <span className="text-xs text-slate-500 shrink-0">
                        {courseIssues.length} broken video{courseIssues.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100">
                      {courseIssues.map((issue) => {
                        const meta = STATUS_META[issue.status];
                        const Icon = meta.icon;
                        return (
                          <li
                            key={`${issue.courseSlug}-${issue.moduleIndex}-${issue.videoIndex}`}
                            className="py-4 flex flex-col md:flex-row md:items-start gap-3"
                          >
                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.className}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {meta.label}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800">
                                {issue.moduleTitle}
                                <span className="text-slate-400 font-normal">
                                  {" "}· video {issue.videoIndex + 1}
                                </span>
                              </p>
                              <p className="text-sm text-slate-600 truncate">
                                {issue.videoTitle || "(untitled)"}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">{meta.hint}</p>
                              {issue.url && (
                                <a
                                  href={issue.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline break-all"
                                >
                                  {issue.url}
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              )}
                            </div>

                            <Link href={`/admin/courses/edit/${issue.courseSlug}`}>
                              <Button variant="outline" size="sm" className="shrink-0">
                                Fix in course editor
                              </Button>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
