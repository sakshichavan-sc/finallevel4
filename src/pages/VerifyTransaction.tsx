import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Loader2, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { getStellarExplorerUrl, server } from "@/lib/stellar";
import { motion } from "framer-motion";
import { rpc } from "@stellar/stellar-sdk";

export default function VerifyTransaction() {
  const [hash, setHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const txResult = await server.getTransaction(hash.trim());
      setResult(txResult);
    } catch (err: any) {
      setError(err?.message || "Transaction not found");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Header />
      <main className="container py-8 max-w-lg space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Search className="h-5 w-5 text-primary" />
                Verify Transaction
              </CardTitle>
              <CardDescription>Look up any Stellar transaction by its hash</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hash" className="text-foreground">Transaction Hash</Label>
                  <Input
                    id="hash"
                    placeholder="Enter transaction hash..."
                    value={hash}
                    onChange={(e) => setHash(e.target.value)}
                    className="font-mono text-sm bg-muted/50 border-border"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="glass border-destructive/30">
              <CardContent className="pt-6 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2">
                  {result.status === "SUCCESS" ? (
                    <CheckCircle className="h-5 w-5 text-accent" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-semibold text-foreground">
                    Status: {result.status}
                  </span>
                </div>

                {result.ledger && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ledger</span>
                    <span className="font-mono text-foreground">{result.ledger}</span>
                  </div>
                )}

                {result.createdAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created At</span>
                    <span className="text-foreground">
                      {new Date(Number(result.createdAt) * 1000).toLocaleString()}
                    </span>
                  </div>
                )}

                <a
                  href={getStellarExplorerUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline pt-2"
                >
                  View on Stellar Expert <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
