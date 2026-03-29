import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import {
  buildTransaction,
  submitTransaction,
  createEscrowParams,
  xlmToStroops,
  approveTokenSpend,
  NETWORK_PASSPHRASE,
  getStellarExplorerUrl,
} from "@/lib/stellar";
import { signTx } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { PlusCircle, Loader2, CheckCircle, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CreateEscrowForm() {
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const [beneficiary, setBeneficiary] = useState("");
  const [arbiter, setArbiter] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const xlmAmount = parseFloat(amount);
    if (isNaN(xlmAmount) || xlmAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!beneficiary || beneficiary.length !== 56) {
      toast.error("Enter a valid beneficiary Stellar address");
      return;
    }

    if (!arbiter || arbiter.length !== 56) {
      toast.error("Enter a valid arbiter Stellar address");
      return;
    }

    setIsSubmitting(true);
    const stroops = xlmToStroops(xlmAmount);

    try {
      // Step 1: Approve token spend
      setStep("approving");
      toast.info("Step 1/2: Approve token spend in Freighter...");
      const approveXdr = await approveTokenSpend(wallet.publicKey, stroops);
      const signedApprove = await signTx(approveXdr, NETWORK_PASSPHRASE);
      await submitTransaction(signedApprove);
      toast.success("Token approval confirmed!");

      // Step 2: Create escrow
      setStep("creating");
      toast.info("Step 2/2: Confirm escrow creation in Freighter...");
      const params = createEscrowParams(
        wallet.publicKey,
        beneficiary,
        arbiter,
        stroops
      );
      const tx = await buildTransaction(wallet.publicKey, "create_escrow", params);
      const signedXdr = await signTx(tx.toXDR(), NETWORK_PASSPHRASE);
      const result = await submitTransaction(signedXdr);

      setTxHash(result.hash);
      toast.success("Escrow created successfully!");

      setBeneficiary("");
      setArbiter("");
      setAmount("");
    } catch (err: any) {
      console.error("Create escrow error:", err);
      toast.error(err?.message || "Failed to create escrow");
    } finally {
      setIsSubmitting(false);
      setStep("idle");
    }
  };

  if (txHash) {
    return (
      <Card className="glass glow-green">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Escrow Created!</h3>
          <p className="text-sm text-muted-foreground font-mono break-all">{txHash}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href={getStellarExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                View on Explorer <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </a>
            <Button size="sm" onClick={() => navigate("/")} className="bg-primary text-primary-foreground">
              Go to Dashboard
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTxHash(null)}>
              Create Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <PlusCircle className="h-5 w-5 text-primary" />
          Create New Escrow
        </CardTitle>
        <CardDescription>Lock XLM in a secure escrow contract on Stellar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="beneficiary" className="text-foreground">Beneficiary Address</Label>
            <Input
              id="beneficiary"
              placeholder="G..."
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="font-mono text-sm bg-muted/50 border-border"
              required
            />
            <p className="text-xs text-muted-foreground">The Stellar address that will receive funds upon release</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arbiter" className="text-foreground">Arbiter Address</Label>
            <Input
              id="arbiter"
              placeholder="G..."
              value={arbiter}
              onChange={(e) => setArbiter(e.target.value)}
              className="font-mono text-sm bg-muted/50 border-border"
              required
            />
            <p className="text-xs text-muted-foreground">A trusted third party who can release or refund</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">Amount (XLM)</Label>
            <Input
              id="amount"
              type="number"
              step="0.0000001"
              min="0.0000001"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-muted/50 border-border"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !wallet.connected}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {step === "approving" ? "Approving Token..." : "Creating Escrow..."}
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Escrow
              </>
            )}
          </Button>

          {!wallet.connected && (
            <p className="text-center text-sm text-warning">Connect your wallet to create an escrow</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
