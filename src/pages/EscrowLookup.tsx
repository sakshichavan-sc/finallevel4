import { Header } from "@/components/Header";
import { EscrowDetails } from "@/components/EscrowDetails";
import { motion } from "framer-motion";

export default function EscrowLookup() {
  return (
    <div className="min-h-screen bg-background grid-bg">
      <Header />
      <main className="container py-8 max-w-lg space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <EscrowDetails />
        </motion.div>
      </main>
    </div>
  );
}
