import { useWallet } from "@/contexts/WalletContext";
import { shortenAddress } from "@/lib/stellar";
import { Wallet, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const { wallet, connect, disconnect, isLoading, freighterInstalled } = useWallet();

  if (wallet.connected && wallet.publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="glass rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
          <span className="font-mono text-sm text-foreground">
            {shortenAddress(wallet.publicKey)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={disconnect}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={connect}
        disabled={isLoading}
        className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </Button>
      {!freighterInstalled && (
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          Get Freighter <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
