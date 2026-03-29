import { isConnected, requestAccess, getAddress, signTransaction, isAllowed, setAllowed } from "@stellar/freighter-api";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  error: string | null;
}

export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return !!result;
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<WalletState> {
  try {
    const installed = await checkFreighterInstalled();
    if (!installed) {
      return {
        connected: false,
        publicKey: null,
        error: "Freighter wallet not found. Please install it from freighter.app",
      };
    }

    const allowed = await isAllowed();
    if (!allowed) {
      await setAllowed();
    }

    await requestAccess();
    const addressResult = await getAddress();
    const pubKey = typeof addressResult === "string" ? addressResult : addressResult?.address;

    if (!pubKey) {
      return {
        connected: false,
        publicKey: null,
        error: "Could not get public key. Please unlock Freighter and try again.",
      };
    }

    return {
      connected: true,
      publicKey: pubKey,
      error: null,
    };
  } catch (err: any) {
    return {
      connected: false,
      publicKey: null,
      error: err?.message || "Failed to connect wallet",
    };
  }
}

export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase,
  });
  // result may be string or object with signedTxXdr
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "signedTxXdr" in result) {
    return (result as any).signedTxXdr;
  }
  throw new Error("Failed to sign transaction");
}
