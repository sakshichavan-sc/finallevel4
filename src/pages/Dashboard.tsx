import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import {
  getEscrowCount,
  getEscrow,
  buildTransaction,
  submitTransaction,
  releaseParams,
  refundParams,
  NETWORK_PASSPHRASE,
  Escrow,
} from "@/lib/stellar";
import { signTx } from "@/lib/wallet";
import { EscrowCard } from "@/components/EscrowCard";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Loader2, Inbox, Shield, ArrowRight, Zap, Lock, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const POLL_INTERVAL = 15000;

export default function Dashboard() {
  const { wallet } = useWallet();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [txHashes, setTxHashes] = useState<Record<number, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEscrows = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const count = await getEscrowCount();
      const fetched: Escrow[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          fetched.push(await getEscrow(i));
        } catch { /* skip */ }
      }
      setEscrows(fetched.reverse());
    } catch (err) {
      console.error("Fetch escrows error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrows();
    intervalRef.current = setInterval(() => fetchEscrows(true), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchEscrows]);

  const handleRelease = async (escrowId: number) => {
    if (!wallet.publicKey) return;
    setIsActing(true);
    try {
      const params = releaseParams(wallet.publicKey, escrowId);
      const tx = await buildTransaction(wallet.publicKey, "release", params);
      const signed = await signTx(tx.toXDR(), NETWORK_PASSPHRASE);
      const result = await submitTransaction(signed);
      setTxHashes((p) => ({ ...p, [escrowId]: result.hash }));
      toast.success(`Escrow #${escrowId} released!`);
      fetchEscrows();
    } catch (err: any) {
      toast.error(err?.message || "Release failed");
    } finally {
      setIsActing(false);
    }
  };

  const handleRefund = async (escrowId: number) => {
    if (!wallet.publicKey) return;
    setIsActing(true);
    try {
      const params = refundParams(wallet.publicKey, escrowId);
      const tx = await buildTransaction(wallet.publicKey, "refund", params);
      const signed = await signTx(tx.toXDR(), NETWORK_PASSPHRASE);
      const result = await submitTransaction(signed);
      setTxHashes((p) => ({ ...p, [escrowId]: result.hash }));
      toast.success(`Escrow #${escrowId} refunded!`);
      fetchEscrows();
    } catch (err: any) {
      toast.error(err?.message || "Refund failed");
    } finally {
      setIsActing(false);
    }
  };

  const stats = {
    total: escrows.length,
    active: escrows.filter((e) => e.status === "Active").length,
    released: escrows.filter((e) => e.status === "Released").length,
    refunded: escrows.filter((e) => e.status === "Refunded").length,
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Header />
      <main className="container py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 py-4 sm:py-8"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient-cyan">
            Decentralized Escrow
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Secure, trustless escrow powered by Stellar Soroban smart contracts.
            Lock, release, and refund XLM with full on-chain transparency.
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2 px-4">
            {[
              { icon: Lock, text: "Funds Locked On-chain" },
              { icon: Eye, text: "Fully Transparent" },
              { icon: Zap, text: "Sub-second Finality" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs sm:text-sm">
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                {text}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-primary" },
            { label: "Released", value: stats.released, color: "text-accent" },
            { label: "Refunded", value: stats.refunded, color: "text-warning" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl p-3 sm:p-4 text-center">
              <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Escrows</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEscrows()}
              disabled={isLoading}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <RefreshCcw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link to="/create">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Create <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Escrow list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : escrows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 sm:py-20 space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No escrows yet</h3>
            <p className="text-sm text-muted-foreground">Create your first escrow to get started</p>
            <Link to="/create">
              <Button className="bg-primary text-primary-foreground mt-2">
                <Shield className="h-4 w-4 mr-2" />
                Create Escrow
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {escrows.map((escrow) => (
              <EscrowCard
                key={escrow.id}
                escrow={escrow}
                currentUser={wallet.publicKey}
                onRelease={handleRelease}
                onRefund={handleRefund}
                isActing={isActing}
                txHash={txHashes[escrow.id]}
              />
            ))}
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          StellarVault — Powered by Stellar Soroban • Testnet
        </div>
      </footer>
    </div>
  );
}
