import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TEST_ACCOUNTS, type TestAccount, type TestRole } from "./testAccounts";

const W = 1000;
const H = 660;
const NODE_W = 210;
const NODE_H = 118;
const CAREGIVER_TOP = 12;
const TARGET_TOP = 196;
const ORPHAN_GAP = 128;
const CLUSTER_X0 = 150;
const CLUSTER_X_STEP = 230;
const ORPHAN_CX = 868;

const ROLE_BADGE_CLASS: Record<TestRole, string> = {
  admin: "bg-gold/15 text-gold border-gold/30",
  freebrainer: "bg-success/10 text-success border-success/30",
  caregiver: "bg-info/10 text-info border-info/30",
};

type NodeKind = "caregiver" | "freebrainer" | "managed";

interface OrgNode {
  id: string;
  kind: NodeKind;
  email: string | null;
  name: string | null;
  onboarding: boolean | null;
  x: number;
  y: number;
  dim?: boolean;
  caption?: { kind: "linked" | "managed" | "none"; target?: string };
}

interface OrgEdge {
  from: string;
  to: string;
  kind: "linked" | "managed";
  x: number;
  y1: number;
  y2: number;
}

function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function OnboardingBadge({ onboarding }: { onboarding: boolean | null }) {
  const { t } = useTranslation();
  if (onboarding === true) {
    return <Badge variant="secondary">{t("adminAccounts.onboardingCompleted")}</Badge>;
  }
  if (onboarding === false) {
    return <Badge variant="destructive">{t("adminAccounts.onboardingPending")}</Badge>;
  }
  return <Badge variant="outline">{t("adminAccounts.onboardingUnknown")}</Badge>;
}

function AdminBand({ account }: { account: TestAccount }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-gold/40 bg-gold/5 p-4 sm:flex-row sm:items-center">
      <Shield className="h-6 w-6 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <p className="break-all font-semibold">{account.email}</p>
        <p className="text-sm text-muted-foreground">{t("adminAccounts.adminNote")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-gold/15 text-gold border-gold/30">{t("adminAccounts.roles.admin")}</Badge>
        <OnboardingBadge onboarding={account.onboarding} />
      </div>
    </div>
  );
}

function OrgNodeCard({ node }: { node: OrgNode }) {
  const { t } = useTranslation();
  const ringClass =
    node.kind === "caregiver"
      ? "border-info/40"
      : node.kind === "freebrainer"
        ? "border-success/40"
        : "border-dashed border-info/40";
  const badgeClass =
    node.kind === "caregiver"
      ? ROLE_BADGE_CLASS.caregiver
      : node.kind === "freebrainer"
        ? ROLE_BADGE_CLASS.freebrainer
        : "bg-info/10 text-info border-info/30";
  const badgeLabel =
    node.kind === "caregiver"
      ? t("adminAccounts.roles.caregiver")
      : node.kind === "freebrainer"
        ? t("adminAccounts.roles.freebrainer")
        : t("adminAccounts.managedFreebrainer");

  return (
    <div
      className={`absolute rounded-xl border-2 bg-card p-3 text-center shadow-sm ${ringClass} ${node.dim ? "opacity-70" : ""}`}
      style={{
        left: pct(node.x, W),
        top: pct(node.y, H),
        width: pct(NODE_W, W),
      }}
    >
      <div className="flex justify-center">
        <Badge className={badgeClass}>{badgeLabel}</Badge>
      </div>
      <p className="mt-2 break-all text-sm font-semibold leading-snug text-foreground">
        {node.email ?? node.name}
      </p>
      {node.email && node.name && (
        <p className="mt-0.5 break-all text-xs text-muted-foreground">{node.name}</p>
      )}
      {!node.email && <p className="mt-0.5 text-xs italic text-muted-foreground">{t("adminAccounts.noLoginHint")}</p>}
      <div className="mt-2 flex justify-center">
        <OnboardingBadge onboarding={node.onboarding} />
      </div>
      {node.caption && node.caption.kind !== "none" && (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t(`adminAccounts.${node.caption.kind}`)}</span>{" "}
          {node.caption.target}
        </p>
      )}
      {node.caption?.kind === "none" && (
        <p className="mt-2 text-xs italic text-muted-foreground">{t("adminAccounts.noRelationship")}</p>
      )}
    </div>
  );
}

function OrgChart({ nodes, edges }: { nodes: OrgNode[]; edges: OrgEdge[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}`, maxWidth: 1100, margin: "0 auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <marker
              id="arrow-success"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--success))" />
            </marker>
            <marker
              id="arrow-info"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--info))" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const isManaged = edge.kind === "managed";
            return (
              <line
                key={`${edge.from}:${edge.to}`}
                x1={edge.x}
                y1={edge.y1}
                x2={edge.x}
                y2={edge.y2}
                stroke={isManaged ? "hsl(var(--info))" : "hsl(var(--success))"}
                strokeWidth={3}
                markerEnd={isManaged ? "url(#arrow-info)" : "url(#arrow-success)"}
              />
            );
          })}
        </svg>
        {nodes.map((node) => (
          <OrgNodeCard key={node.id} node={node} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 rounded bg-success" /> {t("adminAccounts.legendLinked")}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 rounded bg-info" /> {t("adminAccounts.legendManaged")}
        </span>
      </div>
    </div>
  );
}

/** Admin-only org chart of the test accounts (static snapshot). */
export function TestAccountsPanel() {
  const { t } = useTranslation();

  const admin = TEST_ACCOUNTS.find((account) => account.role === "admin");
  const caregivers = TEST_ACCOUNTS.filter((account) => account.role === "caregiver");
  const byEmail = new Map(TEST_ACCOUNTS.map((account) => [account.email, account]));

  const managedNodes: OrgNode[] = [];
  const clusters: { parentId: string; childId: string; kind: "linked" | "managed" }[] = [];
  const orphanIds: string[] = [];

  for (const caregiver of caregivers) {
    const linked = caregiver.links.find((link) => link.kind === "linked" && link.email);
    const managed = caregiver.links.find((link) => link.kind === "managed");
    if (linked && linked.email && byEmail.has(linked.email) && linked.email !== caregiver.email) {
      clusters.push({ parentId: caregiver.email, childId: linked.email, kind: "linked" });
    } else if (managed) {
      const managedId = `managed:${managed.name}`;
      managedNodes.push({
        id: managedId,
        kind: "managed",
        email: null,
        name: managed.name,
        onboarding: null,
        x: 0,
        y: 0,
      });
      clusters.push({ parentId: caregiver.email, childId: managedId, kind: "managed" });
    } else {
      orphanIds.push(caregiver.email);
    }
  }

  const nodes: OrgNode[] = [];
  const edges: OrgEdge[] = [];

  clusters.forEach((cluster, index) => {
    const cx = CLUSTER_X0 + index * CLUSTER_X_STEP;
    const parent = byEmail.get(cluster.parentId);
    if (!parent) return;
    nodes.push({
      id: parent.email,
      kind: "caregiver",
      email: parent.email,
      name: parent.name,
      onboarding: parent.onboarding,
      x: cx - NODE_W / 2,
      y: CAREGIVER_TOP,
      caption: {
        kind: cluster.kind,
        target: cluster.kind === "linked" ? byEmail.get(cluster.childId)?.email ?? cluster.childId : cluster.childId,
      },
    });
    const isManagedChild = cluster.kind === "managed";
    let childNode: OrgNode | undefined;
    if (isManagedChild) {
      const managed = managedNodes.find((node) => node.id === cluster.childId);
      if (managed) childNode = { ...managed, x: cx - NODE_W / 2, y: TARGET_TOP };
    } else {
      const real = byEmail.get(cluster.childId);
      if (real) {
        childNode = {
          id: real.email,
          kind: "freebrainer",
          email: real.email,
          name: real.name,
          onboarding: real.onboarding,
          x: cx - NODE_W / 2,
          y: TARGET_TOP,
        };
      }
    }
    if (childNode) nodes.push(childNode);
    edges.push({
      from: cluster.parentId,
      to: cluster.childId,
      kind: cluster.kind,
      x: cx,
      y1: CAREGIVER_TOP + NODE_H,
      y2: TARGET_TOP,
    });
  });

  orphanIds.forEach((id, index) => {
    const orphan = byEmail.get(id);
    if (!orphan) return;
    nodes.push({
      id: orphan.email,
      kind: "caregiver",
      email: orphan.email,
      name: orphan.name,
      onboarding: orphan.onboarding,
      x: ORPHAN_CX - NODE_W / 2,
      y: CAREGIVER_TOP + index * ORPHAN_GAP,
      dim: true,
      caption: { kind: "none" },
    });
  });

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          {t("adminAccounts.title")}
        </CardTitle>
        <CardDescription>
          {t("adminAccounts.subtitle")}
          <span className="mt-1 block">{t("adminAccounts.snapshotNote")}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {admin && <AdminBand account={admin} />}
        <OrgChart nodes={nodes} edges={edges} />
      </CardContent>
    </Card>
  );
}