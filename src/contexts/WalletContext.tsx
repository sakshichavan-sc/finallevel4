import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { connectWallet, WalletState, checkFreighterInstalled } from "@/lib/wallet";

interface WalletContextType {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  freighterInstalled: boolean;
}

const WalletContext = createContext<WalletContextType>({
  wallet: { connected: false, publicKey: null, error: null },
  connect: async () => {},
  disconnect: () => {},
  isLoading: false,
  freighterInstalled: false,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [freighterInstalled, setFreighterInstalled] = useState(false);

  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled);
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    const state = await connectWallet();
    setWallet(state);
    setIsLoading(false);
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ connected: false, publicKey: null, error: null });
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, isLoading, freighterInstalled }}>
      {children}
    </WalletContext.Provider>
  );
};
