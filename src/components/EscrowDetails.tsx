import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import {
  getEscrow,
  buildTransaction,
  submitTransaction,
  releaseParams,
  refundParams,
  stroopsToXLM,
  shortenAddress,
  getStellarExplorerUrl,
  NETWORK_PASSPHRASE,
  Escrow,
} from "@/lib/stellar";
import { signTx } from "@/lib/wallet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Loader2, CheckCircle, XCircle, Clock, RefreshCcw,
  ArrowUpRight, Copy, User, Users, Scale,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: typeof Clock }> = {
    Active: { className: "bg-primary/10 text-primary border-primary/20", icon: Clock },
    Released: { className: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
    Refunded: { className: "bg-warning/10 text-warning border-warning/20", icon: XCircle },
  };
  const c = config[status] ?? config.Active;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={c.className}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

export function EscrowDetails() {
  const { wallet } = useWallet();
  const [escrowId, setEscrowId] = useState("");
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [actionType, setActionType] = useState<"release" | "refund" | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(escrowId);
    if (isNaN(id) || id <= 0) {
      toast.error("Enter a valid escrow ID");
      return;
    }
    setIsLoading(true);
    setError(null);
    setEscrow(null);
    setTxHash(null);
    try {
      const result = await getEscrow(id);
      setEscrow(result);
    } catch (err: any) {
      setError(err?.message || "Escrow not found");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (type: "release" | "refund") => {
    if (!wallet.publicKey || !escrow) return;
    setIsActing(true);
    setActionType(type);
    try {
      const params = type === "release"
        ? releaseParams(wallet.publicKey, escrow.id)
        : refundParams(wallet.publicKey, escrow.id);
      const method = type === "release" ? "release" : "refund";
      toast.info(`Sign the ${method} transaction in Freighter...`);
      const tx = await buildTransaction(wallet.publicKey, method, params);
      const signed = await signTx(tx.toXDR(), NETWORK_PASSPHRASE);
      const result = await submitTransaction(signed);
      setTxHash(result.hash);
      toast.success(`Escrow #${escrow.id} ${type === "release" ? "released" : "refunded"}!`);
      // Refresh escrow state
      const updated = await getEscrow(escrow.id);
      setEscrow(updated);
    } catch (err: any) {
      const msg = err?.message || `${type} failed`;
      if (msg.includes("InvalidAction") || msg.includes("Unauthorized")) {
        toast.error("You are not authorized to perform this action");
      } else if (msg.includes("not active") || msg.includes("NotActive")) {
        toast.error("This escrow is no longer active");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsActing(false);
      setActionType(null);
    }
  };

  const canRelease =
    escrow?.status === "Active" &&
    wallet.publicKey &&
    (wallet.publicKey === escrow.depositor || wallet.publicKey === escrow.arbiter);

  const canRefund =
    escrow?.status === "Active" &&
    wallet.publicKey &&
    (wallet.publicKey === escrow.beneficiary || wallet.publicKey === escrow.arbiter);

  const addressRows = escrow
    ? [
        { label: "Depositor", value: escrow.depositor, icon: User },
        { label: "Beneficiary", value: escrow.beneficiary, icon: Users },
        { label: "Arbiter", value: escrow.arbiter, icon: Scale },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Search className="h-5 w-5 text-primary" />
            Lookup Escrow
          </CardTitle>
          <CardDescription>Enter an escrow ID to view details, release, or refund</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFetch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="escrowId" className="sr-only">Escrow ID</Label>
              <Input
                id="escrowId"
                type="number"
                min="1"
                placeholder="Escrow ID (e.g. 1)"
                value={escrowId}
                onChange={(e) => setEscrowId(e.target.value)}
                className="bg-muted/50 border-border"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="glass border-destructive/30">
          <CardContent className="pt-6 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {escrow && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">#{escrow.id}</span>
                <StatusBadge status={escrow.status} />
              </div>
              <span className="text-2xl font-semibold text-foreground">
                {stroopsToXLM(escrow.amount)} <span className="text-sm text-muted-foreground">XLM</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {addressRows.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
                <button
                  onClick={() => copyToClipboard(value)}
                  className="flex items-center gap-1 font-mono text-foreground hover:text-primary transition-colors"
                >
                  <span className="hidden sm:inline">{shortenAddress(value, 8)}</span>
                  <span className="sm:hidden">{shortenAddress(value, 4)}</span>
                  <Copy className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity" />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {new Date(escrow.created_at * 1000).toLocaleString()}
              </span>
            </div>

            {txHash && (
              <div className="pt-2 border-t border-border/50">
                <a
                  href={getStellarExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View Transaction on Stellar Expert <ArrowUpRight className="h-3 w-3" />
                </a>
                <p className="font-mono text-xs text-muted-foreground mt-1 break-all">{txHash}</p>
              </div>
            )}

            {escrow.status === "Active" && !wallet.publicKey && (
              <p className="text-center text-sm text-warning pt-2">Connect your wallet to release or refund</p>
            )}

            {(canRelease || canRefund) && (
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/50">
                {canRelease && (
                  <Button
                    onClick={() => handleAction("release")}
                    disabled={isActing}
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 glow-green"
                  >
                    {isActing && actionType === "release" ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Release Funds
                  </Button>
                )}
                {canRefund && (
                  <Button
                    onClick={() => handleAction("refund")}
                    disabled={isActing}
                    variant="outline"
                    className="flex-1 border-warning/30 text-warning hover:bg-warning/10"
                  >
                    {isActing && actionType === "refund" ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4 mr-1" />
                    )}
                    Refund
                  </Button>
                )}
              </div>
            )}

            {escrow.status !== "Active" && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                This escrow has been {escrow.status.toLowerCase()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
