import { Escrow, stroopsToXLM, shortenAddress, getStellarExplorerUrl } from "@/lib/stellar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowUpRight, RefreshCcw, CheckCircle, Clock, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface EscrowCardProps {
  escrow: Escrow;
  currentUser: string | null;
  onRelease: (id: number) => void;
  onRefund: (id: number) => void;
  isActing: boolean;
  txHash?: string;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    Active: { className: "bg-primary/10 text-primary border-primary/20", icon: Clock },
    Released: { className: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
    Refunded: { className: "bg-warning/10 text-warning border-warning/20", icon: XCircle },
  }[status] ?? { className: "bg-muted text-muted-foreground", icon: Clock };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

export function EscrowCard({ escrow, currentUser, onRelease, onRefund, isActing, txHash }: EscrowCardProps) {
  const isActive = escrow.status === "Active";

  const canRelease =
    isActive &&
    currentUser &&
    (currentUser === escrow.arbiter || currentUser === escrow.depositor);

  const canRefund =
    isActive &&
    currentUser &&
    (currentUser === escrow.arbiter || currentUser === escrow.beneficiary);

  const userRole = currentUser
    ? currentUser === escrow.depositor
      ? "Depositor"
      : currentUser === escrow.beneficiary
        ? "Beneficiary"
        : currentUser === escrow.arbiter
          ? "Arbiter"
          : null
    : null;

  return (
    <Card className="glass hover:border-primary/30 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted-foreground">#{escrow.id}</span>
            <StatusBadge status={escrow.status} />
          </div>
          <span className="text-xl font-semibold text-foreground">
            {stroopsToXLM(escrow.amount)} <span className="text-sm text-muted-foreground">XLM</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: "Depositor", value: escrow.depositor },
          { label: "Beneficiary", value: escrow.beneficiary },
          { label: "Arbiter", value: escrow.arbiter },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <button
              onClick={() => copyToClipboard(value)}
              className="flex items-center gap-1 font-mono text-foreground hover:text-primary transition-colors"
            >
              {shortenAddress(value, 8)}
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        ))}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span className="text-foreground">
            {new Date(escrow.created_at * 1000).toLocaleDateString()}
          </span>
        </div>

        {txHash && (
          <a
            href={getStellarExplorerUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View on Explorer <ArrowUpRight className="h-3 w-3" />
          </a>
        )}

        {isActive && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            {userRole && (
              <p className="text-xs text-primary font-medium">Your role: {userRole}</p>
            )}
            {!currentUser && (
              <p className="text-xs text-muted-foreground">Connect wallet to release or refund</p>
            )}
            {currentUser && !userRole && (
              <p className="text-xs text-muted-foreground">You are not a party to this escrow</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => onRelease(escrow.id)}
                disabled={!canRelease || isActing}
                size="sm"
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 glow-green"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Release
              </Button>
              <Button
                onClick={() => onRefund(escrow.id)}
                disabled={!canRefund || isActing}
                size="sm"
                variant="outline"
                className="flex-1 border-warning/30 text-warning hover:bg-warning/10"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Refund
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
